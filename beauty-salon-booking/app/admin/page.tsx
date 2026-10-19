'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  Crown,
  MapPin,
  PartyPopper,
  Phone,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  UserX,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  ErrorState,
  PageHeader,
  adminKeys,
  useSalon,
  useUpdateBookingStatus,
  type AdminStats,
  type BookingsPage,
} from '@/components/admin/common';
import { useAdminInbox } from '@/components/admin/extras';
import { useSession } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Avatar, Badge, EmptyState, Skeleton, StatusBadge } from '@/components/ui/misc';
import { api } from '@/lib/client';
import { cn, formatDate, formatPrice, formatTime, hourIn, todayIn } from '@/lib/format';
import type { Booking } from '@/lib/types';

/** Time-aware greeting; waits for the salon time zone so server and client render the same text. */
function greeting(timeZone?: string) {
  if (!timeZone) return 'Welcome back';
  const h = hourIn(new Date().toISOString(), timeZone);
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function AdminDashboardPage() {
  const { user } = useSession();
  const salon = useSalon();
  const tz = salon.data?.timezone;
  const firstName = user?.name.split(' ')[0];

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow={tz ? formatDate(new Date().toISOString(), tz, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Dashboard'}
        title={`${greeting(tz)}${firstName ? `, ${firstName}` : ''}`}
        intro="Here’s how the salon is doing today."
        action={
          <ButtonLink href="/admin/bookings" variant="outline" size="sm">
            <CalendarDays className="size-4" aria-hidden />
            All bookings
          </ButtonLink>
        }
      />
      <Stats />
      <Inbox />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <TopServices />
        {salon.isError ? (
          <ErrorState error={salon.error} onRetry={() => salon.refetch()} />
        ) : tz ? (
          <TodayAppointments timeZone={tz} />
        ) : (
          <section className="card p-6">
            <Skeleton className="h-7 w-48" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------- KPI cards ----------

function useStats() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: () => api.get<AdminStats>('/admin/stats') });
}

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 font-display text-3xl font-semibold text-plum-900">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

function Stats() {
  const { data, isPending, isError, error, refetch } = useStats();
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Stats are unavailable" />;
  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  const money = (n: number) => formatPrice(n, data.currency);
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Kpi
        icon={CalendarCheck}
        label="Today’s bookings"
        value={String(data.today.bookings)}
        sub={`${data.today.completed} completed · ${data.today.cancelled} cancelled`}
      />
      <Kpi icon={Wallet} label="Today’s revenue" value={money(data.today.revenue)} sub="Excludes cancellations & no-shows" />
      <Kpi
        icon={TrendingUp}
        label="This month revenue"
        value={money(data.thisMonth.revenue)}
        sub={`${data.thisMonth.bookings} bookings this month`}
      />
      <Kpi icon={CalendarDays} label="Next 7 days" value={String(data.upcomingWeek)} sub="Upcoming active bookings" />
      <Kpi
        icon={UserPlus}
        label="Customers"
        value={String(data.customers.total)}
        sub={`+${data.customers.newThisMonth} this month`}
      />
    </div>
  );
}

// ---------- Inbox (to-dos from packages, events and the shop) ----------

function InboxCard({
  href,
  icon: Icon,
  count,
  label,
  idle,
  urgent,
}: {
  href: string;
  icon: LucideIcon;
  count: number;
  label: string;
  idle: string;
  urgent?: boolean;
}) {
  const hot = urgent && count > 0;
  return (
    <Link
      href={href}
      className={cn(
        'card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift',
        hot && 'border-rose-300 bg-rose-50/60',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          hot ? 'bg-rose-500 text-white' : 'bg-plum-50 text-plum-500',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        {count > 0 ? (
          <>
            <span className="block font-display text-2xl font-semibold leading-none text-plum-900">{count}</span>
            <span className="mt-1 block text-sm text-muted">{label}</span>
          </>
        ) : (
          <span className="block text-sm text-muted">{idle}</span>
        )}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" aria-hidden />
    </Link>
  );
}

function Inbox() {
  const { data, isPending, isError } = useAdminInbox();
  if (isError) return null; // Not essential; the rest of the dashboard still works.
  return (
    <section aria-labelledby="inbox-heading">
      <h2 id="inbox-heading" className="sr-only">
        Inbox
      </h2>
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[4.5rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InboxCard
            href="/admin/packages"
            icon={Wallet}
            urgent
            count={data.pendingMemberships}
            label={`package${data.pendingMemberships === 1 ? '' : 's'} awaiting payment`}
            idle="No packages awaiting payment"
          />
          <InboxCard
            href="/admin/events"
            icon={PartyPopper}
            urgent
            count={data.newEventRequests}
            label={`new event request${data.newEventRequests === 1 ? '' : 's'} to quote`}
            idle={data.upcomingEvents ? `${data.upcomingEvents} confirmed event${data.upcomingEvents === 1 ? '' : 's'} coming up` : 'No new event requests'}
          />
          <InboxCard
            href="/admin/products"
            icon={ShoppingBag}
            urgent
            count={data.pendingReservations}
            label={`reservation${data.pendingReservations === 1 ? '' : 's'} to prepare`}
            idle="No reservations to prepare"
          />
          <InboxCard
            href="/admin/packages"
            icon={Crown}
            count={data.activeMembers}
            label={`active member${data.activeMembers === 1 ? '' : 's'}`}
            idle="No active members yet"
          />
        </div>
      )}
    </section>
  );
}

// ---------- Top services ----------

function TopServices() {
  const { data, isPending, isError, error, refetch } = useStats();
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="top-services">
      <h2 id="top-services" className="text-xl">
        Top services this month
      </h2>
      <p className="mt-1 text-sm text-muted">By number of bookings</p>
      <div className="mt-6">
        {isPending ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-sm text-muted">
            <p>{error.message}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data.topServices.length === 0 ? (
          <p className="rounded-xl bg-ivory px-4 py-8 text-center text-sm text-muted">No bookings yet this month.</p>
        ) : (
          <ol className="space-y-4">
            {data.topServices.map((s, i) => {
              const max = data.topServices[0].bookings || 1;
              return (
                <li key={s.serviceId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-plum-900">
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {s.name}
                    </span>
                    <span className="shrink-0 text-muted">
                      {s.bookings} · {formatPrice(s.revenue, data.currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand" aria-hidden>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-plum-500 to-rose-500"
                      style={{ width: `${Math.max(6, (s.bookings / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

// ---------- Today's appointments ----------

function TodayAppointments({ timeZone }: { timeZone: string }) {
  const today = todayIn(timeZone);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...adminKeys.bookings, { from: today, to: today, pageSize: 100 }],
    queryFn: () => api.get<BookingsPage>(`/admin/bookings?from=${today}&to=${today}&pageSize=100`),
  });

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="today-appointments">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="today-appointments" className="text-xl">
            Today’s appointments
          </h2>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.total} booking${data.total === 1 ? '' : 's'}` : 'Loading schedule…'}
          </p>
        </div>
        <ButtonLink href="/admin/bookings" variant="ghost" size="sm">
          View all
        </ButtonLink>
      </div>
      <div className="mt-5">
        {isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="A quiet day">
            No appointments are booked for today.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map(b => (
              <AppointmentRow key={b.id} booking={b} timeZone={timeZone} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AppointmentRow({ booking: b, timeZone }: { booking: Booking; timeZone: string }) {
  const update = useUpdateBookingStatus();
  const actionable = b.status === 'CONFIRMED' || b.status === 'PENDING';
  const pendingStatus = update.isPending ? update.variables?.status : undefined;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex w-24 shrink-0 items-center gap-2 text-plum-900">
        <Clock className="size-4 text-rose-500" aria-hidden />
        <span className="font-semibold">{formatTime(b.startAt, timeZone)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-plum-900">{b.customer?.name ?? 'Guest'}</p>
          <StatusBadge status={b.status} />
          {b.discount > 0 ? (
            <Badge tone="rose" className="px-2 py-0.5">
              {b.membershipApplied ? 'Member · ' : ''}−{formatPrice(b.discount, b.currency)}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {b.service.name} · until {formatTime(b.endAt, timeZone)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={b.staff.name} src={b.staff.avatarUrl} className="size-5 text-[0.6rem]" />
            {b.staff.name}
          </span>
          {b.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {b.location.name}
            </span>
          ) : null}
          {b.customer?.phone ? (
            <a href={`tel:${b.customer.phone}`} className="inline-flex items-center gap-1 hover:text-rose-600">
              <Phone className="size-3.5" aria-hidden />
              {b.customer.phone}
            </a>
          ) : null}
        </div>
      </div>
      {actionable ? (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            loading={pendingStatus === 'COMPLETED'}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: b.id, status: 'COMPLETED' })}
          >
            {pendingStatus === 'COMPLETED' ? null : <Check className="size-4" aria-hidden />}
            Completed
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pendingStatus === 'NO_SHOW'}
            disabled={update.isPending}
            onClick={() => {
              if (window.confirm(`Mark ${b.customer?.name ?? 'this booking'} as a no-show?`)) {
                update.mutate({ id: b.id, status: 'NO_SHOW' });
              }
            }}
          >
            {pendingStatus === 'NO_SHOW' ? null : <UserX className="size-4" aria-hidden />}
            No-show
          </Button>
        </div>
      ) : null}
    </li>
  );
}
