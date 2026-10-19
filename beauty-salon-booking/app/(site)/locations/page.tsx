import type { Metadata } from 'next';
import { MapPinOff } from 'lucide-react';
import { PageHeader } from '@/components/site/page-header';
import { BranchExplorer } from '@/components/site/branch-explorer';
import { EmptyState } from '@/components/ui/misc';
import { getPublic } from '@/lib/server/api';
import type { LocationListItem, SalonInfo } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Our locations',
  description: 'Find your nearest Lalima Beauty branch in the Kathmandu valley — addresses, maps, opening hours and directions.',
};

export default async function LocationsPage() {
  const [branches, salon] = await Promise.all([
    getPublic<LocationListItem[]>('/locations'),
    getPublic<SalonInfo>('/salon', 300),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Visit us"
        title={branches && branches.length > 1 ? `${branches.length} studios, one signature experience` : 'Find our studio'}
        intro="Every branch offers the same calm space, expert team and online booking. Choose the one closest to you."
      />
      <section className="container-page py-12 sm:py-16">
        {branches?.length ? (
          <BranchExplorer branches={branches} timeZone={salon?.timezone ?? 'UTC'} />
        ) : (
          <EmptyState icon={MapPinOff} title="Locations coming soon">
            We couldn&apos;t load our branches right now. Please refresh in a moment.
          </EmptyState>
        )}
      </section>
    </>
  );
}
