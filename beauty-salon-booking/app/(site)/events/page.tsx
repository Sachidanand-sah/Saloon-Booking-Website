import type { Metadata } from 'next';
import { ArrowRight, CalendarHeart, ClipboardList, MessageCircle, PartyPopper } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { EventCard } from '@/components/site/event-card';
import { getPublic } from '@/lib/server/api';
import { formatPrice } from '@/lib/format';
import type { EventPackage } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Bridal & events',
  description:
    'Bridal makeup, bridal party styling, Teej and festival groups, and photoshoots by Lalima Beauty, at our studios or at your venue. Request a quote online.',
};

const steps = [
  { icon: ClipboardList, title: 'Tell us about your day', text: 'Choose a package, date, guest count and where you would like us.' },
  { icon: MessageCircle, title: 'Get a tailored quote', text: 'Our events team replies with a personal quote, usually within a day.' },
  { icon: CalendarHeart, title: 'Accept and relax', text: 'Accept in your account and we reserve our artists for your date.' },
];

export default async function EventsPage() {
  const packages = await getPublic<EventPackage[]>('/event-packages');
  const hero = packages?.find(p => p.imageUrl) ?? null;
  const from = packages?.length ? Math.min(...packages.map(p => p.fromPrice)) : null;

  return (
    <>
      <section className="hero-glow relative overflow-hidden pb-16 pt-32 text-white sm:pb-24 sm:pt-40">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up">
            <p className="eyebrow !text-rose-300">Bridal &amp; events</p>
            <h1 className="mt-5 text-4xl leading-[1.08] !text-white sm:text-6xl">
              For the days you&apos;ll <em className="font-normal text-rose-300">remember forever</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Weddings, mehendi, Teej, Dashain gatherings and photoshoots: our senior artists get you and your people ready,
              at our studios or wherever you celebrate.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/events/request" variant="light" size="lg">
                Request a quote <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="#packages" size="lg" variant="ghost" className="border border-white/25 !text-white hover:!bg-white/10">
                See packages
              </ButtonLink>
            </div>
            {from !== null ? <p className="mt-6 text-sm text-white/60">Packages from {formatPrice(from)}</p> : null}
          </div>
          {hero?.imageUrl ? (
            <div className="relative hidden h-[460px] lg:block" aria-hidden>
              <div className="absolute inset-y-0 right-6 w-[78%] overflow-hidden rounded-t-[999px] shadow-lift">
                <Photo src={hero.imageUrl} alt="" kind="event" className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-plum-900/60 via-plum-700/10 to-rose-300/10" />
              </div>
              <div className="absolute inset-y-10 right-16 w-[62%] rounded-t-[999px] border border-white/30" />
              <div className="absolute bottom-14 left-0 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-lift">
                <span className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <PartyPopper className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-plum-900">At our studio or your venue</p>
                  <p className="text-xs text-muted">Across the Kathmandu valley</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section id="packages" className="container-page scroll-mt-24 py-20 sm:py-24">
        <SectionHeading
          eyebrow="Event packages"
          title="Find the right package"
          intro="Every quote is tailored to your day. Prices shown are a starting point for the smallest party."
        />
        {packages?.length ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {packages.map(p => (
              <EventCard key={p.id} pkg={p} />
            ))}
          </div>
        ) : (
          <p className="card mx-auto mt-12 max-w-lg p-8 text-center text-muted">
            We couldn&apos;t load our event packages right now. Please refresh in a moment or call us.
          </p>
        )}
      </section>

      <section className="bg-sand/60 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="From enquiry to your big day" />
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
          <div className="mt-12 text-center">
            <ButtonLink href="/events/request" size="lg">
              Start your request <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
