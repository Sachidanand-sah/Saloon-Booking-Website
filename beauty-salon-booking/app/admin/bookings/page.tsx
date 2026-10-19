'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Mail, Phone, Search } from 'lucide-react';
import {
  ErrorState,
  PageHeader,
  STATUSES,
  adminKeys,
  useAdminStaff,
  useSalon,
  useUpdateBookingStatus,
  type BookingsPage,
} from '@/components/admin/common';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Avatar, EmptyState, Skeleton, StatusBadge } from '@/components/ui/misc';
import { api } from '@/lib/client';
import { addDays, cn, formatDate, formatPrice, formatTime, todayIn } from '@/lib/format';
import type { Booking, BookingStatus } from '@/lib/types';

const PAGE_SIZE = 25;

export default function AdminBookingsPage() {
  const salon = useSalon();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader eyebrow="Schedule" title="Bookings" intro="Search, filter and update every appointment." />
      {salon.isError ? (
        <ErrorState error={salon.error} onRetry={() => salon.refetch()} />
      ) : salon.data ? (
        <BookingsView timeZone={salon.data.timezone} />
      ) : (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      )}
    </div>
  );
}

function BookingsView({ timeZone }: { timeZone: string }) {
  const [from, setFrom] = useState(() => todayIn(timeZone));
  const [to, setTo] = useState(() => addDays(todayIn(timeZone), 7));
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [staffId, setStaffId] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const staff = useAdminStaff();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (status) params.set('status', status);
  if (staffId) params.set('staffId', staffId);
  if (q) params.set('q', q);
  const qs = params.toString();

  const bookings = useQuery({
    queryKey: [...adminKeys.bookings, qs],
    queryFn: () => api.get<BookingsPage>(`/admin/bookings?${qs}`),
    placeholderData: keepPreviousData,
  });

  const total = bookings.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <div className="card grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1fr_1fr_1.5fr]">
        <Input label="From" type="date" value={from} max={to || undefined} onChange={e => reset(setFrom)(e.target.value)} />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={e => reset(setTo)(e.target.value)} />
        <Select label="Status" value={status} onChange={e => reset(setStatus)(e.target.value as BookingStatus | '')}>
          <option value="">All statuses</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select label="Stylist" value={staffId} onChange={e => reset(setStaffId)(e.target.value)}>
          <option value="">All stylists</option>
          {staff.data?.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Input
            label="Search customers"
            type="search"
            placeholder="Name, email or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="[&_input]:pl-10"
          />
          <Search className="pointer-events-none absolute bottom-4 left-3.5 size-4 text-muted" aria-hidden />
        </div>
      </div>

      {bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : bookings.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : bookings.data.items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings found">
          Try widening the date range or clearing filters.
        </EmptyState>
      ) : (
        <div className={cn('space-y-4 transition-opacity', bookings.isPlaceholderData && 'opacity-60')}>
          <p className="text-sm text-muted" aria-live="polite">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} booking{total === 1 ? '' : 's'}
          </p>

          {/* Table (md+) */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-line bg-ivory/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Service</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Stylist</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Price</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.data.items.map(b => (
                  <tr key={b.id} className="align-top transition hover:bg-plum-50/40">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-medium text-plum-900">{formatDate(b.startAt, timeZone)}</p>
                      <p className="text-muted">
                        {formatTime(b.startAt, timeZone)} – {formatTime(b.endAt, timeZone)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <CustomerInfo booking={b} />
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-plum-900">{b.service.name}</p>
                      <p className="text-muted">{b.service.durationMins} min</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={b.staff.name} src={b.staff.avatarUrl} className="size-7 text-[0.65rem]" />
                        {b.staff.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-plum-900">
                      {formatPrice(b.price, b.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <StatusBadge status={b.status} />
                        <StatusSelect booking={b} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <ul className="space-y-3 md:hidden">
            {bookings.data.items.map(b => (
              <li key={b.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-plum-900">{formatDate(b.startAt, timeZone)}</p>
                    <p className="text-sm text-muted">
                      {formatTime(b.startAt, timeZone)} – {formatTime(b.endAt, timeZone)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <CustomerInfo booking={b} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-plum-900">{b.service.name}</p>
                    <p className="truncate text-muted">with {b.staff.name}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-plum-900">{formatPrice(b.price, b.currency)}</p>
                </div>
                <div className="mt-3">
                  <StatusSelect booking={b} />
                </div>
              </li>
            ))}
          </ul>

          {pages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="size-4" aria-hidden />
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </nav>
          ) : null}
        </div>
      )}
    </>
  );
}

function CustomerInfo({ booking: b }: { booking: Booking }) {
  if (!b.customer) return <p className="text-muted">Guest</p>;
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium text-plum-900">{b.customer.name}</p>
      <a href={`mailto:${b.customer.email}`} className="flex items-center gap-1.5 truncate text-muted hover:text-rose-600">
        <Mail className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{b.customer.email}</span>
      </a>
      {b.customer.phone ? (
        <a href={`tel:${b.customer.phone}`} className="flex items-center gap-1.5 text-muted hover:text-rose-600">
          <Phone className="size-3.5 shrink-0" aria-hidden />
          {b.customer.phone}
        </a>
      ) : null}
    </div>
  );
}

function StatusSelect({ booking: b }: { booking: Booking }) {
  const update = useUpdateBookingStatus();
  const label = `Change status for ${b.customer?.name ?? 'booking'} on ${b.startAt.slice(0, 10)}`;
  return (
    <select
      aria-label={label}
      value={update.isPending ? update.variables.status : b.status}
      disabled={update.isPending}
      onChange={e => {
        const status = e.target.value as BookingStatus;
        if (status === b.status) return;
        if ((status === 'CANCELLED' || status === 'NO_SHOW') && !window.confirm(`Mark this booking as ${status === 'CANCELLED' ? 'cancelled' : 'a no-show'}?`)) {
          return;
        }
        update.mutate({ id: b.id, status });
      }}
      className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink transition hover:border-plum-200 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:opacity-60 md:w-36"
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
