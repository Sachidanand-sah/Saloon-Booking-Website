'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/format';
import { directionsUrl, formatAddress, mapEmbedUrl, telHref, todayHours } from '@/lib/maps';
import type { LocationListItem } from '@/lib/types';
import { BranchPhoto, MapEmbed } from './branch-card';

/** Branch list beside a live map of whichever branch is selected. */
export function BranchExplorer({ branches, timeZone }: { branches: LocationListItem[]; timeZone: string }) {
  const [selectedId, setSelectedId] = useState(branches[0]?.id);
  const selected = branches.find(b => b.id === selectedId) ?? branches[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <ul className="space-y-4" aria-label="Branches">
        {branches.map(b => {
          const today = todayHours(b.openingHours, timeZone);
          const active = b.id === selected.id;
          return (
            <li key={b.id}>
              <div
                className={cn(
                  'card flex gap-4 overflow-hidden p-3 transition sm:p-4',
                  active ? 'border-rose-300 ring-4 ring-rose-100' : 'hover:border-plum-200',
                )}
              >
                <button
                  onClick={() => setSelectedId(b.id)}
                  className="shrink-0"
                  aria-label={`Show ${b.name} on the map`}
                  aria-pressed={active}
                >
                  <BranchPhoto src={b.imageUrl} name={b.name} className="size-24 rounded-xl sm:size-28" />
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setSelectedId(b.id)} className="text-left" aria-pressed={active}>
                    <h3 className="text-xl leading-snug hover:text-rose-600">{b.name}</h3>
                  </button>
                  <p className="mt-1.5 flex gap-1.5 text-sm text-muted">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                    <span>{formatAddress(b)}</span>
                  </p>
                  <p className={cn('mt-1 flex items-center gap-1.5 text-sm', today.open ? 'text-success' : 'text-muted')}>
                    <Clock className="size-4 shrink-0" /> {today.label}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                    <Link href={`/book?location=${b.slug}`} className="text-rose-600 hover:text-rose-500">
                      Book here
                    </Link>
                    <Link href={`/locations/${b.slug}`} className="text-plum-800 hover:text-plum-600">
                      Branch details
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="card overflow-hidden">
            <MapEmbed key={selected.id} src={mapEmbedUrl(selected)} title={`Map of ${selected.name}`} className="h-80 sm:h-[420px]" />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold text-plum-900">{selected.name}</p>
                <p className="text-sm text-muted">{formatAddress(selected)}</p>
                {selected.phone ? (
                  <a href={telHref(selected.phone)} className="mt-1 inline-flex items-center gap-1.5 text-sm text-plum-800 hover:text-rose-600">
                    <Phone className="size-4" /> {selected.phone}
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={directionsUrl(selected)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-plum-200 bg-white px-5 text-sm font-medium text-plum-900 hover:bg-plum-50"
                >
                  <Navigation className="size-4" /> Directions
                </a>
                <ButtonLink href={`/book?location=${selected.slug}`}>Book</ButtonLink>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
