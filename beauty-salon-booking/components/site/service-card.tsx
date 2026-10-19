import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { ServiceArt, Stars } from '@/components/ui/misc';
import { formatDuration, formatPrice } from '@/lib/format';
import type { Service } from '@/lib/types';

export function ServiceCard({ service, bookHref }: { service: Service; bookHref?: string }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/services/${service.slug}`} className="relative block" tabIndex={-1} aria-hidden>
        <ServiceArt
          category={service.category?.slug}
          imageUrl={service.imageUrl}
          name={service.name}
          className="h-52 w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {service.category ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-plum-800 backdrop-blur">
            {service.category.name}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl leading-snug">
            <Link href={`/services/${service.slug}`} className="hover:text-rose-600">
              {service.name}
            </Link>
          </h3>
          <p className="shrink-0 font-display text-xl font-semibold text-plum-900">
            {formatPrice(service.price, service.currency)}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{service.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {formatDuration(service.durationMins)}
            </span>
            {service.rating?.average ? (
              <span className="inline-flex items-center gap-1">
                <Stars value={service.rating.average} />
                <span className="text-xs">({service.rating.count})</span>
              </span>
            ) : null}
          </div>
          <Link
            href={bookHref ?? `/book?service=${service.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:gap-2 hover:text-rose-500"
            style={{ transition: 'gap 0.2s' }}
            aria-label={`Book ${service.name}`}
          >
            Book <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
