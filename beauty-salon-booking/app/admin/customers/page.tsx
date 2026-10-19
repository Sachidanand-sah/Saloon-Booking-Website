'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, ChevronRight, Coins, Mail, Minus, Phone, Plus, Users } from 'lucide-react';
import { ErrorState, PageHeader } from '@/components/admin/common';
import { SearchBox, extraKeys, formatDay, useDebounced, type AdminCustomer, type AdminLoyalty } from '@/components/admin/extras';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, fieldErrors } from '@/components/ui/field';
import { Avatar, Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn } from '@/lib/format';

const pts = (n: number) => new Intl.NumberFormat('en-IN').format(n);

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [selected, setSelected] = useState<AdminCustomer | null>(null);

  const list = useQuery({
    queryKey: [...extraKeys.customers, q],
    queryFn: () => api.get<AdminCustomer[]>(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader eyebrow="Grow" title="Customers" intro="Look up a client, see their loyalty points and adjust them when needed." />

      <div className="card p-4 sm:p-5">
        <SearchBox value={search} onChange={setSearch} className="sm:max-w-md" />
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <EmptyState icon={Users} title={q ? 'No customers match' : 'No customers yet'}>
          {q ? 'Try a different name, email or phone number.' : 'Customers appear here once they create an account.'}
        </EmptyState>
      ) : (
        <div className={cn('space-y-3 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
          <p className="text-sm text-muted" aria-live="polite">
            {list.data.length === 100 ? 'Showing the 100 most recent customers. Search to narrow down.' : `${list.data.length} customer${list.data.length === 1 ? '' : 's'}`}
          </p>

          {/* Table (md+) */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-ivory/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Contact</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Bookings</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Points</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.map(c => (
                  <tr key={c.id} className="transition hover:bg-plum-50/40">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3">
                        <Avatar name={c.name} className="size-9 shrink-0 text-xs" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-plum-900">{c.name}</span>
                          <span className="block text-xs text-muted">Joined {formatDay(c.createdAt, { weekday: undefined })}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-muted hover:text-rose-600">
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        {c.email}
                      </a>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="mt-0.5 flex items-center gap-1.5 text-muted hover:text-rose-600">
                          <Phone className="size-3.5 shrink-0" aria-hidden />
                          {c.phone}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-right text-plum-900">{c.bookingCount}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-plum-900">{pts(c.loyaltyPoints)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)} aria-label={`Loyalty for ${c.name}`}>
                        <Award className="size-4" aria-hidden />
                        Loyalty
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <ul className="space-y-2 md:hidden">
            {list.data.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-lift"
                >
                  <Avatar name={c.name} className="size-10 shrink-0 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-plum-900">{c.name}</span>
                    <span className="block truncate text-xs text-muted">{c.phone ?? c.email}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {c.bookingCount} booking{c.bookingCount === 1 ? '' : 's'} ·{' '}
                      <span className="font-semibold text-plum-900">{pts(c.loyaltyPoints)} pts</span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? selected.name : 'Customer'} wide>
        {selected ? <LoyaltyPanel key={selected.id} customer={selected} /> : null}
      </Modal>
    </div>
  );
}

const REASON: Record<string, string> = {
  SIGNUP_BONUS: 'Welcome bonus',
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  REFUNDED: 'Refunded',
  ADJUSTMENT: 'Adjustment',
};

function LoyaltyPanel({ customer }: { customer: AdminCustomer }) {
  const loyalty = useQuery({
    queryKey: extraKeys.loyalty(customer.id),
    queryFn: () => api.get<AdminLoyalty>(`/admin/customers/${customer.id}/loyalty`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 hover:text-rose-600">
          <Mail className="size-3.5" aria-hidden />
          {customer.email}
        </a>
        {customer.phone ? (
          <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 hover:text-rose-600">
            <Phone className="size-3.5" aria-hidden />
            {customer.phone}
          </a>
        ) : null}
      </div>

      {loyalty.isError ? (
        <ErrorState error={loyalty.error} onRetry={() => loyalty.refetch()} />
      ) : loyalty.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <TierCard data={loyalty.data} />
          <AdjustForm customer={customer} balance={loyalty.data.balance} />
          <section aria-labelledby="loyalty-history">
            <h3 id="loyalty-history" className="text-lg">
              History
            </h3>
            {loyalty.data.history.length === 0 ? (
              <p className="mt-2 rounded-xl bg-ivory px-4 py-6 text-center text-sm text-muted">No points activity yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {loyalty.data.history.map(h => (
                  <li key={h.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-plum-900">{REASON[h.reason] ?? h.reason}</p>
                      {h.note ? <p className="text-muted">{h.note}</p> : null}
                      <p className="text-xs text-muted">{formatDay(h.createdAt, { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <span className={cn('shrink-0 font-semibold', h.points >= 0 ? 'text-success' : 'text-danger')}>
                      {h.points > 0 ? '+' : '−'}
                      {pts(Math.abs(h.points))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TierCard({ data }: { data: AdminLoyalty }) {
  const { tier, nextTier, lifetime, balance, pointsToNext } = data;
  const span = nextTier ? nextTier.minPoints - tier.minPoints : 1;
  const progress = nextTier ? Math.min(100, Math.max(0, ((lifetime - tier.minPoints) / span) * 100)) : 100;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-plum-900 to-plum-700 p-5 text-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">{tier.name} member</p>
          <p className="mt-1 font-display text-4xl font-semibold">
            {pts(balance)} <span className="font-sans text-base font-normal text-white/70">points</span>
          </p>
        </div>
        <div className="text-right text-sm text-white/80">
          <p>Lifetime earned</p>
          <p className="font-semibold text-white">{pts(lifetime)}</p>
        </div>
      </div>
      <div className="mt-4">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-label={nextTier ? `Progress to ${nextTier.name}` : 'Top tier reached'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500" style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
        <p className="mt-2 text-sm text-white/80">
          {nextTier ? `${pts(pointsToNext)} more lifetime points to ${nextTier.name}` : 'Top tier reached'}
          {tier.multiplier > 1 ? ` · earns ${tier.multiplier}× points` : ''}
        </p>
      </div>
      {tier.perks.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tier.perks.map(p => (
            <Badge key={p} className="bg-white/10 text-white">
              {p}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdjustForm({ customer, balance }: { customer: AdminCustomer; balance: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const adjust = useMutation({
    mutationFn: (payload: { points: number; note: string }) => api.post<{ balance: number }>(`/admin/customers/${customer.id}/loyalty`, payload),
    onSuccess: ({ balance: b }, { points }) => {
      toast(`${points > 0 ? 'Added' : 'Removed'} ${pts(Math.abs(points))} points. ${customer.name} now has ${pts(b)}.`);
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: extraKeys.customers });
    },
    onError: e => {
      const fe = e instanceof RequestError ? fieldErrors(e.details) : {};
      if (Object.keys(fe).length) setErrors(fe);
      else toast(errorMessage(e), 'error');
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    const local: Record<string, string> = {};
    if (!Number.isInteger(n) || n <= 0) local.points = 'Enter a whole number of points';
    else if (sign === -1 && n > balance) local.points = `Balance is only ${pts(balance)} points`;
    if (note.trim().length < 2) local.note = 'Add a short reason';
    setErrors(local);
    if (Object.keys(local).length) return;
    adjust.mutate({ points: sign * n, note: note.trim() });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line p-4" noValidate>
      <h3 className="flex items-center gap-2 text-lg">
        <Coins className="size-5 text-rose-500" aria-hidden />
        Adjust points
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_8rem_minmax(0,1fr)] sm:items-start">
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-plum-900" id="adjust-direction">
            Direction
          </span>
          <div role="radiogroup" aria-labelledby="adjust-direction" className="inline-flex h-12 rounded-xl border border-line bg-white p-1">
            {([1, -1] as const).map(s => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sign === s}
                onClick={() => setSign(s)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium transition',
                  sign === s ? (s === 1 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger') : 'text-muted hover:bg-plum-50',
                )}
              >
                {s === 1 ? <Plus className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                {s === 1 ? 'Add' : 'Remove'}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Points"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={amount}
          error={errors.points}
          onChange={e => setAmount(e.target.value)}
        />
        <Input
          label="Reason"
          maxLength={200}
          placeholder="e.g. Goodwill for a late start"
          value={note}
          error={errors.note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm" variant={sign === 1 ? 'accent' : 'primary'} loading={adjust.isPending}>
          {sign === 1 ? 'Add points' : 'Remove points'}
        </Button>
      </div>
    </form>
  );
}
