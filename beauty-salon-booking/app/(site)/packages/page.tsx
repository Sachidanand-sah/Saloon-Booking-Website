import type { Metadata } from 'next';
import { ArrowRight, CalendarCheck, Coins, Gift, Sparkles, Store } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/misc';
import { PageHeader } from '@/components/site/page-header';
import { PlanCard } from '@/components/site/plan-card';
import { getPublic } from '@/lib/server/api';
import type { LocationListItem, LoyaltyProgramme, Plan } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Monthly packages',
  description:
    'Monthly beauty packages at Lalima Beauty: included treatments every month plus a member discount on everything else. Pay at any branch.',
};

const steps = [
  { icon: Sparkles, title: 'Choose your package', text: 'Pick the plan that fits your routine and request it online in seconds.' },
  { icon: Store, title: 'Pay at any branch', text: 'Settle up at the front desk on your next visit. We activate it on the spot.' },
  {
    icon: CalendarCheck,
    title: 'Enjoy, automatically',
    text: 'Book online as usual. Included treatments and your member discount apply on their own.',
  },
];

export default async function PackagesPage() {
  const [plans, branches, programme] = await Promise.all([
    getPublic<Plan[]>('/plans'),
    getPublic<LocationListItem[]>('/locations', 300),
    getPublic<LoyaltyProgramme>('/loyalty/programme', 300),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Monthly packages"
        title="Your glow, on a monthly ritual"
        intro="Treatments you love, included every month, plus a members-only discount on everything else. No contracts: renew when you like."
      />

      <section className="container-page py-16 sm:py-20">
        {plans?.length ? (
          <div className="mx-auto grid max-w-6xl items-stretch gap-8 pt-4 lg:grid-cols-3 lg:gap-6">
            {plans.map(p => (
              <PlanCard key={p.id} plan={p} branches={branches ?? []} />
            ))}
          </div>
        ) : (
          <p className="card mx-auto max-w-lg p-8 text-center text-muted">
            Our packages are being refreshed. Please check back shortly or ask at any branch.
          </p>
        )}
      </section>

      <section className="bg-sand/60 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="Three steps to member pricing" />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="card relative p-7">
                <span className="absolute right-6 top-5 font-display text-5xl text-linen">0{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-plum-900 text-rose-300">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-6 text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted">
            Included treatments reset every month and can be used at any branch. Unused treatments don&apos;t roll over.
          </p>
        </div>
      </section>

      {programme ? (
        <section className="container-page py-20 sm:py-24">
          <div className="hero-glow relative overflow-hidden rounded-[var(--radius-card)] px-6 py-12 text-white sm:px-12">
            <Gift className="absolute -right-8 -top-8 size-56 text-white/5" strokeWidth={0.75} aria-hidden />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="eyebrow !text-rose-300">Lalima Rewards</p>
                <h2 className="mt-3 text-3xl !text-white sm:text-4xl">Every visit earns points</h2>
                <p className="mt-4 max-w-lg leading-relaxed text-white/75">
                  Members and non-members alike earn {programme.pointsPer100} points for every Rs. 100 spent, and spend them
                  on future bookings. Join today and get {programme.signupBonus} welcome points.
                </p>
              </div>
              <div className="flex flex-col gap-4 md:items-end">
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4">
                  <Coins className="size-6 text-rose-300" />
                  <span className="text-sm text-white/85">
                    1 point = Rs. {programme.pointValue} off · up to {programme.maxRedeemPercent}% of a treatment
                  </span>
                </div>
                <ButtonLink href="/rewards" variant="light">
                  Explore rewards <ArrowRight className="size-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
