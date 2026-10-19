import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { DAY_NAMES, minutesToLabel } from '@/lib/format';
import { site } from '@/lib/site';
import type { Location, OpeningHours } from '@/lib/types';
import { Logo } from './header';

export function HoursList({ hours, className }: { hours: OpeningHours[]; className?: string }) {
  return (
    <ul className={className}>
      {hours.map(h => (
        <li key={h.dayOfWeek} className="flex justify-between gap-6 py-1">
          <span>{DAY_NAMES[h.dayOfWeek - 1]}</span>
          <span className="tabular-nums">
            {h.open === null || h.close === null ? 'Closed' : `${minutesToLabel(h.open)} – ${minutesToLabel(h.close)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ hours, branches }: { hours: OpeningHours[] | null; branches: Location[] | null }) {
  return (
    <footer className="bg-plum-900 text-white/75">
      <div className="container-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed">{site.description}</p>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-white">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/services">All services</Link></li>
            <li><Link className="hover:text-white" href="/book">Book an appointment</Link></li>
            <li><Link className="hover:text-white" href="/packages">Monthly packages</Link></li>
            <li><Link className="hover:text-white" href="/events">Bridal &amp; events</Link></li>
            <li><Link className="hover:text-white" href="/products">Shop</Link></li>
            <li><Link className="hover:text-white" href="/rewards">Lalima Rewards</Link></li>
            <li><Link className="hover:text-white" href="/#team">Meet the team</Link></li>
            <li><Link className="hover:text-white" href="/#reviews">Reviews</Link></li>
            <li><Link className="hover:text-white" href="/locations">Our locations</Link></li>
            <li><Link className="hover:text-white" href="/account">My account</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {(branches ?? []).map(b => (
              <li key={b.id} className="flex gap-3">
                <MapPin className="size-4 shrink-0 text-rose-300" />
                <Link href={`/locations/${b.slug}`} className="hover:text-white">
                  <span className="block font-medium text-white/90">{b.name}</span>
                  {b.addressLine1}, {b.city}
                </Link>
              </li>
            ))}
            <li className="flex gap-3">
              <Phone className="size-4 shrink-0 text-rose-300" />
              <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} className="hover:text-white">{site.phone}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="size-4 shrink-0 text-rose-300" />
              <a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-white">Opening hours</h3>
          {hours ? <HoursList hours={hours} className="mt-4 text-sm" /> : <p className="mt-4 text-sm">Call us for today&apos;s hours.</p>}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Online booking available 24/7</p>
        </div>
      </div>
    </footer>
  );
}
