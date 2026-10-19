import { Award, Check, Crown, Gem, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/format';
import type { LoyaltyTier } from '@/lib/types';

export const tierIcon: Record<LoyaltyTier['key'], LucideIcon> = { SILVER: Award, GOLD: Crown, PLATINUM: Gem };
export const tierStyle: Record<LoyaltyTier['key'], string> = {
  SILVER: 'from-zinc-200 to-zinc-400 text-zinc-800',
  GOLD: 'from-amber-200 to-amber-500 text-amber-900',
  PLATINUM: 'from-plum-300 to-plum-700 text-white',
};

export function TierCards({ tiers }: { tiers: LoyaltyTier[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((t, i) => {
        const Icon = tierIcon[t.key];
        const next = tiers[i + 1];
        return (
          <article key={t.key} className="card flex flex-col p-7 transition hover:-translate-y-1 hover:shadow-lift">
            <span className={cn('flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-soft', tierStyle[t.key])}>
              <Icon className="size-6" />
            </span>
            <h3 className="mt-6 text-2xl">{t.name}</h3>
            <p className="mt-1 text-sm text-muted">
              {t.minPoints === 0
                ? 'Where everyone starts'
                : `${t.minPoints.toLocaleString('en-IN')}+ lifetime points`}
              {next ? '' : ' · our highest tier'}
            </p>
            <p className="mt-4 font-display text-3xl font-semibold text-plum-900">
              {t.multiplier}×<span className="ml-1.5 font-sans text-sm font-normal text-muted">points</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5 text-sm text-ink/80">
              {t.perks.map(p => (
                <li key={p} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-rose-500" /> {p}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
