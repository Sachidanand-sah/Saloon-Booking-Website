import Link from 'next/link';
import { Quote } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';
import { AddToBagButton } from './add-to-bag';

export function ProductCard({ product: p, compact }: { product: Product; compact?: boolean }) {
  const pro = p.recommendedBy[0];
  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/products/${p.slug}`} className="relative block overflow-hidden bg-sand/40" tabIndex={-1} aria-hidden>
        <Photo
          src={p.imageUrl}
          alt={p.name}
          kind="product"
          className={`${compact ? 'h-44' : 'h-56'} w-full transition-transform duration-500 group-hover:scale-[1.03]`}
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-plum-800 backdrop-blur">
          {p.category}
        </span>
        {!p.inStock ? (
          <Badge tone="neutral" className="absolute right-4 top-4 bg-white/90">
            Out of stock
          </Badge>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{p.brand}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug">
            <Link href={`/products/${p.slug}`} className="hover:text-rose-600">
              {p.name}
            </Link>
          </h3>
          <p className="shrink-0 font-display text-lg font-semibold text-plum-900">{formatPrice(p.price, p.currency)}</p>
        </div>
        {pro ? (
          <figure className="mt-4 flex-1 rounded-2xl bg-ivory p-4">
            <blockquote className="relative pl-5 text-sm leading-relaxed text-ink/80">
              <Quote className="absolute left-0 top-0.5 size-3.5 text-rose-300" aria-hidden />
              <span className={compact ? 'line-clamp-2' : 'line-clamp-3'}>{pro.note}</span>
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Avatar name={pro.name} src={pro.avatarUrl} className="size-6 text-[9px]" />
              <span>
                Recommended by <span className="font-semibold text-plum-900">{pro.name}</span>
                {p.recommendedBy.length > 1 ? ` +${p.recommendedBy.length - 1}` : ''}
              </span>
            </figcaption>
          </figure>
        ) : (
          <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">{p.description}</p>
        )}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <Link href={`/products/${p.slug}`} className="text-sm font-medium text-plum-800 hover:text-rose-600">
            Details
          </Link>
          <AddToBagButton product={p} />
        </div>
      </div>
    </article>
  );
}
