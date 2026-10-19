import type { Metadata } from 'next';
import { AccountView, type AccountTab } from '@/components/account/account-view';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

const TABS: AccountTab[] = ['upcoming', 'past', 'events', 'orders'];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <AccountView initialTab={TABS.find(t => t === tab)} />;
}
