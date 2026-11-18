import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The former policy/OTP sequence is intentionally retired from the sign-in flow.
// Terms and policies remain published, but signed-in buyers now land in the CRM.
export default function BuyerOnboardingPage() {
  redirect('/dashboard');
}
