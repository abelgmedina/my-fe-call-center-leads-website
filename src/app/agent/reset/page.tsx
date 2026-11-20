import type { Metadata } from 'next';
import OwnerResetForm from './OwnerResetForm';

export const metadata: Metadata = {
  title: 'Secure owner recovery | Upline Agent AI',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function OwnerResetPage() {
  return <OwnerResetForm />;
}
