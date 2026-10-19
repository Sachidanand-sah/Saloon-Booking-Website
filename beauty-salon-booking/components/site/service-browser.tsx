'use client';

import { useMemo, useState } from 'react';
import { Search, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/misc';
import { cn } from '@/lib/format';
import type { Category, Service } from '@/lib/types';
import { ServiceCard } from './service-card';

export function ServiceBrowser({
  services,
  categories,
  initialCategory,
}: {
  services: Service[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(
    categories.some(c => c.slug === initialCategory) ? initialCategory! : 'all',
  );
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter(
      s =>
        (category === 'all' || s.category?.slug === category) &&
        (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
    );
  }, [services, category, query]);

  const select = (slug: string) => {
    setCategory(slug);
    const url = slug === 'all' ? '/services' : `/services?category=${slug}`;
    window.history.replaceState(null, '', url);
  };

  const tabs = [{ slug: 'all', name: 'All' }, ...categories];

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Categories">
          {tabs.map(t => (
            <button
              key={t.slug}
              role="tab"
              aria-selected={category === t.slug}
              onClick={() => select(t.slug)}
              className={cn(
                'shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition',
                category === t.slug
                  ? 'border-plum-900 bg-plum-900 text-white'
                  : 'border-line bg-white text-plum-800 hover:border-plum-300',
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:w-80">
          <span className="sr-only">Search services</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search treatments…"
            className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-4 text-sm focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100"
          />
        </label>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'treatment' : 'treatments'}
      </p>

      {visible.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(s => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState icon={SearchX} title="No matching treatments">
            Try another search or browse all categories.
          </EmptyState>
        </div>
      )}
    </>
  );
}
