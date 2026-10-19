import type { Metadata } from 'next';
import { BadgeCheck, Store, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/site/page-header';
import { ProductBrowser } from '@/components/shop/product-browser';
import { getPublic } from '@/lib/server/api';
import type { Product } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Shop: recommended by our pros',
  description:
    'Hair, skin, nail and body care chosen by Lalima Beauty professionals. Reserve online, pay and collect at any branch.',
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, products] = await Promise.all([searchParams, getPublic<Product[]>('/products')]);

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Recommended by our pros"
        intro="The products our specialists reach for, and send clients home with. Reserve online, then pay and collect at the branch of your choice."
      >
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-plum-800">
          <li className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-rose-500" /> Hand-picked by professionals
          </li>
          <li className="flex items-center gap-2">
            <Store className="size-4 text-rose-500" /> Collect at any branch
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="size-4 text-rose-500" /> Pay when you pick up
          </li>
        </ul>
      </PageHeader>
      <section className="container-page py-12 sm:py-16">
        {products ? (
          <ProductBrowser products={products} initialCategory={category} />
        ) : (
          <p className="card p-8 text-center text-muted">We couldn&apos;t load the shop right now. Please refresh in a moment.</p>
        )}
      </section>
    </>
  );
}
