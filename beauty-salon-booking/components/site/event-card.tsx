import Link from 'next/link';
import { ArrowRight, Check, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Photo } from '@/components/ui/photo';
import { formatPrice } from '@/lib/format';
import type { EventPackage } from '@/lib/types';

export const guestRange = (p: Pick<EventPackage, 'minGuests' | 'maxGuests'>) =>
  p.maxGuests === p.minGuests
    ? `${p.minGuests} guest${p.minGuests === 1 ? '' : 's'}`
    : p.maxGuests
      ? `${p.minGuests}–${p.maxGuests} guests`
      : `${p.minGuests}+ guests`;

export function EventCard({ pkg }: { pkg: EventPackage }) {
  const href = `/events/request?package=${pkg.slug}`;
  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={href} className="relative block overflow-hidden" tabIndex={-1} aria-hidden>
        <Photo
          src={pkg.imageUrl}
          alt={pkg.name}
          kind="event"
          className="h-60 w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-900/70 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-plum-800 backdrop-blur">
          <Users className="size-3.5" /> {guestRange(pkg)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-2xl">{pkg.name}</h3>
          <p className="text-sm text-muted">
            from <span className="font-display text-xl font-semibold text-plum-900">{formatPrice(pkg.fromPrice, pkg.currency)}</span>
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{pkg.description}</p>
        <ul className="mt-5 flex-1 space-y-2 border-t border-line pt-5 text-sm text-ink/80">
          {pkg.includes.map(i => (
            <li key={i} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-rose-500" /> {i}
            </li>
          ))}
        </ul>
        <ButtonLink href={href} className="mt-6 w-full" variant="outline">
          Request a quote <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
    </article>
  );
}
