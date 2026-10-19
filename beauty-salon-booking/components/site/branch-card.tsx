import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Navigation, Phone, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/format';
import { directionsUrl, formatAddress, telHref, todayHours } from '@/lib/maps';
import type { LocationListItem } from '@/lib/types';

export function BranchPhoto({ src, name, className }: { src: string | null; name: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn('hero-glow flex items-end p-5', className)} aria-hidden>
        <MapPin className="size-8 text-rose-300" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- admin-managed URLs from any host
  return <img src={src} alt={`Inside ${name}`} loading="lazy" className={cn('object-cover', className)} />;
}

export function BranchCard({ branch, timeZone }: { branch: LocationListItem; timeZone: string }) {
  const today = todayHours(branch.openingHours, timeZone);
  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/locations/${branch.slug}`} className="relative block overflow-hidden" tabIndex={-1} aria-hidden>
        <BranchPhoto
          src={branch.imageUrl}
          name={branch.name}
          className="h-52 w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span
          className={cn(
            'absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur',
            today.open ? 'bg-white/90 text-success' : 'bg-white/90 text-muted',
          )}
        >
          <span className={cn('size-1.5 rounded-full', today.open ? 'bg-success' : 'bg-muted')} />
          {today.open ? 'Open today' : 'Closed today'}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl">
          <Link href={`/locations/${branch.slug}`} className="hover:text-rose-600">
            {branch.name}
          </Link>
        </h3>
        <ul className="mt-4 flex-1 space-y-2.5 text-sm text-muted">
          <li className="flex gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" /> {formatAddress(branch)}
          </li>
          <li className="flex gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-rose-500" /> {today.label}
          </li>
          {branch.phone ? (
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-rose-500" />
              <a href={telHref(branch.phone)} className="hover:text-plum-900">
                {branch.phone}
              </a>
            </li>
          ) : null}
          <li className="flex gap-2.5">
            <Users className="mt-0.5 size-4 shrink-0 text-rose-500" /> {branch.staffCount} specialist
            {branch.staffCount === 1 ? '' : 's'}
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <ButtonLink href={`/book?location=${branch.slug}`} size="sm">
            Book here
          </ButtonLink>
          <a
            href={directionsUrl(branch)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-plum-200 bg-white px-3.5 text-sm font-medium text-plum-900 hover:bg-plum-50"
          >
            <Navigation className="size-4" /> Directions
          </a>
          <Link
            href={`/locations/${branch.slug}`}
            className="ml-auto inline-flex items-center gap-1 self-center text-sm font-semibold text-rose-600 hover:text-rose-500"
          >
            Details <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MapEmbed({ src, title, className }: { src: string; title: string; className?: string }) {
  return (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={cn('w-full border-0', className)}
      allowFullScreen
    />
  );
}
