'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { api } from '@/lib/client';
import type { EventRequestStatus, MembershipStatus, Plan, ReservationStatus, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Badge, Modal } from '@/components/ui/misc';
import { cn } from '@/lib/format';

// ---------- API shapes (see backend-api/src/modules/admin/extras.ts) ----------

export type AdminPlan = Plan & { activeMembers: number };

export type AdminCustomer = User & { bookingCount: number };

export type AdminInbox = {
  pendingMemberships: number;
  activeMembers: number;
  newEventRequests: number;
  upcomingEvents: number;
  pendingReservations: number;
};

/** GET /admin/customers/:id/loyalty (raw ledger rows, no booking details). */
export type AdminLoyalty = {
  balance: number;
  lifetime: number;
  tier: { key: string; name: string; minPoints: number; multiplier: number; perks: string[] };
  nextTier: { key: string; name: string; minPoints: number; multiplier: number; perks: string[] } | null;
  pointsToNext: number;
  history: { id: string; points: number; reason: string; note: string | null; createdAt: string; bookingId?: string | null }[];
};

// All keys sit under ['admin'] so global admin invalidations refresh them too.
export const extraKeys = {
  inbox: ['admin', 'inbox'] as const,
  plans: ['admin', 'plans'] as const,
  memberships: ['admin', 'memberships'] as const,
  eventPackages: ['admin', 'event-packages'] as const,
  eventRequests: ['admin', 'event-requests'] as const,
  products: ['admin', 'products'] as const,
  reservations: ['admin', 'reservations'] as const,
  customers: ['admin', 'customers'] as const,
  loyalty: (id: string) => ['admin', 'customers', id, 'loyalty'] as const,
};

export const useAdminInbox = () =>
  useQuery({ queryKey: extraKeys.inbox, queryFn: () => api.get<AdminInbox>('/admin/inbox'), refetchInterval: 60_000 });

export const useAdminPlans = () => useQuery({ queryKey: extraKeys.plans, queryFn: () => api.get<AdminPlan[]>('/admin/plans') });

// ---------- Status labels & tones ----------

type Tone = 'neutral' | 'plum' | 'rose' | 'success' | 'warning' | 'danger';

export const MEMBERSHIP_STATUS: Record<MembershipStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Awaiting payment', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const EVENT_STATUS: Record<EventRequestStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'New', tone: 'warning' },
  QUOTED: { label: 'Quoted', tone: 'plum' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  DECLINED: { label: 'Declined', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  COMPLETED: { label: 'Completed', tone: 'rose' },
};

export const RESERVATION_STATUS: Record<ReservationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'To prepare', tone: 'warning' },
  READY: { label: 'Ready to collect', tone: 'success' },
  COLLECTED: { label: 'Collected', tone: 'plum' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function StatusPill<S extends string>({ map, status }: { map: Record<S, { label: string; tone: Tone }>; status: S }) {
  const s = map[status];
  return <Badge tone={s?.tone ?? 'neutral'}>{s?.label ?? status}</Badge>;
}

// ---------- Small building blocks ----------

/** Value that settles `delay` ms after the last change (for search boxes). */
export function useDebounced<T>(value: T, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}

/** Two-way tab switcher styled as a segmented control. */
export function Tabs<K extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: K;
  onChange: (k: K) => void;
  tabs: { key: K; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full border border-line bg-white p-1 shadow-soft">
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              active ? 'bg-plum-900 text-white' : 'text-plum-800 hover:bg-plum-50',
            )}
          >
            {t.label}
            {t.count ? (
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs leading-5',
                  active ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600',
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal filter chips (same look as the services category filter). */
export function FilterChips<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; count?: number; highlight?: boolean }[];
  label: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={label}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition',
              active ? 'border-plum-900 bg-plum-900 text-white' : 'border-line bg-white text-plum-800 hover:border-plum-200 hover:bg-plum-50',
            )}
          >
            {o.label}
            {o.count ? (
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs leading-5',
                  o.highlight ? 'bg-rose-500 text-white' : active ? 'text-rose-300' : 'text-muted',
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  label = 'Search customers',
  placeholder = 'Name, email or phone',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Input
        label={label}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="[&_input]:pl-10"
      />
      <Search className="pointer-events-none absolute bottom-4 left-3.5 size-4 text-muted" aria-hidden />
    </div>
  );
}

/** Editable list of short strings (perks, "includes"). */
export function StringListEditor({
  legend,
  items,
  onChange,
  placeholder,
  max = 10,
  error,
}: {
  legend: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v || items.length >= max) return;
    onChange([...items, v]);
    setDraft('');
  }
  return (
    <fieldset>
      <legend className="text-sm font-medium text-plum-900">{legend}</legend>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item, i) => (
            <li key={`${i}-${item}`} className="flex items-center gap-2 rounded-xl border border-line bg-ivory/50 py-1.5 pl-3.5 pr-1.5 text-sm">
              <span className="min-w-0 flex-1 wrap-break-word text-plum-900">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Remove “${item}”`}
                className="rounded-full p-1.5 text-muted transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex gap-2">
        <input
          aria-label={`Add to ${legend.toLowerCase()}`}
          value={draft}
          placeholder={placeholder}
          disabled={items.length >= max}
          maxLength={120}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-sm text-ink transition placeholder:text-muted/70 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:bg-sand/60"
        />
        <Button type="button" variant="outline" size="sm" className="h-11" onClick={add} disabled={!draft.trim() || items.length >= max}>
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
      </div>
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : <p className="mt-1.5 text-xs text-muted">Up to {max} items.</p>}
    </fieldset>
  );
}

/** Confirmation dialog with an optional note field. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  loading,
  noteLabel,
  notePlaceholder,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'accent' | 'danger';
  loading?: boolean;
  /** When set, shows an optional note textarea and passes its value to onConfirm. */
  noteLabel?: string;
  notePlaceholder?: string;
  onConfirm: (note: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open ? (
        <ConfirmBody
          confirmLabel={confirmLabel}
          tone={tone}
          loading={loading}
          noteLabel={noteLabel}
          notePlaceholder={notePlaceholder}
          onClose={onClose}
          onConfirm={onConfirm}
        >
          {children}
        </ConfirmBody>
      ) : null}
    </Modal>
  );
}

function ConfirmBody({
  children,
  confirmLabel,
  tone,
  loading,
  noteLabel,
  notePlaceholder,
  onClose,
  onConfirm,
}: {
  children?: ReactNode;
  confirmLabel: string;
  tone: 'primary' | 'accent' | 'danger';
  loading?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    onConfirm(note.trim());
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {children ? <div className="text-sm leading-relaxed text-muted">{children}</div> : null}
      {noteLabel ? (
        <Textarea label={noteLabel} rows={3} maxLength={300} placeholder={notePlaceholder} value={note} onChange={e => setNote(e.target.value)} />
      ) : null}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Keep as is
        </Button>
        <Button type="submit" variant={tone} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}

/** Formats a calendar date string (YYYY-MM-DD) or ISO instant as "Sun, Nov 8, 2026". */
export function formatDay(value: string, opts: Intl.DateTimeFormatOptions = {}) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : 'Asia/Kathmandu',
    ...opts,
  }).format(d);
}

/** "07:00" → "7:00am". */
export function formatHHMM(value: string) {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')}${suffix}`;
}

/** Image preview that tolerates broken URLs. */
export function ImagePreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) {
    return (
      <div className={cn('flex items-center justify-center bg-gradient-to-br from-plum-100 to-rose-100 text-xs text-plum-700', className)}>
        {src ? 'Image unavailable' : 'No image'}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs from any host
  return <img src={src} alt={alt} onError={() => setBroken(src)} className={cn('object-cover', className)} />;
}
