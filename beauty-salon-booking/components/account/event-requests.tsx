'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarHeart, Clock, MapPin, PartyPopper, Phone, Users } from 'lucide-react';
import { useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { api, errorMessage } from '@/lib/client';
import { cn, formatDate, formatPrice, minutesToLabel } from '@/lib/format';
import type { EventRequest, EventRequestStatus } from '@/lib/types';

const status: Record<EventRequestStatus, { label: string; tone: 'warning' | 'rose' | 'success' | 'neutral' | 'plum' | 'danger' }> = {
  NEW: { label: 'Awaiting quote', tone: 'warning' },
  QUOTED: { label: 'Quote ready', tone: 'rose' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  DECLINED: { label: 'Declined', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  COMPLETED: { label: 'Completed', tone: 'plum' },
};

type Action = 'accept' | 'decline' | 'cancel';

const eventDay = (d: string) => `${d.slice(0, 10)}T12:00:00Z`;
const timeLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return minutesToLabel(h * 60 + m);
};

export function EventRequests() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ request: EventRequest; action: Action } | null>(null);
  const requests = useQuery({ queryKey: ['event-requests'], queryFn: () => api.get<EventRequest[]>('/event-requests') });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: Action }) => api.post(`/event-requests/${id}/${action}`),
    onSuccess: (_d, { action }) => {
      qc.invalidateQueries({ queryKey: ['event-requests'] });
      toast(
        action === 'accept'
          ? "Wonderful! Your event is confirmed. We'll be in touch to plan the details."
          : action === 'decline'
            ? 'Quote declined. Thank you for letting us know.'
            : 'Your request has been cancelled.',
      );
      setConfirm(null);
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  if (requests.isPending) return <>{[0, 1].map(i => <Skeleton key={i} className="h-44" />)}</>;
  if (requests.isError) {
    return (
      <div className="card p-6 text-sm text-muted">
        {errorMessage(requests.error)}{' '}
        <button onClick={() => requests.refetch()} className="font-semibold text-rose-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }
  if (!requests.data.length) {
    return (
      <EmptyState icon={PartyPopper} title="No event requests yet">
        Planning a wedding, Teej gathering or photoshoot? Tell us about it and we&apos;ll send a tailored quote.
        <ButtonLink href="/events" size="sm" className="mt-5">
          Explore events
        </ButtonLink>
      </EmptyState>
    );
  }

  return (
    <>
      {requests.data.map(r => {
        const s = status[r.status];
        const inactive = r.status === 'CANCELLED' || r.status === 'DECLINED';
        return (
          <article key={r.id} className={cn('card overflow-hidden', inactive && 'opacity-70')}>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
              <Photo src={r.package.imageUrl} alt={r.package.name} kind="event" className="h-32 w-full shrink-0 rounded-2xl sm:size-28" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-xl">{r.package.name}</h3>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <li className="inline-flex items-center gap-1.5">
                    <CalendarHeart className="size-4" />
                    {formatDate(eventDay(r.eventDate), 'UTC', { year: 'numeric' })}
                  </li>
                  {r.startTime ? (
                    <li className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" /> {timeLabel(r.startTime)}
                    </li>
                  ) : null}
                  <li className="inline-flex items-center gap-1.5">
                    <Users className="size-4" /> {r.guestCount} guest{r.guestCount === 1 ? '' : 's'}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Phone className="size-4" /> {r.contactPhone}
                  </li>
                </ul>
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                  <span>{r.location ? <span className="font-medium text-plum-900">{r.location.name}</span> : r.venue}</span>
                </p>
                {r.notes ? <p className="mt-2 line-clamp-2 text-sm italic text-muted">“{r.notes}”</p> : null}
                {r.status === 'NEW' ? (
                  <p className="mt-3 text-sm text-muted">We&apos;re preparing your quote, usually within one working day.</p>
                ) : null}
              </div>
            </div>

            {r.quotedPrice !== null && r.status !== 'NEW' ? (
              <div className={cn('border-t px-5 py-4 sm:px-6', r.status === 'QUOTED' ? 'border-rose-100 bg-rose-50/60' : 'border-line bg-ivory/60')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-plum-900">Our quote</p>
                  <p className="font-display text-2xl font-semibold text-plum-900">{formatPrice(r.quotedPrice, r.currency)}</p>
                </div>
                {r.quoteNote ? <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{r.quoteNote}</p> : null}
              </div>
            ) : null}

            {r.canRespond || r.canCancel ? (
              <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-6">
                {r.canRespond ? (
                  <>
                    <Button size="sm" variant="accent" onClick={() => setConfirm({ request: r, action: 'accept' })}>
                      Accept quote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirm({ request: r, action: 'decline' })}>
                      Decline
                    </Button>
                  </>
                ) : null}
                {r.canCancel ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/5 sm:ml-auto"
                    onClick={() => setConfirm({ request: r, action: 'cancel' })}
                  >
                    Cancel request
                  </Button>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.action === 'accept' ? 'Accept this quote?' : confirm?.action === 'decline' ? 'Decline this quote?' : 'Cancel this request?'
        }
      >
        {confirm ? (
          <>
            <p className="text-sm text-muted">
              {confirm.action === 'accept'
                ? `We'll reserve our artists for ${formatDate(eventDay(confirm.request.eventDate), 'UTC', { weekday: 'long', month: 'long' })} at ${formatPrice(confirm.request.quotedPrice ?? 0, confirm.request.currency)}. Our events team will call to plan the details.`
                : confirm.action === 'decline'
                  ? "We'll let the events team know. You're welcome to send a new request any time."
                  : 'Your request will be withdrawn. You can always send a new one.'}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Go back
              </Button>
              <Button
                variant={confirm.action === 'accept' ? 'accent' : 'danger'}
                loading={act.isPending}
                onClick={() => act.mutate({ id: confirm.request.id, action: confirm.action })}
              >
                {confirm.action === 'accept' ? 'Accept quote' : confirm.action === 'decline' ? 'Decline quote' : 'Cancel request'}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
