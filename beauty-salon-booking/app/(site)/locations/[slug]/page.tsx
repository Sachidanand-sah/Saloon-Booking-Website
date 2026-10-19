import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/misc';
import { BranchPhoto, MapEmbed } from '@/components/site/branch-card';
import { HoursList } from '@/components/site/footer';
import { ServiceCard } from '@/components/site/service-card';
import { getPublic } from '@/lib/server/api';
import { cn } from '@/lib/format';
import { directionsUrl, formatAddress, mapEmbedUrl, telHref, todayHours } from '@/lib/maps';
import type { LocationDetail, SalonInfo } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const branch = await getPublic<LocationDetail>(`/locations/${(await params).slug}`);
  if (!branch) return { title: 'Branch not found' };
  return {
    title: branch.name,
    description: `${branch.name}, ${formatAddress(branch)}. Opening hours, directions, team and online booking.`,
  };
}

export default async function BranchPage({ params }: Props) {
  const { slug } = await params;
  const [branch, salon] = await Promise.all([
    getPublic<LocationDetail>(`/locations/${slug}`),
    getPublic<SalonInfo>('/salon', 300),
  ]);
  if (!branch) notFound();
  const today = todayHours(branch.openingHours, salon?.timezone ?? 'UTC');

  return (
    <>
      <section className="relative overflow-hidden bg-plum-900 pb-12 pt-28 text-white sm:pt-32">
        <BranchPhoto src={branch.imageUrl} name={branch.name} className="absolute inset-0 h-full w-full opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-900 via-plum-900/70 to-plum-900/30" aria-hidden />
        <div className="container-page relative animate-fade-up">
          <Link href="/locations" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
            <ArrowLeft className="size-4" /> All locations
          </Link>
          <h1 className="mt-6 max-w-3xl text-4xl !text-white sm:text-6xl">{branch.name}</h1>
          <p className="mt-4 flex items-center gap-2 text-white/80">
            <MapPin className="size-5 text-rose-300" /> {formatAddress(branch)}
          </p>
          <p className={cn('mt-2 flex items-center gap-2 text-sm', today.open ? 'text-rose-100' : 'text-white/60')}>
            <Clock className="size-4" /> {today.label}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/book?location=${branch.slug}`} variant="light" size="lg">
              Book at this branch <ArrowRight className="size-4" />
            </ButtonLink>
            <a
              href={directionsUrl(branch)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/25 px-7 text-base font-medium text-white hover:bg-white/10"
            >
              <Navigation className="size-4" /> Get directions
            </a>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          {branch.description ? <p className="max-w-2xl text-lg leading-relaxed text-ink/80">{branch.description}</p> : null}

          <div className="card overflow-hidden">
            <MapEmbed src={mapEmbedUrl(branch)} title={`Map of ${branch.name}`} className="h-80 sm:h-96" />
          </div>

          {branch.staff.length ? (
            <div>
              <h2 className="text-3xl">Meet the team</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {branch.staff.map(m => (
                  <Link
                    key={m.id}
                    href={`/book?location=${branch.slug}&staff=${m.id}`}
                    className="card group flex items-center gap-4 p-4 transition hover:shadow-lift"
                  >
                    <Avatar name={m.name} src={m.avatarUrl} className="size-14 shrink-0 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold text-plum-900">{m.name}</span>
                      <span className="text-sm text-rose-600">{m.title}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">
              <Clock className="size-4 text-rose-500" /> Opening hours
            </h2>
            <HoursList hours={branch.openingHours} className="mt-4 text-sm text-muted" />
          </div>
          <div className="card space-y-3 p-6 text-sm">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">Contact</h2>
            <p className="flex gap-2.5 text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" /> {formatAddress(branch)}
            </p>
            {branch.phone ? (
              <a href={telHref(branch.phone)} className="flex gap-2.5 text-plum-900 hover:text-rose-600">
                <Phone className="mt-0.5 size-4 shrink-0 text-rose-500" /> {branch.phone}
              </a>
            ) : null}
            {branch.email ? (
              <a href={`mailto:${branch.email}`} className="flex gap-2.5 text-plum-900 hover:text-rose-600">
                <Mail className="mt-0.5 size-4 shrink-0 text-rose-500" /> {branch.email}
              </a>
            ) : null}
          </div>
        </aside>
      </section>

      {branch.services.length ? (
        <section className="bg-sand/60 py-16">
          <div className="container-page">
            <h2 className="text-3xl">Treatments at this branch</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {branch.services.map(s => (
                <ServiceCard key={s.id} service={s} bookHref={`/book?location=${branch.slug}&service=${s.slug}`} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
