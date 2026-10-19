import { Check, Percent, Sparkles } from 'lucide-react';
import { cn, formatPrice } from '@/lib/format';
import type { LocationListItem, Plan } from '@/lib/types';
import { JoinPlanButton } from './join-plan';

export function PlanCard({ plan, branches }: { plan: Plan; branches: LocationListItem[] }) {
  const value = plan.includes.reduce((n, i) => n + i.value, 0);
  const featured = plan.isFeatured;
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-[var(--radius-card)] p-7 transition-all duration-300 sm:p-8',
        featured
          ? 'hero-glow text-white shadow-lift lg:-my-4 lg:py-12'
          : 'card hover:-translate-y-1 hover:shadow-lift',
      )}
    >
      {featured ? (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white shadow-soft">
          <Sparkles className="size-3.5" /> Most popular
        </span>
      ) : null}
      <h3 className={cn('text-2xl', featured && '!text-white')}>{plan.name}</h3>
      {plan.tagline ? <p className={cn('mt-1 text-sm', featured ? 'text-rose-300' : 'text-rose-600')}>{plan.tagline}</p> : null}
      <p className="mt-6 flex items-baseline gap-1.5">
        <span className={cn('font-display text-5xl font-semibold', featured ? 'text-white' : 'text-plum-900')}>
          {formatPrice(plan.price, plan.currency)}
        </span>
        <span className={cn('text-sm', featured ? 'text-white/60' : 'text-muted')}>
          / {plan.durationDays === 30 ? 'month' : `${plan.durationDays} days`}
        </span>
      </p>
      <p className={cn('mt-4 text-sm leading-relaxed', featured ? 'text-white/75' : 'text-muted')}>{plan.description}</p>

      <div className={cn('mt-6 border-t pt-6', featured ? 'border-white/15' : 'border-line')}>
        <p className={cn('text-xs font-semibold uppercase tracking-widest', featured ? 'text-white/60' : 'text-plum-900')}>
          Included every month
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {plan.includes.map(i => (
            <li key={i.serviceId} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                  featured ? 'bg-white/15 text-white' : 'bg-rose-50 text-rose-600',
                )}
              >
                {i.quantity}×
              </span>
              <span className="flex-1">{i.serviceName}</span>
              <span className={cn('shrink-0 text-xs line-through', featured ? 'text-white/50' : 'text-muted')}>
                {formatPrice(i.value, plan.currency)}
              </span>
            </li>
          ))}
          {plan.discountPercent ? (
            <li className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full',
                  featured ? 'bg-white/15 text-white' : 'bg-rose-50 text-rose-600',
                )}
              >
                <Percent className="size-3.5" />
              </span>
              <span className="flex-1 font-medium">{plan.discountPercent}% off everything else</span>
            </li>
          ) : null}
        </ul>
        {value > plan.price ? (
          <p className={cn('mt-4 text-xs', featured ? 'text-rose-300' : 'text-success')}>
            Included treatments worth {formatPrice(value, plan.currency)}
          </p>
        ) : null}
      </div>

      {plan.perks.length ? (
        <ul className={cn('mt-6 flex-1 space-y-2.5 border-t pt-6 text-sm', featured ? 'border-white/15 text-white/85' : 'border-line text-ink/80')}>
          {plan.perks.map(p => (
            <li key={p} className="flex gap-2.5">
              <Check className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-rose-300' : 'text-rose-500')} /> {p}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      <JoinPlanButton plan={plan} branches={branches} featured={featured} />
    </article>
  );
}
