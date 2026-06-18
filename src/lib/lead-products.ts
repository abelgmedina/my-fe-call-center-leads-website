export type LeadProduct = {
  id: string;
  category: 'English Telesales' | 'English Local' | 'Spanish Telesales' | 'Spanish Local';
  language: 'English' | 'Spanish';
  channel: 'Telesales' | 'Local';
  quantity: number;
  pricePerLeadCents: number;
  amountCents: number;
  description: string;
};

function product(params: Omit<LeadProduct, 'id' | 'amountCents'>): LeadProduct {
  const id = `${params.language}_${params.channel}_${params.quantity}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

  return {
    ...params,
    id,
    amountCents: params.quantity * params.pricePerLeadCents,
  };
}

export const leadProducts = [
  product({
    category: 'English Telesales',
    language: 'English',
    channel: 'Telesales',
    quantity: 30,
    pricePerLeadCents: 2000,
    description: 'Exclusive English final expense telesales leads for approved remote agents.',
  }),
  product({
    category: 'English Telesales',
    language: 'English',
    channel: 'Telesales',
    quantity: 50,
    pricePerLeadCents: 2000,
    description: 'Exclusive English final expense telesales leads for approved remote agents.',
  }),
  product({
    category: 'English Telesales',
    language: 'English',
    channel: 'Telesales',
    quantity: 100,
    pricePerLeadCents: 2000,
    description: 'Exclusive English final expense telesales leads for approved remote agents.',
  }),
  product({
    category: 'English Local',
    language: 'English',
    channel: 'Local',
    quantity: 20,
    pricePerLeadCents: 2500,
    description: 'Exclusive English final expense local leads for field agents and local market buyers.',
  }),
  product({
    category: 'English Local',
    language: 'English',
    channel: 'Local',
    quantity: 30,
    pricePerLeadCents: 2500,
    description: 'Exclusive English final expense local leads for field agents and local market buyers.',
  }),
  product({
    category: 'English Local',
    language: 'English',
    channel: 'Local',
    quantity: 50,
    pricePerLeadCents: 2500,
    description: 'Exclusive English final expense local leads for field agents and local market buyers.',
  }),
  product({
    category: 'Spanish Telesales',
    language: 'Spanish',
    channel: 'Telesales',
    quantity: 30,
    pricePerLeadCents: 1800,
    description: 'Exclusive Spanish final expense telesales leads for bilingual agents and teams.',
  }),
  product({
    category: 'Spanish Telesales',
    language: 'Spanish',
    channel: 'Telesales',
    quantity: 50,
    pricePerLeadCents: 1800,
    description: 'Exclusive Spanish final expense telesales leads for bilingual agents and teams.',
  }),
  product({
    category: 'Spanish Telesales',
    language: 'Spanish',
    channel: 'Telesales',
    quantity: 100,
    pricePerLeadCents: 1800,
    description: 'Exclusive Spanish final expense telesales leads for bilingual agents and teams.',
  }),
  product({
    category: 'Spanish Local',
    language: 'Spanish',
    channel: 'Local',
    quantity: 20,
    pricePerLeadCents: 2500,
    description: 'Exclusive Spanish final expense local leads for bilingual field agents and local market buyers.',
  }),
  product({
    category: 'Spanish Local',
    language: 'Spanish',
    channel: 'Local',
    quantity: 30,
    pricePerLeadCents: 2500,
    description: 'Exclusive Spanish final expense local leads for bilingual field agents and local market buyers.',
  }),
  product({
    category: 'Spanish Local',
    language: 'Spanish',
    channel: 'Local',
    quantity: 50,
    pricePerLeadCents: 2500,
    description: 'Exclusive Spanish final expense local leads for bilingual field agents and local market buyers.',
  }),
] as const satisfies readonly LeadProduct[];

export const leadProductMap = Object.fromEntries(leadProducts.map((item) => [item.id, item])) as Record<string, LeadProduct>;

export const leadProductCategories = [
  'English Telesales',
  'English Local',
  'Spanish Telesales',
  'Spanish Local',
] as const;

export function formatLeadPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}
