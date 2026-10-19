import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EventRequestForm } from '@/components/events/event-request-form';
import { getPublic } from '@/lib/server/api';
import type { EventPackage, LocationListItem, SalonInfo } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Request an event quote',
  description: 'Tell us about your wedding, festival or photoshoot and get a tailored quote from Lalima Beauty.',
};

export default async function EventRequestPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const [{ package: pkg }, packages, branches, salon] = await Promise.all([
    searchParams,
    getPublic<EventPackage[]>('/event-packages'),
    getPublic<LocationListItem[]>('/locations', 300),
    getPublic<SalonInfo>('/salon', 300),
  ]);

  return (
    <div className="bg-gradient-to-b from-sand/60 to-ivory pb-24 pt-28 sm:pt-32">
      <div className="container-page max-w-3xl">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum-900">
          <ArrowLeft className="size-4" /> Bridal &amp; events
        </Link>
        <div className="mb-8 mt-6 animate-fade-up">
          <p className="eyebrow">Request a quote</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Tell us about your day</h1>
          <p className="mt-3 text-muted">
            Share a few details and our events team will send you a personal quote, usually within one working day.
          </p>
        </div>
        {packages?.length ? (
          <EventRequestForm
            packages={packages}
            branches={branches ?? []}
            timeZone={salon?.timezone ?? 'Asia/Kathmandu'}
            initialPackage={packages.find(p => p.slug === pkg || p.id === pkg)?.id}
          />
        ) : (
          <p className="card p-8 text-center text-muted">
            Requests are temporarily unavailable. Please refresh in a moment or call us.
          </p>
        )}
      </div>
    </div>
  );
}
