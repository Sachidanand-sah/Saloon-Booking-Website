import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck, Clock, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Avatar, ServiceArt, Stars } from '@/components/ui/misc';
import { ServiceCard } from '@/components/site/service-card';
import { getPublic } from '@/lib/server/api';
import { formatDuration, formatPrice } from '@/lib/format';
import type { LocationListItem, Review, SalonInfo, Service } from '@/lib/types';
import { formatAddress } from '@/lib/maps';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await getPublic<Service>(`/services/${(await params).slug}`);
  if (!service) return { title: 'Service not found' };
  return {
    title: service.name,
    description: `${service.description} ${formatDuration(service.durationMins)} · ${formatPrice(service.price, service.currency)}.`,
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getPublic<Service>(`/services/${slug}`);
  if (!service) notFound();

  const [reviews, related, salon, branches] = await Promise.all([
    getPublic<Review[]>(`/reviews?serviceId=${service.id}&limit=3`),
    service.category ? getPublic<Service[]>(`/services?category=${service.category.slug}`) : null,
    getPublic<SalonInfo>('/salon', 300),
    getPublic<LocationListItem[]>('/locations', 300),
  ]);
  const offeredAt = (branches ?? []).filter(b => b.serviceIds.includes(service.id));
  const others = (related ?? []).filter(s => s.id !== service.id).slice(0, 3);
  const cutoffHours = salon ? Math.round(salon.cancelCutoffMins / 60) : null;

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-sand/70 to-ivory pb-14 pt-28 sm:pt-32">
        <div className="container-page">
          <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum-900">
            <ArrowLeft className="size-4" /> All services
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="animate-fade-up">
              {service.category ? <p className="eyebrow">{service.category.name}</p> : null}
              <h1 className="mt-3 text-4xl sm:text-5xl">{service.name}</h1>
              {service.rating?.average ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <Stars value={service.rating.average} size="md" />
                  {service.rating.average.toFixed(1)} · {service.rating.count} review{service.rating.count === 1 ? '' : 's'}
                </p>
              ) : null}
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">{service.description}</p>
              <ServiceArt
                category={service.category?.slug}
                imageUrl={service.imageUrl}
                name={service.name}
                className="mt-10 h-64 w-full rounded-[var(--radius-card)] sm:h-80"
              />
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="card p-6">
                <div className="flex items-end justify-between">
                  <p className="font-display text-4xl font-semibold text-plum-900">
                    {formatPrice(service.price, service.currency)}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="size-4" /> {formatDuration(service.durationMins)}
                  </p>
                </div>
                <ButtonLink href={`/book?service=${service.slug}`} size="lg" className="mt-6 w-full">
                  Book this treatment <ArrowRight className="size-4" />
                </ButtonLink>
                <ul className="mt-6 space-y-3 border-t border-line pt-6 text-sm text-muted">
                  <li className="flex gap-3"><CalendarCheck className="size-4 shrink-0 text-rose-500" /> Instant confirmation</li>
                  <li className="flex gap-3">
                    <ShieldCheck className="size-4 shrink-0 text-rose-500" />
                    {cutoffHours !== null ? `Free cancellation up to ${cutoffHours} hours before` : 'Free cancellation'}
                  </li>
                  <li className="flex gap-3"><Sparkles className="size-4 shrink-0 text-rose-500" /> Consultation included</li>
                </ul>
              </div>

              {service.staff?.length ? (
                <div className="card mt-4 p-6">
                  <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">Performed by</h2>
                  <ul className="mt-4 space-y-3">
                    {service.staff.map(m => (
                      <li key={m.id}>
                        <Link
                          href={`/book?service=${service.slug}&staff=${m.id}`}
                          className="group flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-ivory"
                        >
                          <Avatar name={m.name} src={m.avatarUrl} className="size-11 text-sm" />
                          <span className="flex-1">
                            <span className="block font-medium text-plum-900">{m.name}</span>
                            <span className="text-xs text-muted">{m.title}</span>
                          </span>
                          <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {offeredAt.length > 1 ? (
                <div className="card mt-4 p-6">
                  <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">Available at</h2>
                  <ul className="mt-4 space-y-3">
                    {offeredAt.map(b => (
                      <li key={b.id}>
                        <Link
                          href={`/book?location=${b.slug}&service=${service.slug}`}
                          className="group -m-2 flex items-start gap-3 rounded-xl p-2 hover:bg-ivory"
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                          <span className="flex-1">
                            <span className="block font-medium text-plum-900">{b.name}</span>
                            <span className="text-xs text-muted">{formatAddress(b)}</span>
                          </span>
                          <ArrowRight className="mt-0.5 size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      {reviews?.length ? (
        <section className="container-page py-16">
          <h2 className="text-3xl">What clients say</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {reviews.map(r => (
              <figure key={r.id} className="card p-6">
                <Stars value={r.rating} />
                <blockquote className="mt-3 text-sm leading-relaxed text-ink/80">“{r.comment}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-plum-900">{r.author}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="container-page pb-20 pt-4">
          <h2 className="text-3xl">You might also like</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map(s => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
