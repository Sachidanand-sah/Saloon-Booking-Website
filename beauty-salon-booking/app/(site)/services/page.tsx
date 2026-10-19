import type { Metadata } from 'next';
import { PageHeader } from '@/components/site/page-header';
import { ServiceBrowser } from '@/components/site/service-browser';
import { getPublic } from '@/lib/server/api';
import type { Category, Service } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Services & prices',
  description: 'Hair, skin, nail and spa treatments with transparent prices and durations. Book online instantly.',
};

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, services, categories] = await Promise.all([
    searchParams,
    getPublic<Service[]>('/services'),
    getPublic<Category[]>('/categories'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Our menu"
        title="Services & prices"
        intro="Every treatment includes a personal consultation. Prices are fixed — no surprises at checkout."
      />
      <section className="container-page py-12 sm:py-16">
        {services ? (
          <ServiceBrowser services={services} categories={categories ?? []} initialCategory={category} />
        ) : (
          <p className="card p-8 text-center text-muted">We couldn&apos;t load the service menu right now. Please refresh in a moment.</p>
        )}
      </section>
    </>
  );
}
