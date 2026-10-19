'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, PackageCheck, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { api, errorMessage } from '@/lib/client';
import { directionsUrl, formatAddress } from '@/lib/maps';
import { cn, formatDate, formatPrice } from '@/lib/format';
import type { Reservation, ReservationStatus } from '@/lib/types';

const status: Record<ReservationStatus, { label: string; tone: 'warning' | 'success' | 'plum' | 'neutral' }> = {
  PENDING: { label: 'Being prepared', tone: 'warning' },
  READY: { label: 'Ready to collect', tone: 'success' },
  COLLECTED: { label: 'Collected', tone: 'plum' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function Orders() {
  const qc = useQueryClient();
  const toast = useToast();
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const orders = useQuery({ queryKey: ['reservations'], queryFn: () => api.get<Reservation[]>('/reservations') });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/reservations/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast('Your reservation has been cancelled.');
      setCancelling(null);
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  if (orders.isPending) return <>{[0, 1].map(i => <Skeleton key={i} className="h-40" />)}</>;
  if (orders.isError) {
    return (
      <div className="card p-6 text-sm text-muted">
        {errorMessage(orders.error)}{' '}
        <button onClick={() => orders.refetch()} className="font-semibold text-rose-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }
  if (!orders.data.length) {
    return (
      <EmptyState icon={ShoppingBag} title="No product orders yet">
        Reserve products recommended by our professionals and collect them at any branch.
        <ButtonLink href="/products" size="sm" className="mt-5">
          Visit the shop
        </ButtonLink>
      </EmptyState>
    );
  }

  return (
    <>
      {orders.data.map(o => {
        const s = status[o.status];
        const ready = o.status === 'READY';
        return (
          <article
            key={o.id}
            className={cn('card overflow-hidden', ready && 'ring-2 ring-success/40', o.status === 'CANCELLED' && 'opacity-70')}
          >
            {ready ? (
              <div className="flex items-center gap-2 bg-success/10 px-5 py-2.5 text-sm font-medium text-success sm:px-6">
                <PackageCheck className="size-4" /> Ready to collect at {o.location.name}
              </div>
            ) : null}
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl">
                    {o.items.length} product{o.items.length === 1 ? '' : 's'} · {formatPrice(o.total, o.currency)}
                  </h3>
                  <p className="text-sm text-muted">Reserved {formatDate(o.createdAt, undefined, { year: 'numeric' })}</p>
                </div>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
              <ul className="mt-4 divide-y divide-line rounded-2xl bg-ivory px-4">
                {o.items.map(i => (
                  <li key={i.productId} className="flex items-center gap-3 py-3">
                    <Photo src={i.imageUrl} alt={i.name} kind="product" className="size-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-plum-900">{i.name}</span>
                      <span className="text-xs text-muted">
                        {i.brand} · {i.quantity} × {formatPrice(i.price, o.currency)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-plum-900">
                      {formatPrice(i.price * i.quantity, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-1.5 text-sm text-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                <a href={directionsUrl(o.location)} target="_blank" rel="noreferrer" className="hover:text-rose-600">
                  <span className="font-medium text-plum-900">{o.location.name}</span> · {formatAddress(o.location)}
                </a>
              </p>
              {o.note ? <p className="mt-2 text-sm italic text-muted">“{o.note}”</p> : null}
              {o.canCancel ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                  <p className="text-xs text-muted">Pay at the salon when you collect.</p>
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" onClick={() => setCancelling(o)}>
                    Cancel reservation
                  </Button>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel reservation?">
        <p className="text-sm text-muted">We&apos;ll put these products back on the shelf. You can reserve them again any time.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setCancelling(null)}>
            Keep it
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => cancelling && cancel.mutate(cancelling.id)}>
            Yes, cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
