'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Hourglass, Sparkles } from 'lucide-react';
import { useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Modal, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/client';
import { formatDate, formatPrice } from '@/lib/format';
import type { Membership } from '@/lib/types';

export function MyPackage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState<Membership | null>(null);
  const memberships = useQuery({ queryKey: ['memberships'], queryFn: () => api.get<Membership[]>('/memberships') });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/memberships/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberships'] });
      toast('Package request cancelled.');
      setConfirming(null);
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  if (memberships.isPending) return <Skeleton className="h-44" />;
  if (memberships.isError) {
    return (
      <div className="card p-5 text-sm text-muted">
        {errorMessage(memberships.error)}{' '}
        <button onClick={() => memberships.refetch()} className="font-semibold text-rose-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const active = memberships.data.find(m => m.status === 'ACTIVE');
  const pending = memberships.data.find(m => m.status === 'PENDING');

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">My package</h2>
        {active ? <Badge tone="success">Active</Badge> : pending ? <Badge tone="warning">Awaiting payment</Badge> : null}
      </div>

      {active ? (
        <div className="mt-4">
          <p className="font-display text-2xl font-semibold text-plum-900">{active.plan.name}</p>
          {active.endsAt ? (
            <p className="mt-0.5 text-sm text-muted">
              Valid until {formatDate(active.endsAt, undefined, { weekday: undefined, year: 'numeric' })}
            </p>
          ) : null}
          {active.usage?.length ? (
            <ul className="mt-5 space-y-4">
              {active.usage.map(u => (
                <li key={u.serviceId}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-plum-900">{u.serviceName}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {u.remaining} of {u.included} left
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand"
                    role="progressbar"
                    aria-label={`${u.serviceName}: ${u.used} of ${u.included} used`}
                    aria-valuemin={0}
                    aria-valuemax={u.included}
                    aria-valuenow={u.used}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500"
                      style={{ width: `${u.included ? (u.used / u.included) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {active.plan.discountPercent ? (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-2.5 text-sm text-plum-800">
              <Sparkles className="size-4 shrink-0 text-rose-500" /> {active.plan.discountPercent}% off everything else, applied when you book
            </p>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <div className={active ? 'mt-5 border-t border-line pt-5' : 'mt-4'}>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Hourglass className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-plum-900">{pending.plan.name}</p>
              <p className="text-sm text-muted">
                Pay {formatPrice(pending.price, pending.currency)} at{' '}
                <span className="font-medium text-plum-900">{pending.location?.name ?? 'any branch'}</span> to activate.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-danger hover:bg-danger/5"
            onClick={() => setConfirming(pending)}
          >
            Cancel request
          </Button>
        </div>
      ) : null}

      {!active && !pending ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Get treatments included every month and a member discount on everything else.
          </p>
          <ButtonLink href="/packages" variant="outline" size="sm" className="mt-4 w-full">
            Explore packages <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      ) : null}

      <Modal open={!!confirming} onClose={() => setConfirming(null)} title="Cancel package request?">
        <p className="text-sm text-muted">
          Your {confirming?.plan.name} request will be withdrawn. You can request a package again at any time.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Keep it
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => confirming && cancel.mutate(confirming.id)}>
            Yes, cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
