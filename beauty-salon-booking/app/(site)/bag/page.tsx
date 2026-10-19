import type { Metadata } from 'next';
import { PageHeader } from '@/components/site/page-header';
import { BagView } from '@/components/shop/bag-view';
import { getPublic } from '@/lib/server/api';
import type { LocationListItem } from '@/lib/types';

export const metadata: Metadata = { title: 'Your bag', robots: { index: false } };

export default async function BagPage() {
  const branches = await getPublic<LocationListItem[]>('/locations', 300);
  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Your bag"
        intro="Reserve your products online and we'll have them ready at your chosen branch."
      />
      <section className="container-page py-12 sm:py-16">
        <BagView branches={branches ?? []} />
      </section>
    </>
  );
}
