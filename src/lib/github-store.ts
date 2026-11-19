import crypto from 'node:crypto';

type StoreRequest = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  npn: string;
  residence_state: string;
  license_state: string;
  fmo?: string;
  imo?: string;
  agency_name: string;
  sales_model: string;
  notes: string;
  status: 'pending' | 'approved' | 'denied';
  decision_notes?: string;
  decided_at?: number;
  decided_by?: string;
  buyer_username?: string;
  buyer_code?: string;
  created_at: number;
  updated_at: number;
};

type StoreBuyer = {
  username: string;
  buyer_code: string;
  role: 'buyer_admin' | 'buyer_agent';
  password_hash: string;
  disabled: boolean;
  phone?: string;
  policy_reviews?: {
    terms?: number;
    privacy?: number;
    lead_replacement?: number;
  };
  policies_agreed_at?: number;
  agreement_ip?: string;
  email_code_hash?: string;
  email_code_expires_at?: number;
  email_verified_at?: number;
  phone_code_hash?: string;
  phone_code_expires_at?: number;
  phone_verified_at?: number;
  created_at: number;
  updated_at: number;
  last_login_at?: number;
};

// These are deliberately separate from buyers and internal agents. A portal
// account is allowed to use only the restricted self-service workspace; it is
// never a Twilio identity, lead buyer, or ops principal.
export type PortalAccount = {
  id: string;
  email: string;
  full_name?: string;
  password_hash: string;
  status: 'active' | 'disabled';
  phone?: string;
  npn?: string;
  residence_state?: string;
  license_state?: string;
  agency_name?: string;
  sales_model?: string;
  created_at: number;
  updated_at: number;
  last_login_at?: number;
};

// The owner credential is intentionally separate from buyer and portal
// accounts. It only resolves to the already-configured internal `abel` agent
// after the login code verifies it, so a public portal account can never be
// promoted into telephony or operations access.
export type OwnerAccount = {
  email: string;
  password_hash: string;
  status: 'active' | 'disabled';
  // A password reset increments this value. Owner sessions carry the value
  // they were issued with, so resetting a password invalidates old owner
  // sessions without affecting buyer or restricted portal accounts.
  session_version?: number;
  // SHA-256 digest of the one-time recovery token that last succeeded. The
  // raw recovery token never enters durable storage.
  last_reset_token_hash?: string;
  created_at: number;
  updated_at: number;
  last_login_at?: number;
};

type StoreOrder = {
  id: number;
  buyer_code: string;
  username: string;
  product_id: string;
  product_name: string;
  quantity: number;
  amount_cents: number;
  status: string;
  stripe_session_id?: string | null;
  stripe_checkout_url?: string | null;
  notes?: string;
  created_at: number;
  updated_at: number;
};

type Store = {
  nextRequestId: number;
  nextOrderId: number;
  requests: StoreRequest[];
  buyers: StoreBuyer[];
  portal_accounts: PortalAccount[];
  owner_account: OwnerAccount | null;
  orders: StoreOrder[];
};

type GitHubContent = {
  content?: string;
  sha?: string;
};

function env(name: string) {
  return process.env[name]?.trim() || '';
}

export function isGitHubStoreConfigured() {
  return !!(env('GITHUB_DATA_TOKEN') && env('GITHUB_DATA_REPO'));
}

function storePath() {
  return env('GITHUB_DATA_PATH') || 'data/upline-agent-store.json';
}

function emptyStore(): Store {
  return {
    nextRequestId: 1,
    nextOrderId: 1,
    requests: [],
    buyers: [],
    portal_accounts: [],
    owner_account: null,
    orders: [],
  };
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const repo = env('GITHUB_DATA_REPO');
  const token = env('GITHUB_DATA_TOKEN');
  if (!repo || !token) throw new Error('GitHub data store is not configured');

  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });

  if (res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `GitHub API failed: ${res.status}`);
  return data;
}

function decodeContent(content: string) {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
}

async function readStoreWithSha(): Promise<{ store: Store; sha?: string }> {
  const data = await githubRequest(`/contents/${encodeURIComponent(storePath()).replace(/%2F/g, '/')}`) as GitHubContent | null;
  if (!data?.content) return { store: emptyStore() };

  const parsed = JSON.parse(decodeContent(data.content)) as Partial<Store>;
  return {
    sha: data.sha,
    store: {
      ...emptyStore(),
      ...parsed,
      requests: Array.isArray(parsed.requests) ? parsed.requests as StoreRequest[] : [],
      buyers: Array.isArray(parsed.buyers) ? parsed.buyers as StoreBuyer[] : [],
      portal_accounts: Array.isArray(parsed.portal_accounts) ? parsed.portal_accounts as PortalAccount[] : [],
      owner_account: parsed.owner_account && typeof parsed.owner_account === 'object'
        ? parsed.owner_account as OwnerAccount
        : null,
      orders: Array.isArray(parsed.orders) ? parsed.orders as StoreOrder[] : [],
    },
  };
}

async function writeStore(store: Store, sha: string | undefined, message: string) {
  await githubRequest(`/contents/${encodeURIComponent(storePath()).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(`${JSON.stringify(store, null, 2)}\n`, 'utf8').toString('base64'),
      sha,
    }),
  });
}

async function mutateStore<T>(message: string, mutator: (store: Store) => T) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { store, sha } = await readStoreWithSha();
      const result = mutator(store);
      await writeStore(store, sha, message);
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function listAccessRequestsFromStore() {
  const { store } = await readStoreWithSha();
  return [...store.requests].sort((a, b) => {
    const statusA = a.status === 'pending' ? 0 : a.status === 'approved' ? 1 : 2;
    const statusB = b.status === 'pending' ? 0 : b.status === 'approved' ? 1 : 2;
    return statusA - statusB || b.created_at - a.created_at;
  });
}

export async function appendAccessRequestToStore(input: Omit<StoreRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) {
  const now = Date.now();
  return mutateStore('Add Upline Agent access request', (store) => {
    const id = store.nextRequestId || 1;
    store.nextRequestId = id + 1;
    const request: StoreRequest = {
      ...input,
      id,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    store.requests.push(request);
    return request;
  });
}

export async function decideAccessRequestInStore(params: {
  id: number;
  decision: 'approved' | 'denied';
  decisionNotes: string;
  decidedBy: string;
  passwordHash?: string;
  buyerUsername?: string;
  buyerCode?: string;
}) {
  return mutateStore('Update Upline Agent access decision', (store) => {
    const request = store.requests.find((row) => row.id === params.id);
    if (!request) throw new Error('request not found');

    const now = Date.now();
    request.status = params.decision;
    request.decision_notes = params.decisionNotes;
    request.decided_at = now;
    request.decided_by = params.decidedBy;
    request.updated_at = now;

    if (params.decision === 'approved') {
      if (!params.buyerUsername || !params.buyerCode || !params.passwordHash) throw new Error('buyer login details required');
      const existing = store.buyers.find((buyer) => buyer.username.toLowerCase() === params.buyerUsername!.toLowerCase());
      if (existing) throw new Error('a login already exists for this email');

      request.buyer_username = params.buyerUsername;
      request.buyer_code = params.buyerCode;
      store.buyers.push({
        username: params.buyerUsername,
        buyer_code: params.buyerCode,
        role: 'buyer_agent',
        password_hash: params.passwordHash,
        disabled: false,
        phone: request.phone,
        created_at: now,
        updated_at: now,
      });
    }

    return request;
  });
}

export async function findBuyerInStore(username: string) {
  const { store } = await readStoreWithSha();
  return store.buyers.find((buyer) => buyer.username.toLowerCase() === username.toLowerCase() && !buyer.disabled) || null;
}

export async function markBuyerLoginInStore(username: string) {
  return mutateStore('Update buyer last login', (store) => {
    const buyer = store.buyers.find((row) => row.username.toLowerCase() === username.toLowerCase());
    if (buyer) {
      buyer.last_login_at = Date.now();
      buyer.updated_at = Date.now();
    }
    return buyer || null;
  });
}

export async function updateBuyerInStore(username: string, updater: (buyer: StoreBuyer) => void) {
  return mutateStore('Update buyer onboarding', (store) => {
    const buyer = store.buyers.find((row) => row.username.toLowerCase() === username.toLowerCase() && !row.disabled);
    if (!buyer) throw new Error('buyer not found');
    updater(buyer);
    buyer.updated_at = Date.now();
    return buyer;
  });
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function findOwnerAccountInStore(email: string) {
  const wanted = normalizedEmail(email);
  const { store } = await readStoreWithSha();
  const owner = store.owner_account;
  if (!owner || owner.status !== 'active' || normalizedEmail(owner.email) !== wanted) return null;
  return owner;
}

/**
 * Creates the one durable owner credential. This is deliberately create-only:
 * the short-lived setup link cannot be replayed to replace a password later.
 */
export async function createOwnerAccountInStore(input: {
  email: string;
  password_hash: string;
  last_reset_token_hash?: string;
}) {
  const now = Date.now();
  const email = normalizedEmail(input.email);
  return mutateStore('Create UplineAgent owner credential', (store) => {
    if (store.owner_account) throw new Error('OWNER_ACCOUNT_EXISTS');
    if (store.buyers.some((buyer) => normalizedEmail(buyer.username) === email) || store.portal_accounts.some((account) => normalizedEmail(account.email) === email)) {
      throw new Error('OWNER_EMAIL_IN_USE');
    }
    const owner: OwnerAccount = {
      email,
      password_hash: input.password_hash,
      status: 'active',
      session_version: 1,
      ...(input.last_reset_token_hash ? { last_reset_token_hash: input.last_reset_token_hash } : {}),
      created_at: now,
      updated_at: now,
    };
    store.owner_account = owner;
    return owner;
  });
}

export async function markOwnerAccountLoginInStore(email: string) {
  const wanted = normalizedEmail(email);
  return mutateStore('Update UplineAgent owner last login', (store) => {
    const owner = store.owner_account;
    if (!owner || normalizedEmail(owner.email) !== wanted || owner.status !== 'active') return null;
    owner.last_login_at = Date.now();
    owner.updated_at = Date.now();
    return owner;
  });
}

export async function getOwnerSessionVersionInStore(email: string) {
  const owner = await findOwnerAccountInStore(email);
  if (!owner) return null;
  const version = Number(owner.session_version || 1);
  return Number.isSafeInteger(version) && version > 0 ? version : 1;
}

/**
 * Replaces the durable owner password after a separately validated, one-time
 * recovery token is presented. Keeping the token digest lets us reject a
 * replay even while the short expiry window is still open.
 */
export async function resetOwnerPasswordInStore(input: {
  email: string;
  password_hash: string;
  reset_token_hash: string;
}) {
  const email = normalizedEmail(input.email);
  return mutateStore('Reset UplineAgent owner credential', (store) => {
    const owner = store.owner_account;
    if (!owner || owner.status !== 'active' || normalizedEmail(owner.email) !== email) {
      throw new Error('OWNER_ACCOUNT_NOT_FOUND');
    }
    if (!input.reset_token_hash || owner.last_reset_token_hash === input.reset_token_hash) {
      throw new Error('OWNER_RESET_ALREADY_USED');
    }

    const currentVersion = Number(owner.session_version || 1);
    owner.password_hash = input.password_hash;
    owner.session_version = Number.isSafeInteger(currentVersion) && currentVersion > 0 ? currentVersion + 1 : 2;
    owner.last_reset_token_hash = input.reset_token_hash;
    owner.updated_at = Date.now();
    return owner;
  });
}

export async function createPortalAccountInStore(input: {
  email: string;
  full_name?: string;
  password_hash: string;
}) {
  const now = Date.now();
  const email = normalizedEmail(input.email);

  return mutateStore('Create restricted Upline Agent portal account', (store) => {
    const alreadyBuyer = store.buyers.some((buyer) => normalizedEmail(buyer.username) === email);
    const alreadyPortal = store.portal_accounts.some((account) => normalizedEmail(account.email) === email);
    if (alreadyBuyer || alreadyPortal) throw new Error('ACCOUNT_EXISTS');

    const account: PortalAccount = {
      id: `portal_${crypto.randomUUID()}`,
      email,
      full_name: String(input.full_name || '').trim(),
      password_hash: input.password_hash,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    store.portal_accounts.push(account);
    return account;
  });
}

export async function findPortalAccountInStore(email: string) {
  const wanted = normalizedEmail(email);
  const { store } = await readStoreWithSha();
  return store.portal_accounts.find((account) => normalizedEmail(account.email) === wanted) || null;
}

export async function getPortalAccountByIdInStore(id: string) {
  const { store } = await readStoreWithSha();
  return store.portal_accounts.find((account) => account.id === id) || null;
}

export async function markPortalAccountLoginInStore(id: string) {
  return mutateStore('Update restricted portal last login', (store) => {
    const account = store.portal_accounts.find((row) => row.id === id);
    if (!account) return null;
    account.last_login_at = Date.now();
    account.updated_at = Date.now();
    return account;
  });
}

export async function updatePortalAccountProfileInStore(
  id: string,
  profile: Pick<PortalAccount, 'full_name' | 'phone' | 'npn' | 'residence_state' | 'license_state' | 'agency_name' | 'sales_model'>
) {
  return mutateStore('Update restricted portal profile', (store) => {
    const account = store.portal_accounts.find((row) => row.id === id);
    if (!account || account.status !== 'active') throw new Error('PORTAL_ACCOUNT_NOT_FOUND');
    account.full_name = profile.full_name;
    account.phone = profile.phone;
    account.npn = profile.npn;
    account.residence_state = profile.residence_state;
    account.license_state = profile.license_state;
    account.agency_name = profile.agency_name;
    account.sales_model = profile.sales_model;
    account.updated_at = Date.now();
    return account;
  });
}

export async function getBuyerOnboardingFromStore(username: string) {
  const buyer = await findBuyerInStore(username);
  if (!buyer) return null;
  return {
    username: buyer.username,
    buyer_code: buyer.buyer_code,
    phone: buyer.phone || '',
    policy_reviews: buyer.policy_reviews || {},
    policies_agreed_at: buyer.policies_agreed_at || null,
    agreement_ip: buyer.agreement_ip || null,
    email_verified_at: buyer.email_verified_at || null,
    phone_verified_at: buyer.phone_verified_at || null,
    complete: !!(buyer.policies_agreed_at && buyer.email_verified_at && buyer.phone_verified_at),
  };
}

export async function appendLeadOrderToStore(input: Omit<StoreOrder, 'id' | 'created_at' | 'updated_at'>) {
  const now = Date.now();
  return mutateStore('Add Upline Agent lead order', (store) => {
    const id = store.nextOrderId || 1;
    store.nextOrderId = id + 1;
    const order: StoreOrder = {
      ...input,
      id,
      created_at: now,
      updated_at: now,
    };
    store.orders.push(order);
    return order;
  });
}
