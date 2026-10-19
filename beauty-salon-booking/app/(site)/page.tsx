import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Flower2,
  Hand,
  Check,
  MapPin,
  PartyPopper,
  Percent,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Avatar, SectionHeading, Stars } from '@/components/ui/misc';
import { ServiceCard } from '@/components/site/service-card';
import { BranchCard } from '@/components/site/branch-card';
import { ProductCard } from '@/components/shop/product-card';
import { Photo } from '@/components/ui/photo';
import { getPublic } from '@/lib/server/api';
import { formatPrice } from '@/lib/format';
import { site } from '@/lib/site';
import type { Category, EventPackage, LocationListItem, Plan, Product, Review, SalonInfo, Service, Staff } from '@/lib/types';

const categoryIcon: Record<string, LucideIcon> = { hair: Scissors, skin: Sparkles, nails: Hand, spa: Flower2 };

export default async function HomePage() {
  const [featured, categories, staff, reviews, salon, branches, plans, eventPackages, products] = await Promise.all([
    getPublic<Service[]>('/services?featured=true'),
    getPublic<Category[]>('/categories'),
    getPublic<Staff[]>('/staff'),
    getPublic<Review[]>('/reviews?limit=6'),
    getPublic<SalonInfo>('/salon', 300),
    getPublic<LocationListItem[]>('/locations', 300),
    getPublic<Plan[]>('/plans', 300),
    getPublic<EventPackage[]>('/event-packages', 300),
    getPublic<Product[]>('/products?featured=true'),
  ]);
  const plan = plans?.find(p => p.isFeatured) ?? plans?.[0];
  const bridal = eventPackages?.find(p => p.slug.includes('bridal')) ?? eventPackages?.[0];

  const rated = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const fromPrice = featured?.length ? Math.min(...featured.map(s => s.price)) : null;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero-glow relative overflow-hidden pb-20 pt-32 text-white sm:pb-28 sm:pt-40">
        <div className="container-page grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-fade-up">
            <p className="eyebrow !text-rose-300">{site.tagline}</p>
            <h1 className="mt-5 text-4xl leading-[1.08] !text-white sm:text-6xl lg:text-7xl">
              Where beauty meets <em className="font-normal text-rose-300">quiet luxury</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Hair, skin, nails and spa rituals by senior specialists — in a calm studio designed around you.
              Choose your stylist and book a time that suits you in under a minute.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" variant="light" size="lg">
                Book an appointment <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink
                href="/services"
                size="lg"
                variant="ghost"
                className="border border-white/25 !text-white hover:!bg-white/10"
              >
                Explore services
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-8">
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">Rating</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-display text-2xl">
                  {rated ? rated.toFixed(1) : '5.0'} <Star className="size-4 fill-rose-300 text-rose-300" />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">Specialists</dt>
                <dd className="mt-1 font-display text-2xl">{staff?.length ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">From</dt>
                <dd className="mt-1 font-display text-2xl">{fromPrice !== null ? formatPrice(fromPrice) : '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Decorative composition */}
          <div className="relative hidden h-[520px] lg:block" aria-hidden>
            <div className="absolute inset-y-0 right-6 w-[78%] overflow-hidden rounded-t-[999px] shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative, already optimised */}
              <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-plum-900/60 via-plum-700/10 to-rose-300/10" />
            </div>
            <div className="absolute inset-y-10 right-16 w-[62%] rounded-t-[999px] border border-white/30" />
            {reviews?.[0] ? (
              <div className="absolute bottom-16 left-0 w-72 rounded-2xl bg-white p-5 text-ink shadow-lift">
                <Stars value={reviews[0].rating} />
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed">“{reviews[0].comment}”</p>
                <p className="mt-3 text-xs font-semibold text-plum-700">— {reviews[0].author}</p>
              </div>
            ) : null}
            <div className="absolute right-0 top-14 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-lift">
              <span className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <CalendarCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-plum-900">Instant confirmation</p>
                <p className="text-xs text-muted">Real-time availability</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      {categories?.length ? (
        <section className="container-page -mt-10 relative z-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map(c => {
              const Icon = categoryIcon[c.slug] ?? Sparkles;
              return (
                <Link
                  key={c.id}
                  href={`/services?category=${c.slug}`}
                  className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition group-hover:bg-rose-500 group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold text-plum-900">{c.name}</span>
                    <span className="text-xs text-muted">{c.serviceCount} treatments</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ---------- Featured services ---------- */}
      <section className="container-page py-20 sm:py-28">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow="Signature treatments"
            title="Our most-loved services"
            intro="Thoughtfully designed treatments, transparent pricing, and specialists who take the time to listen."
          />
          <ButtonLink href="/services" variant="outline">
            View all services <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        {featured?.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map(s => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        ) : (
          <p className="card mt-12 p-8 text-center text-muted">
            Our service menu is being updated. Please check back shortly or call us on {site.phone}.
          </p>
        )}
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-sand/60 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading eyebrow="Simple online booking" title="Your appointment in three steps" />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, title: 'Choose a treatment', text: 'Browse the full menu with prices and durations up front.' },
              { icon: CalendarCheck, title: 'Pick a stylist & time', text: 'See live availability and choose the slot that suits you.' },
              { icon: ShieldCheck, title: 'Relax, it’s confirmed', text: 'Instant confirmation. Reschedule or cancel online any time.' },
            ].map((step, i) => (
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
        </div>
      </section>


      {/* ---------- Monthly packages + events ---------- */}
      {plan || bridal ? (
        <section className="container-page grid gap-6 pt-20 sm:pt-28 lg:grid-cols-2">
          {plan ? (
            <div className="card flex flex-col p-7 sm:p-10">
              <p className="eyebrow">Monthly packages</p>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">Your routine, on a members&apos; price</h2>
              <p className="mt-3 text-muted">
                Treatments included every month plus a discount on everything else, applied automatically when you book.
              </p>
              <div className="mt-7 flex-1 rounded-2xl bg-ivory p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-xl font-semibold text-plum-900">
                    {plan.name}
                    {plan.isFeatured ? (
                      <span className="ml-2 rounded-full bg-rose-100 px-2.5 py-0.5 align-middle font-sans text-[11px] font-semibold uppercase tracking-wider text-rose-600">
                        Most popular
                      </span>
                    ) : null}
                  </p>
                  <p className="font-display text-2xl font-semibold text-plum-900">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="font-sans text-sm font-normal text-muted"> / month</span>
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-ink/80 sm:grid-cols-2">
                  {plan.includes.map(i => (
                    <li key={i.serviceId} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-rose-500" /> {i.quantity}× {i.serviceName}
                    </li>
                  ))}
                  {plan.discountPercent ? (
                    <li className="flex gap-2">
                      <Percent className="mt-0.5 size-4 shrink-0 text-rose-500" /> {plan.discountPercent}% off everything else
                    </li>
                  ) : null}
                </ul>
              </div>
              <ButtonLink href="/packages" variant="outline" className="mt-7 self-start">
                Compare packages <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          ) : null}
          {bridal ? (
            <Link
              href="/events"
              className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-7 text-white shadow-soft sm:p-10"
            >
              <Photo
                src={bridal.imageUrl}
                alt=""
                kind="event"
                className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-plum-900/90 via-plum-900/40 to-transparent" />
              <div className="relative">
                <p className="eyebrow inline-flex items-center gap-2 !text-rose-300">
                  <PartyPopper className="size-4" /> Bridal &amp; events
                </p>
                <h2 className="mt-3 text-3xl leading-tight !text-white sm:text-4xl">Wedding-day beauty, perfected</h2>
                <p className="mt-3 max-w-md text-white/80">
                  Bridal glam, mehendi parties, Teej groups and photoshoots, at our studios or your venue. From{' '}
                  {formatPrice(bridal.fromPrice, bridal.currency)}.
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-white group-hover:gap-2.5" style={{ transition: 'gap 0.2s' }}>
                  Request a quote <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* ---------- Team ---------- */}
      {staff?.length ? (
        <section id="team" className="container-page scroll-mt-24 py-20 sm:py-28">
          <SectionHeading
            eyebrow="Meet the team"
            title="Specialists who love what they do"
            intro="Every member of our team is fully qualified and continues training in the latest techniques."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {staff.map(m => (
              <article key={m.id} className="card flex flex-col items-center p-7 text-center">
                <Avatar name={m.name} src={m.avatarUrl} className="size-24 text-2xl ring-4 ring-rose-50" />
                <h3 className="mt-5 text-xl">{m.name}</h3>
                <p className="text-sm font-medium text-rose-600">{m.title}</p>
                {m.bio ? <p className="mt-3 text-sm leading-relaxed text-muted">{m.bio}</p> : null}
                <ButtonLink href={`/book?staff=${m.id}`} variant="outline" size="sm" className="mt-6">
                  Book with {m.name.split(' ')[0]}
                </ButtonLink>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Recommended products ---------- */}
      {products?.length ? (
        <section className="container-page pb-20 sm:pb-28">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              align="left"
              eyebrow="Take the glow home"
              title="Recommended by our pros"
              intro="The aftercare our specialists swear by. Reserve online, pay and collect at any branch."
            />
            <ButtonLink href="/products" variant="outline">
              Visit the shop <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Reviews ---------- */}
      {reviews?.length ? (
        <section id="reviews" className="scroll-mt-24 bg-plum-900 py-20 text-white sm:py-28">
          <div className="container-page">
            <SectionHeading
              eyebrow="Kind words"
              title={<span className="text-white">Loved by our clients</span>}
              intro={
                <span className="text-white/70">
                  {rated ? `${rated.toFixed(1)} average from recent verified visits.` : 'Reviews from verified visits.'}
                </span>
              }
            />
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map(r => (
                <figure key={r.id} className="flex flex-col rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-7">
                  <Stars value={r.rating} />
                  <blockquote className="mt-4 flex-1 font-display text-lg leading-relaxed text-white/90">
                    “{r.comment}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm">
                    <Avatar name={r.author} className="size-10 text-sm" />
                    <span>
                      <span className="block font-semibold text-white">{r.author}</span>
                      <span className="text-white/60">
                        {r.service.name} with {r.staff.name.split(' ')[0]}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------- Locations ---------- */}
      {branches?.length ? (
        <section id="visit" className="container-page scroll-mt-24 py-20 sm:py-28">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              align="left"
              eyebrow="Visit us"
              title={branches.length > 1 ? `${branches.length} studios across the valley` : 'Your calm corner of the city'}
              intro="Same signature experience at every branch. Pick the one closest to you and book in seconds."
            />
            <ButtonLink href="/locations" variant="outline">
              <MapPin className="size-4" /> View on map
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {branches.map(b => (
              <BranchCard key={b.id} branch={b} timeZone={salon?.timezone ?? 'UTC'} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Closing CTA ---------- */}
      <section className="container-page pb-20 sm:pb-28">
        <div className="hero-glow relative overflow-hidden rounded-[var(--radius-card)] px-8 py-14 text-white sm:px-14">
          <Flower2 className="absolute -right-10 -top-10 size-64 text-white/5" strokeWidth={0.5} aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl !text-white sm:text-4xl">Ready for your glow-up?</h2>
              <p className="mt-3 max-w-md text-white/75">
                Same-week appointments are usually available. Questions? Call us on{' '}
                <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-white hover:underline">
                  <Phone className="size-4" /> {site.phone}
                </a>
              </p>
            </div>
            <ButtonLink href="/book" variant="light" size="lg">
              Book now <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
