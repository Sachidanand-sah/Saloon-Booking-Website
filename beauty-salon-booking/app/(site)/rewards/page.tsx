import type { Metadata } from 'next';
import { ArrowRight, CalendarCheck, Coins, Gift, TrendingUp } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/misc';
import { PageHeader } from '@/components/site/page-header';
import { TierCards } from '@/components/site/tier-cards';
import { getPublic } from '@/lib/server/api';
import { formatPrice } from '@/lib/format';
import type { LoyaltyProgramme } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Lalima Rewards',
  description:
    'Earn points on every visit to Lalima Beauty, redeem them on your next booking, and unlock Gold and Platinum perks.',
};

export default async function RewardsPage() {
  const programme = await getPublic<LoyaltyProgramme>('/loyalty/programme', 300);

  // A worked example so the numbers feel real.
  const exampleSpend = 2500;
  const exampleEarn = programme ? Math.floor((exampleSpend / 100) * programme.pointsPer100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Lalima Rewards"
        title="A little thank-you, every visit"
        intro="Earn points every time you visit, spend them on your next treatment, and climb tiers for even more perks. Free for every client."
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/signup?next=/account">
            Join free{programme ? ` · ${programme.signupBonus} bonus points` : ''}
          </ButtonLink>
          <ButtonLink href="/account" variant="outline">
            See my points
          </ButtonLink>
        </div>
      </PageHeader>

      {programme ? (
        <>
          <section className="container-page py-16 sm:py-20">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: TrendingUp,
                  title: 'Earn',
                  text: `${programme.pointsPer100} points for every Rs. 100 you pay on completed visits. Higher tiers earn faster.`,
                },
                {
                  icon: Coins,
                  title: 'Redeem',
                  text: `Each point is worth Rs. ${programme.pointValue}. Use them when you book online, for up to ${programme.maxRedeemPercent}% of a treatment.`,
                },
                {
                  icon: Gift,
                  title: 'Welcome gift',
                  text: `Create an account and we add ${programme.signupBonus} points straight away: ${formatPrice(programme.signupBonus * programme.pointValue)} off your first visit.`,
                },
              ].map(c => (
                <div key={c.title} className="card p-7">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <c.icon className="size-5" />
                  </span>
                  <h2 className="mt-5 text-2xl">{c.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm text-plum-800 sm:flex-row sm:items-center">
              <CalendarCheck className="size-5 shrink-0 text-rose-500" />
              <p>
                <span className="font-semibold">Example:</span> a {formatPrice(exampleSpend)} Glow Facial earns {exampleEarn} points
                as a Silver member, worth {formatPrice(exampleEarn * programme.pointValue)} on your next booking.
              </p>
            </div>
          </section>

          <section className="bg-sand/60 py-20 sm:py-24">
            <div className="container-page">
              <SectionHeading
                eyebrow="Tiers"
                title="The more you glow, the more you earn"
                intro="Tiers are based on the points you've earned in total, so spending points never lowers your tier."
              />
              <div className="mt-14">
                <TierCards tiers={programme.tiers} />
              </div>
            </div>
          </section>

          <section className="container-page py-20 sm:py-24">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl">Good to know</h2>
              <dl className="mt-8 divide-y divide-line border-y border-line">
                {[
                  ['When do I get my points?', 'As soon as the salon marks your visit as completed, usually the same day.'],
                  [
                    'How do I use them?',
                    'On the last step of online booking, switch on "Use my points" and choose how many. The discount comes off what you pay at the salon.',
                  ],
                  ['What if I cancel?', 'Points used on a booking you cancel are returned to your balance straight away.'],
                  [
                    'Do packages earn points?',
                    'Yes. You earn on whatever you pay at the salon, including treatments discounted by your monthly package.',
                  ],
                ].map(([q, a]) => (
                  <div key={q} className="py-5">
                    <dt className="font-display text-lg font-semibold text-plum-900">{q}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">{a}</dd>
                  </div>
                ))}
              </dl>
              <ButtonLink href="/book" className="mt-10">
                Book and start earning <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </section>
        </>
      ) : (
        <section className="container-page py-16">
          <p className="card mx-auto max-w-lg p-8 text-center text-muted">
            We couldn&apos;t load the rewards programme right now. Please refresh in a moment.
          </p>
        </section>
      )}
    </>
  );
}
