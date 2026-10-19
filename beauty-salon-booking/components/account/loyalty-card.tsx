'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, History } from 'lucide-react';
import { Modal, Skeleton } from '@/components/ui/misc';
import { tierIcon, tierStyle } from '@/components/site/tier-cards';
import { api, errorMessage } from '@/lib/client';
import { cn, formatDate, formatPrice } from '@/lib/format';
import type { LoyaltyReason, LoyaltySummary } from '@/lib/types';

const reasonLabel: Record<LoyaltyReason, string> = {
  SIGNUP_BONUS: 'Welcome bonus',
  EARNED: 'Earned',
  REDEEMED: 'Used on booking',
  REFUNDED: 'Returned',
  ADJUSTMENT: 'Adjustment',
};

export function LoyaltyCard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const loyalty = useQuery({ queryKey: ['loyalty'], queryFn: () => api.get<LoyaltySummary>('/loyalty/me') });

  if (loyalty.isPending) return <Skeleton className="h-52" />;
  if (loyalty.isError) {
    return (
      <div className="card p-5 text-sm text-muted">
        {errorMessage(loyalty.error)}{' '}
        <button onClick={() => loyalty.refetch()} className="font-semibold text-rose-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const l = loyalty.data;
  const Icon = tierIcon[l.tier.key];
  const progress = l.nextTier
    ? Math.min(100, Math.max(0, ((l.lifetime - l.tier.minPoints) / (l.nextTier.minPoints - l.tier.minPoints)) * 100))
    : 100;

  return (
    <div className="hero-glow relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-soft">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/5" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Lalima Rewards</p>
          <p className="mt-3 font-display text-4xl font-semibold">
            {l.balance.toLocaleString('en-IN')}
            <span className="ml-1.5 font-sans text-sm font-normal text-white/70">points</span>
          </p>
          <p className="mt-1 text-xs text-white/60">
            Worth {formatPrice(l.balance * l.programme.pointValue)} off your next booking
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br px-3 py-1 text-xs font-semibold shadow-soft',
            tierStyle[l.tier.key],
          )}
        >
          <Icon className="size-3.5" /> {l.tier.name}
        </span>
      </div>

      <div className="relative mt-5">
        <div
          className="h-2 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={l.nextTier ? `Progress to ${l.nextTier.name}` : 'Top tier reached'}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-white/70">
          {l.nextTier
            ? `${l.pointsToNext.toLocaleString('en-IN')} more points to ${l.nextTier.name}`
            : `You've reached our top tier. Thank you!`}
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 text-sm">
        <button onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-1.5 font-medium text-white/85 hover:text-white">
          <History className="size-4" /> Points history
        </button>
        <Link href="/rewards" className="inline-flex items-center gap-1 font-medium text-rose-300 hover:text-white">
          How it works <ArrowRight className="size-4" />
        </Link>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Points history">
        {l.history.length ? (
          <ul className="divide-y divide-line">
            {l.history.map(h => (
              <li key={h.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-plum-900">{reasonLabel[h.reason]}</p>
                  <p className="truncate text-xs text-muted">
                    {h.booking ? `${h.booking.serviceName} · ` : ''}
                    {h.note ? `${h.note} · ` : ''}
                    {formatDate(h.createdAt, undefined, { year: 'numeric' })}
                  </p>
                </div>
                <span className={cn('shrink-0 font-semibold tabular-nums', h.points > 0 ? 'text-success' : 'text-plum-900')}>
                  {h.points > 0 ? '+' : ''}
                  {h.points.toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No points activity yet. Complete a visit to start earning.</p>
        )}
        <p className="mt-5 rounded-xl bg-ivory p-3 text-xs text-muted">
          Lifetime points: <span className="font-semibold text-plum-900">{l.lifetime.toLocaleString('en-IN')}</span>. Tiers use
          lifetime points, so using points never lowers your tier.
        </p>
      </Modal>
    </div>
  );
}
