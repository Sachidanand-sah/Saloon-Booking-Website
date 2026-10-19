'use client';

import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import type { Booking, BookingStatus, Category, SalonInfo, Service, StaffSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/providers';

// ---------- Admin API shapes (see backend-api/src/modules/admin/routes.ts) ----------

export type WorkingShift = { dayOfWeek: number; startMinute: number; endMinute: number };

export type AdminStaff = StaffSummary & {
  isActive: boolean;
  email: string | null;
  serviceIds: string[];
  workingHours: WorkingShift[];
};

export type AdminService = Service & { staffIds: string[] };

type Summary = { bookings: number; completed: number; cancelled: number; noShows: number; revenue: number };

export type AdminStats = {
  currency: string;
  today: Summary;
  thisMonth: Summary;
  upcomingWeek: number;
  customers: { total: number; newThisMonth: number };
  topServices: { serviceId: string; name: string; bookings: number; revenue: number }[];
};

export type BookingsPage = { total: number; page: number; pageSize: number; items: Booking[] };

export const STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No-show' },
];

// ---------- Queries ----------

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  bookings: ['admin', 'bookings'] as const,
  services: ['admin', 'services'] as const,
  staff: ['admin', 'staff'] as const,
};

export const useSalon = () =>
  useQuery({ queryKey: ['salon'], queryFn: () => api.get<SalonInfo>('/salon'), staleTime: 60 * 60_000 });

export const useAdminStaff = () =>
  useQuery({ queryKey: adminKeys.staff, queryFn: () => api.get<AdminStaff[]>('/admin/staff') });

export const useAdminServices = () =>
  useQuery({ queryKey: adminKeys.services, queryFn: () => api.get<AdminService[]>('/admin/services') });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), staleTime: 10 * 60_000 });

export const statusLabel = (s: BookingStatus) => STATUSES.find(x => x.value === s)?.label ?? s;

/** PATCH /admin/bookings/:id { status } with toast feedback; refreshes every admin query. */
export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      api.patch<{ booking: Booking }>(`/admin/bookings/${id}`, { status }),
    onSuccess: ({ booking }) => {
      toast(`${booking.customer?.name ?? 'Booking'} marked ${statusLabel(booking.status).toLowerCase()}.`);
      return qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });
}

// ---------- Helpers ----------

/** "HH:MM" for minutes after midnight (1440 → "24:00" is clamped to "23:59" for <input type="time">). */
export function minutesToHHMM(minutes: number) {
  const m = Math.min(minutes, 1439);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function hhmmToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ---------- UI ----------

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow?: string; title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-2 text-sm text-muted sm:text-base">{intro}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'We couldn’t load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <CircleAlert className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-xl">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Small checkbox with a label, styled to match the form controls. */
export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3 transition hover:border-plum-200 hover:bg-plum-50/40 has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-rose-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-plum-900">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
