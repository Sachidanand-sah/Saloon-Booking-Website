'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, MapPin, Store } from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { fieldErrors, Input, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { guestRange } from '@/components/site/event-card';
import { api, errorMessage, RequestError } from '@/lib/client';
import { addDays, cn, formatDate, formatPrice, todayIn } from '@/lib/format';
import type { EventPackage, EventRequest, LocationListItem } from '@/lib/types';

type Where = 'branch' | 'venue';

export function EventRequestForm({
  packages,
  branches,
  timeZone,
  initialPackage,
}: {
  packages: EventPackage[];
  branches: LocationListItem[];
  timeZone: string;
  initialPackage?: string;
}) {
  const { user, loading } = useSession();
  const toast = useToast();
  const qc = useQueryClient();

  const [packageId, setPackageId] = useState(initialPackage ?? packages[0].id);
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [guests, setGuests] = useState<string | null>(null);
  const [where, setWhere] = useState<Where>('branch');
  const [locationId, setLocationId] = useState(branches.length === 1 ? branches[0].id : '');
  const [venue, setVenue] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<EventRequest | null>(null);

  const pkg = packages.find(p => p.id === packageId) ?? packages[0];
  const minDate = addDays(todayIn(timeZone), 1);
  // Untouched fields fall back to sensible defaults (package minimum, phone on the account).
  const guestValue = guests ?? String(pkg.minGuests);
  const phoneValue = phone ?? user?.phone ?? '';
  const nextUrl = `/events/request?package=${pkg.slug}`;

  const validate = () => {
    const e: Record<string, string> = {};
    const n = Number(guestValue);
    if (!eventDate) e.eventDate = 'Please choose a date';
    else if (eventDate < minDate) e.eventDate = 'Please choose a date from tomorrow onwards';
    if (!Number.isInteger(n) || n < pkg.minGuests || (pkg.maxGuests !== null && n > pkg.maxGuests)) {
      e.guestCount = `This package is for ${guestRange(pkg)}`;
    }
    if (where === 'branch' && !locationId) e.locationId = 'Please choose a branch';
    if (where === 'venue' && venue.trim().length < 3) e.venue = 'Please tell us where the event is';
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phoneValue.trim())) e.contactPhone = 'Please enter a valid phone number';
    return e;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = validate();
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string; request: EventRequest }>('/event-requests', {
        packageId: pkg.id,
        eventDate,
        startTime: startTime || undefined,
        guestCount: Number(guestValue),
        locationId: where === 'branch' ? locationId : undefined,
        venue: where === 'venue' ? venue.trim() : undefined,
        contactPhone: phoneValue.trim(),
        notes: notes.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['event-requests'] });
      toast(res.message);
      setDone(res.request);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof RequestError && err.details?.length) setErrors(fieldErrors(err.details));
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card animate-fade-up p-8 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h2 className="mt-6 text-3xl">Request received</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Thank you! We&apos;ll prepare a quote for your {done.package.name} on{' '}
          {formatDate(`${done.eventDate.slice(0, 10)}T12:00:00Z`, 'UTC', { weekday: 'long', month: 'long' })}. You&apos;ll find it
          in your account, ready to accept.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/account?tab=events">View my requests</ButtonLink>
          <ButtonLink href="/events" variant="ghost">
            Back to events
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton className="h-[560px]" />;

  if (!user) {
    return (
      <div className="card p-6 sm:p-8">
        <PackageSummary pkg={pkg} />
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-6 text-center">
          <p className="font-display text-xl text-plum-900">Log in to request a quote</p>
          <p className="mt-1 text-sm text-muted">So we can send your quote to your account and keep everything in one place.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={`/login?next=${encodeURIComponent(nextUrl)}`}>Log in</ButtonLink>
            <ButtonLink href={`/signup?next=${encodeURIComponent(nextUrl)}`} variant="outline">
              Create account
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card space-y-6 p-5 sm:p-8">
      <Select
        label="Package"
        value={pkg.id}
        onChange={e => {
          setPackageId(e.target.value);
          setGuests(null);
          setErrors({});
        }}
      >
        {packages.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} · from {formatPrice(p.fromPrice, p.currency)}
          </option>
        ))}
      </Select>
      <PackageSummary pkg={pkg} />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input
          label="Date"
          type="date"
          min={minDate}
          value={eventDate}
          onChange={e => setEventDate(e.target.value)}
          error={errors.eventDate}
          required
        />
        <Input
          label="Start time (optional)"
          type="time"
          step={900}
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          error={errors.startTime}
          hint="When you need to be ready"
        />
        <Input
          label="Guests"
          type="number"
          inputMode="numeric"
          min={pkg.minGuests}
          max={pkg.maxGuests ?? 500}
          value={guestValue}
          onChange={e => setGuests(e.target.value)}
          error={errors.guestCount}
          hint={guestRange(pkg)}
          required
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Where?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [
              { key: 'branch', icon: Store, title: 'At a Lalima branch', text: 'Get ready in our studio' },
              { key: 'venue', icon: MapPin, title: 'At my venue', text: 'Home, hotel or party venue' },
            ] as const
          ).map(o => (
            <label
              key={o.key}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition',
                where === o.key ? 'border-plum-900 bg-plum-50 ring-2 ring-plum-100' : 'border-line bg-white hover:border-rose-300',
              )}
            >
              <input
                type="radio"
                name="where"
                value={o.key}
                checked={where === o.key}
                onChange={() => setWhere(o.key)}
                className="sr-only"
              />
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  where === o.key ? 'bg-plum-900 text-white' : 'bg-rose-50 text-rose-500',
                )}
              >
                <o.icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium text-plum-900">{o.title}</span>
                <span className="text-sm text-muted">{o.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {where === 'branch' ? (
        <Select label="Branch" value={locationId} onChange={e => setLocationId(e.target.value)} error={errors.locationId}>
          <option value="">Choose a branch…</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          label="Venue address"
          placeholder="e.g. Hotel Yak & Yeti, Durbar Marg"
          maxLength={300}
          value={venue}
          onChange={e => setVenue(e.target.value)}
          error={errors.venue}
        />
      )}

      <Input
        label="Contact phone"
        type="tel"
        autoComplete="tel"
        placeholder="98XXXXXXXX"
        value={phoneValue}
        onChange={e => setPhone(e.target.value)}
        error={errors.contactPhone}
        hint="Our events team may call to talk through the details."
      />
      <Textarea
        label="Anything else? (optional)"
        placeholder="Your theme, outfits, inspiration, timings for each guest…"
        maxLength={1000}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        error={errors.notes}
      />

      {formError ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</p> : null}
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Send request
      </Button>
      <p className="text-center text-xs text-muted">No commitment. You&apos;ll only confirm once you accept our quote.</p>
    </form>
  );
}

function PackageSummary({ pkg }: { pkg: EventPackage }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-ivory p-3 sm:p-4">
      <Photo src={pkg.imageUrl} alt={pkg.name} kind="event" className="size-16 shrink-0 rounded-xl sm:size-20" />
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-plum-900">{pkg.name}</p>
        <p className="text-sm text-muted">
          From {formatPrice(pkg.fromPrice, pkg.currency)} · {guestRange(pkg)}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{pkg.includes.join(' · ')}</p>
      </div>
    </div>
  );
}
