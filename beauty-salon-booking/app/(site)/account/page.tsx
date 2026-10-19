import type { Metadata } from 'next';
import { AccountView } from '@/components/account/account-view';

export const metadata: Metadata = { title: 'My bookings', robots: { index: false } };

export default function AccountPage() {
  return <AccountView />;
}
