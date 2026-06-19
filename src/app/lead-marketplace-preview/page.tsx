import BuyerMarketplace from '../buyer/marketplace/BuyerMarketplace';

export const dynamic = 'force-dynamic';

export default function LeadMarketplacePreviewPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">
      <BuyerMarketplace preview />
    </div>
  );
}
