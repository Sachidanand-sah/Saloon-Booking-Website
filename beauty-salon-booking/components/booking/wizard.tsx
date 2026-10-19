'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Moon,
  Sun,
  Sunrise,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Avatar, ServiceArt, Skeleton } from '@/components/ui/misc';
import { api, RequestError, errorMessage } from '@/lib/client';
import {
  addDays,
  cn,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
  hourIn,
  isoWeekday,
  todayIn,
} from '@/lib/format';
import type { Availability, Booking, Category, SalonInfo, Service, Staff } from '@/lib/types';

type Props = { services: Service[]; categories: Category[]; staff: Staff[]; salon: SalonInfo };

const STEPS = ['Treatment', 'Specialist', 'Date & time', 'Confirm'] as const;
const ANY = 'any';

export function BookingWizard({ services, categories, staff, salon }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const toast = useToast();
  const qc = useQueryClient();

  const service = services.find(s => s.slug === params.get('service') || s.id === params.get('service'));
  const staffParam = params.get('staff');
  const date = params.get('date');
  const slot = params.get('slot');
  const rescheduleId = params.get('reschedule');

  const stylists = useMemo(
    () => (service ? staff.filter(m => m.services.some(s => s.id === service.id)) : []),
    [service, staff],
  );
  const chosenStaff = staffParam && staffParam !== ANY ? staff.find(m => m.id === staffParam) : undefined;

  // The step is derived from what has been chosen so far, so links and the back button just work.
  const step = !service ? 0 : !staffParam ? 1 : !slot ? 2 : 3;

  const go = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router[replace ? 'replace' : 'push'](`${pathname}?${next.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When only one specialist offers the service there is nothing to choose, so skip step 2.
  // replace() rather than push() keeps the back button from bouncing into this redirect.
  useEffect(() => {
    if (service && !staffParam && stylists.length === 1) go({ staff: stylists[0].id }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, staffParam, stylists.length]);

  const backTo = (target: number) => {
    if (target === 0) go({ service: null, staff: rescheduleId ? staffParam : null, date: null, slot: null });
    if (target === 1) go({ staff: null, slot: null });
    if (target === 2) go({ slot: null });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 animate-fade-up">
        <p className="eyebrow">{rescheduleId ? 'Reschedule appointment' : 'Online booking'}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{rescheduleId ? 'Choose a new time' : 'Book your appointment'}</h1>
      </div>

      <Stepper step={step} onSelect={i => i < step && !(rescheduleId && i === 0) && backTo(i)} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 0 ? (
            <ServiceStep
              services={chosenStaff ? services.filter(s => chosenStaff.services.some(x => x.id === s.id)) : services}
              categories={categories}
              forStaff={chosenStaff}
              onPick={s => go({ service: s.slug })}
            />
          ) : null}
          {step === 1 && service ? (
            <StaffStep stylists={stylists} onPick={id => go({ staff: id })} onBack={() => backTo(0)} hideBack={!!rescheduleId} />
          ) : null}
          {step === 2 && service ? (
            <TimeStep
              service={service}
              staffId={chosenStaff?.id}
              salon={salon}
              date={date}
              onDate={d => go({ date: d })}
              onPick={s => go({ slot: s })}
              onBack={() => backTo(stylists.length > 1 ? 1 : 0)}
            />
          ) : null}
          {step === 3 && service && slot ? (
            <ConfirmStep
              service={service}
              staff={chosenStaff}
              slot={slot}
              salon={salon}
              signedIn={!!user}
              sessionLoading={sessionLoading}
              rescheduleId={rescheduleId}
              currentUrl={`${pathname}?${params.toString()}`}
              onBack={() => backTo(2)}
              onConflict={msg => {
                toast(msg, 'error');
                qc.invalidateQueries({ queryKey: ['availability'] });
                go({ slot: null });
              }}
              onDone={(booking, rescheduled) => {
                qc.invalidateQueries({ queryKey: ['bookings'] });
                if (rescheduled) {
                  toast('Your appointment has been rescheduled.');
                  router.push('/account');
                } else {
                  router.push(`/book/success?id=${booking.id}`);
                }
              }}
            />
          ) : null}
        </div>

        <Summary service={service} staff={chosenStaff} anyStaff={staffParam === ANY} slot={slot} salon={salon} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Stepper({ step, onSelect }: { step: number; onSelect: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Booking progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onSelect(i)}
            disabled={i >= step}
            aria-current={i === step ? 'step' : undefined}
            className="flex items-center gap-2 text-left disabled:cursor-default"
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition',
                i < step && 'bg-rose-500 text-white',
                i === step && 'bg-plum-900 text-white ring-4 ring-plum-100',
                i > step && 'border border-line bg-white text-muted',
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn('hidden text-sm font-medium md:block', i === step ? 'text-plum-900' : 'text-muted')}>
              {label}
            </span>
          </button>
          {i < STEPS.length - 1 ? <span className={cn('h-px flex-1', i < step ? 'bg-rose-300' : 'bg-line')} /> : null}
        </li>
      ))}
    </ol>
  );
}

function StepCard({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <section className="card animate-fade-up p-5 sm:p-8">
      {onBack ? (
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum-900">
          <ArrowLeft className="size-4" /> Back
        </button>
      ) : null}
      <h2 className="text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

// ---------- Step 1: service ----------

function ServiceStep({
  services,
  categories,
  forStaff,
  onPick,
}: {
  services: Service[];
  categories: Category[];
  forStaff?: Staff;
  onPick: (s: Service) => void;
}) {
  const [cat, setCat] = useState('all');
  const usedCats = categories.filter(c => services.some(s => s.category?.slug === c.slug));
  const list = cat === 'all' ? services : services.filter(s => s.category?.slug === cat);

  return (
    <StepCard
      title="Choose a treatment"
      subtitle={forStaff ? `Treatments offered by ${forStaff.name}` : 'Select the service you would like to book.'}
    >
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ slug: 'all', name: 'All' }, ...usedCats].map(c => (
          <button
            key={c.slug}
            onClick={() => setCat(c.slug)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
              cat === c.slug ? 'border-plum-900 bg-plum-900 text-white' : 'border-line text-plum-800 hover:border-plum-300',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      <ul className="grid gap-3">
        {list.map(s => (
          <li key={s.id}>
            <button
              onClick={() => onPick(s)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-rose-300 hover:shadow-soft sm:p-4"
            >
              <ServiceArt category={s.category?.slug} imageUrl={s.imageUrl} name={s.name} className="size-16 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold text-plum-900">{s.name}</span>
                <span className="mt-0.5 line-clamp-1 text-sm text-muted">{s.description}</span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="size-3.5" /> {formatDuration(s.durationMins)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-display text-lg font-semibold text-plum-900">{formatPrice(s.price, s.currency)}</span>
                <ChevronRight className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </StepCard>
  );
}

// ---------- Step 2: stylist ----------

function StaffStep({ stylists, onPick, onBack, hideBack }: { stylists: Staff[]; onPick: (id: string) => void; onBack: () => void; hideBack?: boolean }) {
  return (
    <StepCard title="Choose your specialist" subtitle="Pick someone you love, or let us match you with the first available." onBack={hideBack ? undefined : onBack}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => onPick(ANY)}
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 p-4 text-left transition hover:border-rose-500 hover:bg-rose-50"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-soft">
            <Users className="size-6" />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold text-plum-900">Any available</span>
            <span className="text-sm text-muted">Most choice of times</span>
          </span>
        </button>
        {stylists.map(m => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-rose-300 hover:shadow-soft"
          >
            <Avatar name={m.name} src={m.avatarUrl} className="size-14 shrink-0 text-lg" />
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold text-plum-900">{m.name}</span>
              <span className="text-sm text-muted">{m.title}</span>
            </span>
          </button>
        ))}
      </div>
    </StepCard>
  );
}

// ---------- Step 3: date & time ----------

const periods: { label: string; icon: LucideIcon; test: (h: number) => boolean }[] = [
  { label: 'Morning', icon: Sunrise, test: h => h < 12 },
  { label: 'Afternoon', icon: Sun, test: h => h >= 12 && h < 17 },
  { label: 'Evening', icon: Moon, test: h => h >= 17 },
];

function TimeStep({
  service,
  staffId,
  salon,
  date,
  onDate,
  onPick,
  onBack,
}: {
  service: Service;
  staffId?: string;
  salon: SalonInfo;
  date: string | null;
  onDate: (d: string) => void;
  onPick: (slot: string) => void;
  onBack: () => void;
}) {
  const tz = salon.timezone;
  const today = todayIn(tz);
  const days = useMemo(
    () => Array.from({ length: Math.min(salon.bookingWindowDays, 30) }, (_, i) => addDays(today, i)),
    [today, salon.bookingWindowDays],
  );
  const isClosed = (d: string) => {
    const h = salon.openingHours.find(o => o.dayOfWeek === isoWeekday(d));
    return !h || h.open === null;
  };
  const selected = date && days.includes(date) ? date : days.find(d => !isClosed(d)) ?? today;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['availability', service.id, staffId ?? ANY, selected],
    queryFn: () =>
      api.get<Availability>(
        `/availability?serviceId=${service.id}&date=${selected}${staffId ? `&staffId=${staffId}` : ''}`,
      ),
  });

  const nextOpen = (from: string) => days.find(d => d > from && !isClosed(d));

  return (
    <StepCard title="Pick a date & time" subtitle={`Times shown in salon time (${tz.replace('_', ' ')}).`} onBack={onBack}>
      <div className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8" role="listbox" aria-label="Date">
        {days.map(d => {
          const closed = isClosed(d);
          const active = d === selected;
          const at = `${d}T12:00:00Z`;
          return (
            <button
              key={d}
              role="option"
              aria-selected={active}
              disabled={closed}
              onClick={() => onDate(d)}
              className={cn(
                'flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-3 transition',
                active && 'border-plum-900 bg-plum-900 text-white shadow-soft',
                !active && !closed && 'border-line bg-white text-plum-900 hover:border-rose-300',
                closed && 'cursor-not-allowed border-transparent bg-sand/50 text-muted/50',
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                {d === today ? 'Today' : formatDate(at, 'UTC', { weekday: 'short', month: undefined, day: undefined })}
              </span>
              <span className="mt-1 font-display text-2xl font-semibold">{Number(d.slice(8))}</span>
              <span className="text-[11px] opacity-70">{formatDate(at, 'UTC', { weekday: undefined, month: 'short', day: undefined })}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 min-h-48">
        {isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-ivory p-6 text-center text-sm text-muted">
            We couldn&apos;t load times.{' '}
            <button onClick={() => refetch()} className="font-semibold text-rose-600 hover:underline">
              Try again
            </button>
          </div>
        ) : data.slots.length === 0 ? (
          <div className="rounded-2xl bg-ivory p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-rose-300" />
            <p className="mt-3 font-display text-xl text-plum-900">Fully booked on this day</p>
            <p className="mt-1 text-sm text-muted">Please choose another date{staffId ? ' or specialist' : ''}.</p>
            {nextOpen(selected) ? (
              <Button variant="outline" size="sm" className="mt-5" onClick={() => onDate(nextOpen(selected)!)}>
                Check next day
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {periods.map(p => {
              const slots = data.slots.filter(s => p.test(hourIn(s.startAt, tz)));
              if (!slots.length) return null;
              return (
                <div key={p.label}>
                  <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-plum-900">
                    <p.icon className="size-4 text-rose-500" /> {p.label}
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {slots.map(s => (
                      <button
                        key={s.startAt}
                        onClick={() => onPick(s.startAt)}
                        className="h-11 rounded-xl border border-line bg-white text-sm font-medium tabular-nums text-plum-900 transition hover:border-rose-500 hover:bg-rose-50"
                      >
                        {formatTime(s.startAt, tz)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StepCard>
  );
}

// ---------- Step 4: confirm ----------

function ConfirmStep({
  service,
  staff,
  slot,
  salon,
  signedIn,
  sessionLoading,
  rescheduleId,
  currentUrl,
  onBack,
  onConflict,
  onDone,
}: {
  service: Service;
  staff?: Staff;
  slot: string;
  salon: SalonInfo;
  signedIn: boolean;
  sessionLoading: boolean;
  rescheduleId: string | null;
  currentUrl: string;
  onBack: () => void;
  onConflict: (message: string) => void;
  onDone: (b: Booking, rescheduled: boolean) => void;
}) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = encodeURIComponent(currentUrl);
  const cutoffHours = Math.round(salon.cancelCutoffMins / 60);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = rescheduleId
        ? await api.post<{ booking: Booking }>(`/bookings/${rescheduleId}/reschedule`, { startAt: slot, staffId: staff?.id })
        : await api.post<{ booking: Booking }>('/bookings', {
            serviceId: service.id,
            staffId: staff?.id,
            startAt: slot,
            notes: notes.trim() || undefined,
          });
      onDone(res.booking, !!rescheduleId);
    } catch (e) {
      if (e instanceof RequestError && e.status === 409) onConflict(e.message);
      else setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <StepCard title={rescheduleId ? 'Confirm new time' : 'Review & confirm'} onBack={onBack}>
      <div className="rounded-2xl bg-ivory p-5">
        <p className="font-display text-2xl text-plum-900">
          {formatDate(slot, salon.timezone, { weekday: 'long', month: 'long' })}
        </p>
        <p className="mt-1 text-lg text-plum-700">
          {formatTime(slot, salon.timezone)} – {formatTime(new Date(new Date(slot).getTime() + service.durationMins * 60_000).toISOString(), salon.timezone)}
        </p>
        <p className="mt-3 text-sm text-muted">
          {service.name} · {staff ? `with ${staff.name}` : 'first available specialist'}
        </p>
      </div>

      {sessionLoading ? (
        <Skeleton className="mt-6 h-32" />
      ) : signedIn ? (
        <>
          {!rescheduleId ? (
            <Textarea
              className="mt-6"
              label="Anything we should know? (optional)"
              placeholder="Allergies, hair length, special occasion…"
              maxLength={500}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          ) : null}
          {error ? <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
          <Button size="lg" className="mt-6 w-full" onClick={submit} loading={submitting}>
            {rescheduleId ? 'Confirm new time' : `Confirm booking · ${formatPrice(service.price, service.currency)}`}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            Pay at the salon. Free cancellation up to {cutoffHours} hours before your appointment.
          </p>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-6 text-center">
          <p className="font-display text-xl text-plum-900">Almost there!</p>
          <p className="mt-1 text-sm text-muted">Log in or create a free account to confirm — your selection is saved.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={`/login?next=${next}`}>Log in</ButtonLink>
            <ButtonLink href={`/signup?next=${next}`} variant="outline">
              Create account
            </ButtonLink>
          </div>
        </div>
      )}
    </StepCard>
  );
}

// ---------- Summary ----------

function Summary({
  service,
  staff,
  anyStaff,
  slot,
  salon,
}: {
  service?: Service;
  staff?: Staff;
  anyStaff: boolean;
  slot: string | null;
  salon: SalonInfo;
}) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="card overflow-hidden">
        {service ? (
          <ServiceArt category={service.category?.slug} imageUrl={service.imageUrl} name={service.name} className="h-28 w-full" />
        ) : null}
        <div className="p-6">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">Your appointment</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <Row label="Treatment" value={service?.name} />
            <Row label="Specialist" value={staff?.name ?? (anyStaff ? 'First available' : undefined)} />
            <Row
              label="When"
              value={slot ? `${formatDate(slot, salon.timezone)}, ${formatTime(slot, salon.timezone)}` : undefined}
            />
            <Row label="Duration" value={service ? formatDuration(service.durationMins) : undefined} />
          </dl>
          <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-3xl font-semibold text-plum-900">
              {service ? formatPrice(service.price, service.currency) : '—'}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 hidden px-2 text-xs leading-relaxed text-muted lg:block">
        Need help? <Link href="/#visit" className="font-medium text-rose-600 hover:underline">Contact the salon</Link>.
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-right font-medium', value ? 'text-plum-900' : 'text-muted/60')}>{value ?? 'Not selected'}</dd>
    </div>
  );
}
