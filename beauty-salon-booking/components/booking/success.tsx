'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Check, Download, MapPin } from 'lucide-react';
import { ButtonLink, buttonClass } from '@/components/ui/button';
import { Avatar, Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/client';
import { formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';
import { site } from '@/lib/site';
import type { Booking, SalonInfo } from '@/lib/types';

const icsStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const address = `${site.address.line1}, ${site.address.line2}, ${site.address.city}`;

function googleCalendarUrl(b: Booking) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${b.service.name} at ${site.name}`,
    dates: `${icsStamp(b.startAt)}/${icsStamp(b.endAt)}`,
    details: `With ${b.staff.name}. Manage your booking at ${site.url}/account`,
    location: address,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function downloadIcs(b: Booking) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${site.name}//Booking//EN`,
    'BEGIN:VEVENT',
    `UID:${b.id}@lovelyglow`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(b.startAt)}`,
    `DTEND:${icsStamp(b.endAt)}`,
    `SUMMARY:${b.service.name} at ${site.name}`,
    `DESCRIPTION:With ${b.staff.name}`,
    `LOCATION:${address.replace(/,/g, '\\,')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'appointment.ics' });
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingSuccess({ id }: { id?: string }) {
  const booking = useQuery({ queryKey: ['bookings', id], queryFn: () => api.get<Booking>(`/bookings/${id}`), enabled: !!id });
  const salon = useQuery({ queryKey: ['salon'], queryFn: () => api.get<SalonInfo>('/salon') });

  if (!id || booking.isError) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <h1 className="text-3xl">We couldn&apos;t find that booking</h1>
        <p className="mt-3 text-muted">You can see all of your appointments in your account.</p>
        <ButtonLink href="/account" className="mt-6">Go to my bookings</ButtonLink>
      </div>
    );
  }
  if (booking.isPending || salon.isPending) return <Skeleton className="mx-auto h-[460px] max-w-xl" />;

  const b = booking.data;
  const tz = salon.data?.timezone;

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h1 className="mt-6 text-4xl">You&apos;re booked!</h1>
        <p className="mt-3 text-muted">We can&apos;t wait to see you. Your appointment details are below.</p>
      </div>

      <div className="card mt-10 overflow-hidden">
        <div className="hero-glow p-6 text-white">
          <p className="text-sm uppercase tracking-widest text-white/60">{formatDate(b.startAt, tz, { weekday: 'long', month: 'long' })}</p>
          <p className="mt-1 font-display text-4xl">{formatTime(b.startAt, tz)}</p>
        </div>
        <dl className="divide-y divide-line px-6 text-sm">
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Treatment</dt>
            <dd className="text-right font-medium text-plum-900">
              {b.service.name} · {formatDuration(b.service.durationMins)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted">Specialist</dt>
            <dd className="flex items-center gap-2 font-medium text-plum-900">
              <Avatar name={b.staff.name} src={b.staff.avatarUrl} className="size-7 text-[10px]" /> {b.staff.name}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Where</dt>
            <dd className="flex items-start gap-1.5 text-right font-medium text-plum-900">
              <MapPin className="mt-0.5 size-4 text-rose-500" /> {address}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Pay at salon</dt>
            <dd className="font-display text-xl font-semibold text-plum-900">{formatPrice(b.price, b.currency)}</dd>
          </div>
        </dl>
        <div className="grid gap-3 border-t border-line bg-ivory/60 p-6 sm:grid-cols-2">
          <a href={googleCalendarUrl(b)} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline' })}>
            <CalendarPlus className="size-4" /> Google Calendar
          </a>
          <button onClick={() => downloadIcs(b)} className={buttonClass({ variant: 'outline' })}>
            <Download className="size-4" /> Apple / Outlook
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/account">View my bookings</ButtonLink>
        <ButtonLink href="/services" variant="ghost">Explore more treatments</ButtonLink>
      </div>
    </div>
  );
}
