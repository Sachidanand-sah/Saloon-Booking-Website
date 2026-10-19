'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Hourglass } from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/misc';
import { api, errorMessage, RequestError } from '@/lib/client';
import { formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/maps';
import type { LocationListItem, Membership, Plan } from '@/lib/types';

export function JoinPlanButton({ plan, branches, featured }: { plan: Plan; branches: LocationListItem[]; featured?: boolean }) {
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);
  const memberships = useQuery({
    queryKey: ['memberships'],
    queryFn: () => api.get<Membership[]>('/memberships'),
    enabled: !!user,
  });
  const mine = memberships.data?.find(m => m.plan.id === plan.id && (m.status === 'ACTIVE' || m.status === 'PENDING'));

  const cls = 'mt-8 w-full';
  const variant = featured ? 'light' : 'primary';

  if (loading) return <Button variant={variant} size="lg" className={cls} disabled>Choose {plan.name}</Button>;
  if (!user) {
    return (
      <ButtonLink href="/login?next=/packages" variant={variant} size="lg" className={cls}>
        Choose {plan.name}
      </ButtonLink>
    );
  }
  if (mine) {
    return (
      <ButtonLink href="/account" variant="outline" size="lg" className={cls}>
        {mine.status === 'ACTIVE' ? <Check className="size-4" /> : <Hourglass className="size-4" />}
        {mine.status === 'ACTIVE' ? 'Your current package' : 'Awaiting payment'}
      </ButtonLink>
    );
  }
  return (
    <>
      <Button variant={variant} size="lg" className={cls} onClick={() => setOpen(true)}>
        Choose {plan.name}
      </Button>
      <JoinModal plan={plan} branches={branches} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function JoinModal({ plan, branches, open, onClose }: { plan: Plan; branches: LocationListItem[]; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [locationId, setLocationId] = useState(branches.length === 1 ? branches[0].id : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingExists, setPendingExists] = useState(false);
  const [done, setDone] = useState<Membership | null>(null);
  const branch = branches.find(b => b.id === locationId);

  const close = () => {
    onClose();
    setError(null);
    setPendingExists(false);
    setDone(null);
  };

  const submit = async () => {
    if (!locationId) {
      setError('Please choose the branch where you will pay.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ message: string; membership: Membership }>('/memberships', { planId: plan.id, locationId });
      setDone(res.membership);
      qc.invalidateQueries({ queryKey: ['memberships'] });
      toast(res.message);
    } catch (e) {
      if (e instanceof RequestError && e.code === 'MEMBERSHIP_PENDING') setPendingExists(true);
      else setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={done ? 'Package requested' : `Join ${plan.name}`}>
      {done ? (
        <div>
          <p className="text-sm leading-relaxed text-muted">
            Pay <span className="font-semibold text-plum-900">{formatPrice(done.price, done.currency)}</span> at{' '}
            <span className="font-semibold text-plum-900">{done.location?.name ?? 'any branch'}</span> on your next visit. Our team
            will activate your package straight away, and your benefits apply automatically when you book online.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={close}>Close</Button>
            <ButtonLink href="/account">View in my account</ButtonLink>
          </div>
        </div>
      ) : pendingExists ? (
        <div>
          <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
            You already have a package waiting for payment at the salon. Pay for it to activate, or cancel it from your account to
            choose a different one.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={close}>Close</Button>
            <ButtonLink href="/account">Go to my account</ButtonLink>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between rounded-2xl bg-ivory p-4">
            <span className="font-display text-lg font-semibold text-plum-900">{plan.name}</span>
            <span className="font-display text-lg font-semibold text-plum-900">
              {formatPrice(plan.price, plan.currency)}
              <span className="text-sm font-normal text-muted"> / month</span>
            </span>
          </div>
          <Select
            className="mt-5"
            label="Where will you pay?"
            value={locationId}
            onChange={e => {
              setLocationId(e.target.value);
              setError(null);
            }}
            hint={branch ? formatAddress(branch) : 'Pay at the front desk; we activate your package on the spot.'}
          >
            <option value="">Choose a branch…</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          {error ? <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
          <Button size="lg" className="mt-6 w-full" onClick={submit} loading={submitting}>
            Request package
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            Nothing to pay online. Your package starts the day you pay.{' '}
            <Link href="/rewards" className="text-rose-600 hover:underline">You&apos;ll keep earning points too.</Link>
          </p>
        </div>
      )}
    </Modal>
  );
}
