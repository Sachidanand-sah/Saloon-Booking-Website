'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarX2, Clock, History, Star, UserRound } from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Avatar, EmptyState, Modal, Skeleton, StatusBadge } from '@/components/ui/misc';
import { PageHeader } from '@/components/site/page-header';
import { api, errorMessage } from '@/lib/client';
import { cn, formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';
import type { Booking, SalonInfo, User } from '@/lib/types';

type Scope = 'upcoming' | 'past';

export function AccountView() {
  const { user } = useSession();
  const [scope, setScope] = useState<Scope>('upcoming');
  const salon = useQuery({ queryKey: ['salon'], queryFn: () => api.get<SalonInfo>('/salon') });
  const bookings = useQuery({
    queryKey: ['bookings', scope],
    queryFn: () => api.get<Booking[]>(`/bookings?scope=${scope}`),
  });
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const tz = salon.data?.timezone;

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title={user ? `Hello, ${user.name.split(' ')[0]}` : 'My account'}
        intro="Manage your appointments, reschedule in a tap, and share how your visit went."
      >
        <ButtonLink href="/book" className="mt-8">
          <CalendarDays className="size-4" /> Book a new appointment
        </ButtonLink>
      </PageHeader>

      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="inline-flex rounded-full border border-line bg-white p-1" role="tablist">
            {(['upcoming', 'past'] as const).map(s => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium capitalize transition',
                  scope === s ? 'bg-plum-900 text-white' : 'text-plum-800 hover:bg-plum-50',
                )}
              >
                {s === 'upcoming' ? <CalendarDays className="size-4" /> : <History className="size-4" />}
                {s}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {bookings.isPending ? (
              [0, 1].map(i => <Skeleton key={i} className="h-40" />)
            ) : bookings.isError ? (
              <div className="card p-6 text-sm text-muted">
                {errorMessage(bookings.error)}{' '}
                <button onClick={() => bookings.refetch()} className="font-semibold text-rose-600 hover:underline">
                  Retry
                </button>
              </div>
            ) : bookings.data.length === 0 ? (
              <EmptyState icon={scope === 'upcoming' ? CalendarDays : History} title={scope === 'upcoming' ? 'No upcoming appointments' : 'No past visits yet'}>
                {scope === 'upcoming' ? (
                  <>
                    Treat yourself — your next appointment is a few taps away.
                    <ButtonLink href="/book" size="sm" className="mt-5">Book now</ButtonLink>
                  </>
                ) : (
                  'Your completed and cancelled appointments will appear here.'
                )}
              </EmptyState>
            ) : (
              bookings.data.map(b => (
                <BookingCard key={b.id} booking={b} tz={tz} onCancel={() => setCancelling(b)} onReview={() => setReviewing(b)} />
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {user ? <ProfileCard user={user} /> : <Skeleton className="h-64" />}
          {salon.data ? (
            <p className="px-2 text-xs leading-relaxed text-muted">
              You can cancel or reschedule online up to {Math.round(salon.data.cancelCutoffMins / 60)} hours before your
              appointment. After that, please call the salon.
            </p>
          ) : null}
        </aside>
      </div>

      <CancelModal booking={cancelling} tz={tz} onClose={() => setCancelling(null)} />
      <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function BookingCard({ booking: b, tz, onCancel, onReview }: { booking: Booking; tz?: string; onCancel: () => void; onReview: () => void }) {
  const inactive = b.status === 'CANCELLED' || b.status === 'NO_SHOW';
  return (
    <article className={cn('card flex flex-col gap-5 p-5 sm:flex-row sm:p-6', inactive && 'opacity-70')}>
      <div className="flex w-full shrink-0 items-center gap-4 rounded-2xl bg-ivory p-4 sm:w-28 sm:flex-col sm:justify-center sm:text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-rose-600">
          {formatDate(b.startAt, tz, { weekday: 'short', month: undefined, day: undefined })}
        </span>
        <span className="font-display text-3xl font-semibold text-plum-900">
          {formatDate(b.startAt, tz, { weekday: undefined, month: undefined, day: 'numeric' })}
        </span>
        <span className="text-sm text-muted">{formatDate(b.startAt, tz, { weekday: undefined, month: 'short', day: undefined })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-xl">{b.service.name}</h3>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {formatTime(b.startAt, tz)} · {formatDuration(b.service.durationMins)}</span>
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={b.staff.name} src={b.staff.avatarUrl} className="size-5 text-[8px]" /> {b.staff.name}
          </span>
          <span className="font-medium text-plum-900">{formatPrice(b.price, b.currency)}</span>
        </p>
        {b.notes ? <p className="mt-2 line-clamp-2 text-sm italic text-muted">“{b.notes}”</p> : null}
        {b.review ? (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-plum-700">
            <Star className="size-4 fill-rose-500 text-rose-500" /> You rated this visit {b.review.rating}/5
          </p>
        ) : null}

        {b.canReschedule || b.canCancel || b.canReview || inactive || b.status === 'COMPLETED' ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {b.canReschedule ? (
              <ButtonLink href={`/book?reschedule=${b.id}&service=${b.service.slug}&staff=${b.staff.id}`} variant="outline" size="sm">
                Reschedule
              </ButtonLink>
            ) : null}
            {b.canCancel ? (
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-danger hover:bg-danger/5">
                Cancel
              </Button>
            ) : null}
            {b.canReview ? (
              <Button variant="accent" size="sm" onClick={onReview}>
                <Star className="size-4" /> Leave a review
              </Button>
            ) : null}
            {inactive || b.status === 'COMPLETED' ? (
              <ButtonLink href={`/book?service=${b.service.slug}`} variant="ghost" size="sm">
                Book again
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CancelModal({ booking, tz, onClose }: { booking: Booking | null; tz?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/bookings/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast('Your appointment has been cancelled.');
      onClose();
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal open={!!booking} onClose={onClose} title="Cancel appointment?">
      {booking ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-ivory p-4">
            <CalendarX2 className="size-6 shrink-0 text-rose-500" />
            <p className="text-sm">
              <span className="font-semibold text-plum-900">{booking.service.name}</span> on{' '}
              {formatDate(booking.startAt, tz)} at {formatTime(booking.startAt, tz)}
            </p>
          </div>
          <p className="mt-4 text-sm text-muted">This frees the time for other clients. You can always book again.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>Keep appointment</Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(booking.id)}>
              Yes, cancel
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function ReviewModal({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => api.post(`/bookings/${booking!.id}/review`, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast('Thank you for your review!');
      setComment('');
      setRating(5);
      onClose();
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal open={!!booking} onClose={onClose} title="How was your visit?">
      {booking ? (
        <form
          onSubmit={e => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <p className="text-sm text-muted">
            {booking.service.name} with {booking.staff.name}
          </p>
          <fieldset className="mt-5">
            <legend className="sr-only">Rating</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  aria-label={`${i} star${i > 1 ? 's' : ''}`}
                  aria-pressed={rating === i}
                  className="rounded-lg p-1 transition hover:scale-110"
                >
                  <Star className={cn('size-8', i <= rating ? 'fill-rose-500 text-rose-500' : 'text-linen')} />
                </button>
              ))}
            </div>
          </fieldset>
          <Textarea
            className="mt-5"
            label="Tell us more (optional)"
            placeholder="What did you love? What could be better?"
            maxLength={1000}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <Button type="submit" className="mt-6 w-full" loading={submit.isPending}>
            Submit review
          </Button>
        </form>
      ) : null}
    </Modal>
  );
}

function ProfileCard({ user }: { user: User }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: (body: { name: string; phone: string | null }) => api.patch<{ user: User }>('/auth/me', body),
    onSuccess: ({ user: updated }) => {
      qc.setQueryData(['session'], { user: updated });
      toast('Profile updated.');
      setEditing(false);
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save.mutate({ name: String(f.get('name')).trim(), phone: String(f.get('phone')).trim() || null });
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-plum-900">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>
      {editing ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Input label="Full name" name="name" defaultValue={user.name} required minLength={2} />
          <Input label="Phone" name="phone" type="tel" defaultValue={user.phone ?? ''} placeholder="+1 555 000 0000" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={save.isPending}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Phone</dt>
              <dd className="font-medium text-plum-900">{user.phone ?? 'Not added'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Member since</dt>
              <dd className="font-medium text-plum-900">
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </dd>
            </div>
          </dl>
          <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        </>
      )}
    </div>
  );
}
