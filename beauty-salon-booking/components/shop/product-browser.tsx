'use client';

import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/ui/misc';
import { cn } from '@/lib/format';
import type { Product } from '@/lib/types';
import { ProductCard } from './product-card';

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ProductBrowser({ products, initialCategory }: { products: Product[]; initialCategory?: string }) {
  const categories = [...new Set(products.map(p => p.category))];
  const [category, setCategory] = useState(
    categories.find(c => slugify(c) === initialCategory) ?? 'all',
  );
  const visible = category === 'all' ? products : products.filter(p => p.category === category);

  const select = (c: string) => {
    setCategory(c);
    window.history.replaceState(null, '', c === 'all' ? '/products' : `/products?category=${slugify(c)}`);
  };

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Product categories">
        {['all', ...categories].map(c => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            onClick={() => select(c)}
            className={cn(
              'shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition',
              category === c ? 'border-plum-900 bg-plum-900 text-white' : 'border-line bg-white text-plum-800 hover:border-plum-300',
            )}
          >
            {c === 'all' ? 'All products' : c}
            <span className={cn('ml-2 text-xs', category === c ? 'text-white/60' : 'text-muted')}>
              {c === 'all' ? products.length : products.filter(p => p.category === c).length}
            </span>
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState icon={PackageSearch} title="Nothing here yet">
            We&apos;re restocking this shelf. Have a look at the other categories.
          </EmptyState>
        </div>
      )}
    </>
  );
}
