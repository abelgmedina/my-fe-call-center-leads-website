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
