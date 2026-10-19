'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Button, ButtonLink } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { api, errorMessage } from '@/lib/client';
import { bag, bagCount, bagTotal, useBag } from '@/lib/bag';
import { formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/maps';
import type { LocationListItem, Reservation } from '@/lib/types';
import { QuantityStepper } from './add-to-bag';

export function BagView({ branches }: { branches: LocationListItem[] }) {
  const items = useBag();
  const { user, loading } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState(branches.length === 1 ? branches[0].id : '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Reservation | null>(null);

  const currency = items[0]?.currency ?? 'NPR';
  const branch = branches.find(b => b.id === locationId);

  const reserve = async () => {
    if (!locationId) {
      setError('Please choose the branch where you would like to collect.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ message: string; reservation: Reservation }>('/reservations', {
        locationId,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        note: note.trim() || undefined,
      });
      bag.clear();
      setNote('');
      setDone(res.reservation);
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast(res.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card mx-auto max-w-lg animate-fade-up p-8 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h2 className="mt-6 text-3xl">Reserved for you</h2>
        <p className="mt-3 text-muted">
          We&apos;ll set your products aside at <span className="font-semibold text-plum-900">{done.location.name}</span>. Pay
          when you collect: {formatPrice(done.total, done.currency)}. We&apos;ll mark it &ldquo;Ready to collect&rdquo; in your account.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/account?tab=orders">View my orders</ButtonLink>
          <ButtonLink href="/products" variant="ghost">
            Keep browsing
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState icon={ShoppingBag} title="Your bag is empty">
        Browse the products our professionals use and recommend, then reserve them to pay and collect at any branch.
        <ButtonLink href="/products" size="sm" className="mt-5">
          Shop recommended products
        </ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="card divide-y divide-line self-start" aria-label="Items in your bag">
        {items.map(i => (
          <div key={i.productId} className="flex gap-4 p-4 sm:p-5">
            <Link href={`/products/${i.slug}`} className="shrink-0 overflow-hidden rounded-xl" tabIndex={-1} aria-hidden>
              <Photo src={i.imageUrl} alt={i.name} kind="product" className="size-20 sm:size-24" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{i.brand}</p>
                  <Link href={`/products/${i.slug}`} className="mt-0.5 block font-display text-lg font-semibold leading-snug text-plum-900 hover:text-rose-600">
                    {i.name}
                  </Link>
                  <p className="text-sm text-muted">{formatPrice(i.price, i.currency)} each</p>
                </div>
                <p className="shrink-0 font-display text-lg font-semibold text-plum-900">
                  {formatPrice(i.price * i.quantity, i.currency)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <QuantityStepper
                  value={i.quantity}
                  onChange={n => bag.setQuantity(i.productId, n)}
                  label={`Quantity of ${i.name}`}
                />
                <button
                  onClick={() => bag.remove(i.productId)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-danger/5 hover:text-danger"
                  aria-label={`Remove ${i.name}`}
                >
                  <Trash2 className="size-4" /> <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="card p-6">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">Reserve for pickup</h2>
          <div className="mt-5 flex items-end justify-between border-b border-line pb-5">
            <span className="text-sm text-muted">
              {bagCount(items)} item{bagCount(items) === 1 ? '' : 's'}
            </span>
            <span className="font-display text-3xl font-semibold text-plum-900">{formatPrice(bagTotal(items), currency)}</span>
          </div>

          {loading ? (
            <Skeleton className="mt-5 h-40" />
          ) : user ? (
            <div className="mt-5 space-y-4">
              <Select
                label="Collect from"
                value={locationId}
                onChange={e => {
                  setLocationId(e.target.value);
                  setError(null);
                }}
                hint={branch ? formatAddress(branch) : undefined}
              >
                <option value="">Choose a branch…</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Note (optional)"
                placeholder="e.g. I'll collect on Saturday after my appointment"
                maxLength={500}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
              <Button size="lg" className="w-full" onClick={reserve} loading={submitting}>
                <Store className="size-4" /> Reserve for pickup
              </Button>
              <p className="text-center text-xs text-muted">No payment now. Pay at the salon when you collect.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-center">
              <p className="font-display text-lg text-plum-900">Log in to reserve</p>
              <p className="mt-1 text-sm text-muted">Your bag is saved on this device.</p>
              <div className="mt-4 flex flex-col gap-2">
                <ButtonLink href="/login?next=/bag">Log in</ButtonLink>
                <ButtonLink href="/signup?next=/bag" variant="outline">
                  Create account
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
        <Link href="/products" className="mt-4 inline-flex items-center gap-1 px-2 text-sm font-semibold text-rose-600 hover:gap-2">
          Continue shopping <ArrowRight className="size-4" />
        </Link>
      </aside>
    </div>
  );
}
