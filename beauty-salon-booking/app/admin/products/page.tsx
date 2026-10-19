'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CircleCheck, Mail, MapPin, PackageCheck, Pencil, Phone, Plus, Power, PowerOff, ShoppingBag, Star, X } from 'lucide-react';
import { Checkbox, ErrorState, PageHeader, slugify, useAdminLocations, useAdminServices, useAdminStaff } from '@/components/admin/common';
import {
  ConfirmDialog,
  FilterChips,
  ImagePreview,
  RESERVATION_STATUS,
  SearchBox,
  StatusPill,
  Tabs,
  extraKeys,
  formatDay,
  useAdminInbox,
  useDebounced,
} from '@/components/admin/extras';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, fieldErrors } from '@/components/ui/field';
import { Avatar, Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn, formatPrice } from '@/lib/format';
import type { Product, Reservation, ReservationStatus } from '@/lib/types';

type Tab = 'reservations' | 'catalogue';

export default function AdminProductsPage() {
  const [tab, setTab] = useState<Tab>('reservations');
  const [editing, setEditing] = useState<{ product?: Product } | null>(null);
  const inbox = useAdminInbox();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Grow"
        title="Shop"
        intro="Prepare click-and-collect reservations and manage the products your team recommends."
        action={
          tab === 'catalogue' ? (
            <Button variant="accent" onClick={() => setEditing({})}>
              <Plus className="size-4" aria-hidden />
              New product
            </Button>
          ) : undefined
        }
      />
      <Tabs
        label="Shop sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'reservations', label: 'Reservations', count: inbox.data?.pendingReservations },
          { key: 'catalogue', label: 'Catalogue' },
        ]}
      />
      {tab === 'reservations' ? <Reservations /> : <Catalogue onEdit={product => setEditing({ product })} />}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.product ? `Edit ${editing.product.name}` : 'New product'}
        wide
      >
        {editing ? <ProductForm key={editing.product?.id ?? 'new'} product={editing.product} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}

// ============================================================================
// Reservations
// ============================================================================

type StatusFilter = ReservationStatus | 'ALL';

function Reservations() {
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [locationId, setLocationId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const inbox = useAdminInbox();
  const locations = useAdminLocations();

  const params = new URLSearchParams();
  if (status !== 'ALL') params.set('status', status);
  if (locationId) params.set('locationId', locationId);
  if (q) params.set('q', q);
  const qs = params.toString();

  const list = useQuery({
    queryKey: [...extraKeys.reservations, qs],
    queryFn: () => api.get<Reservation[]>(`/admin/reservations?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <section className="space-y-5" aria-label="Reservations">
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-plum-900">Status</p>
          <FilterChips
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PENDING', label: 'To prepare', count: inbox.data?.pendingReservations, highlight: true },
              { value: 'READY', label: 'Ready' },
              { value: 'COLLECTED', label: 'Collected' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Branch" value={locationId} onChange={e => setLocationId(e.target.value)}>
            <option value="">All branches</option>
            {locations.data?.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </Select>
          <SearchBox value={search} onChange={setSearch} />
        </div>
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={status === 'PENDING' ? 'Nothing to prepare' : 'No reservations found'}>
          {status === 'PENDING'
            ? 'Products customers reserve online show up here so the branch can set them aside.'
            : 'Try another status or branch, or clear the search.'}
        </EmptyState>
      ) : (
        <ul className={cn('grid gap-4 lg:grid-cols-2', list.isPlaceholderData && 'opacity-60')}>
          {list.data.map(r => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReservationCard({ reservation: r }: { reservation: Reservation }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const name = r.customer?.name ?? 'Customer';

  const update = useMutation({
    mutationFn: (status: ReservationStatus) => api.patch<{ reservation: Reservation }>(`/admin/reservations/${r.id}`, { status }),
    onSuccess: (_d, status) => {
      toast(
        status === 'READY'
          ? `${name}’s order is ready to collect.`
          : status === 'COLLECTED'
            ? `${name}’s order marked collected.`
            : `${name}’s reservation was cancelled.`,
      );
      setConfirmCancel(false);
      return qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });
  const next = update.isPending ? update.variables : undefined;
  const count = r.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <li className={cn('card flex flex-col overflow-hidden', r.status === 'PENDING' && 'border-warning/40')}>
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5 text-sm">
            <p className="truncate text-lg font-medium leading-snug text-plum-900">{name}</p>
            {r.customer?.phone ? (
              <a href={`tel:${r.customer.phone}`} className="flex items-center gap-1.5 text-muted hover:text-rose-600">
                <Phone className="size-3.5 shrink-0" aria-hidden />
                {r.customer.phone}
              </a>
            ) : null}
            {r.customer?.email ? (
              <a href={`mailto:${r.customer.email}`} className="flex min-w-0 items-center gap-1.5 text-muted hover:text-rose-600">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{r.customer.email}</span>
              </a>
            ) : null}
          </div>
          <StatusPill map={RESERVATION_STATUS} status={r.status} />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {r.location.name}
          </span>
          <span>Reserved {formatDay(r.createdAt, { weekday: undefined, hour: 'numeric', minute: '2-digit' })}</span>
        </p>

        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {r.items.map(i => (
            <li key={i.productId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <ImagePreview src={i.imageUrl ?? ''} alt="" className="size-10 shrink-0 rounded-lg text-[0.5rem]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-plum-900">{i.name}</p>
                <p className="truncate text-xs text-muted">{i.brand}</p>
              </div>
              <p className="shrink-0 text-right text-muted">
                {i.quantity} × {formatPrice(i.price, r.currency)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-baseline justify-between text-sm">
          <span className="text-muted">
            {count} item{count === 1 ? '' : 's'} · pay at collection
          </span>
          <span className="font-semibold text-plum-900">{formatPrice(r.total, r.currency)}</span>
        </p>
        {r.note ? <p className="mt-3 rounded-xl bg-ivory px-3.5 py-2 text-sm text-muted">“{r.note}”</p> : null}
      </div>

      {r.status === 'PENDING' || r.status === 'READY' ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
          <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => setConfirmCancel(true)}>
            <Ban className="size-4" aria-hidden />
            Cancel
          </Button>
          {r.status === 'PENDING' ? (
            <Button size="sm" variant="accent" loading={next === 'READY'} disabled={update.isPending} onClick={() => update.mutate('READY')}>
              {next === 'READY' ? null : <PackageCheck className="size-4" aria-hidden />}
              Mark ready
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              loading={next === 'COLLECTED'}
              disabled={update.isPending}
              onClick={() => update.mutate('COLLECTED')}
            >
              {next === 'COLLECTED' ? null : <CircleCheck className="size-4" aria-hidden />}
              Mark collected
            </Button>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel reservation?"
        confirmLabel="Cancel reservation"
        tone="danger"
        loading={update.isPending}
        onConfirm={() => update.mutate('CANCELLED')}
      >
        {name}’s reservation of {count} item{count === 1 ? '' : 's'} ({formatPrice(r.total, r.currency)}) at {r.location.name} will be
        cancelled and the products released.
      </ConfirmDialog>
    </li>
  );
}

// ============================================================================
// Catalogue
// ============================================================================

function Catalogue({ onEdit }: { onEdit: (p: Product) => void }) {
  const list = useQuery({ queryKey: extraKeys.products, queryFn: () => api.get<Product[]>('/admin/products') });
  const [category, setCategory] = useState('all');
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  if (list.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }
  if (list.data.length === 0) {
    return (
      <EmptyState icon={ShoppingBag} title="No products yet">
        Add the products your stylists use and recommend so customers can reserve them.
      </EmptyState>
    );
  }
  const categories = [...new Set(list.data.map(p => p.category))].sort();
  const shown = list.data.filter(p => category === 'all' || p.category === category);
  return (
    <div className="space-y-5">
      {categories.length > 1 ? (
        <FilterChips
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All' },
            ...categories.map(c => ({ value: c, label: c, count: list.data.filter(p => p.category === c).length })),
          ]}
        />
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(p => (
          <ProductCard key={p.id} product={p} onEdit={() => onEdit(p)} />
        ))}
      </ul>
    </div>
  );
}

function ProductCard({ product: p, onEdit }: { product: Product; onEdit: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: () => (p.isActive ? api.delete<void>(`/admin/products/${p.id}`) : api.patch(`/admin/products/${p.id}`, { isActive: true })),
    onSuccess: () => {
      toast(p.isActive ? `${p.name} hidden from the shop.` : `${p.name} is back in the shop.`);
      return qc.invalidateQueries({ queryKey: extraKeys.products });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <li className={cn('card flex flex-col overflow-hidden transition hover:shadow-lift', !p.isActive && 'opacity-75')}>
      <div className="flex gap-4 p-4">
        <ImagePreview src={p.imageUrl ?? ''} alt={p.name} className="size-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-rose-600">{p.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 text-lg leading-snug">{p.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span>{p.category}</span>
            <span className="font-semibold text-plum-900">{formatPrice(p.price, p.currency)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!p.isActive ? <Badge>Inactive</Badge> : p.inStock ? <Badge tone="success">In stock</Badge> : <Badge tone="warning">Out of stock</Badge>}
            {p.isFeatured ? (
              <Badge tone="rose">
                <Star className="size-3 fill-current" aria-hidden />
                Featured
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      {p.recommendedBy.length > 0 ? (
        <div className="flex items-center gap-2 px-4 pb-3 text-xs text-muted">
          <span className="flex -space-x-2">
            {p.recommendedBy.slice(0, 3).map(s => (
              <Avatar key={s.id} name={s.name} src={s.avatarUrl} className="size-6 text-[0.55rem] ring-2 ring-white" />
            ))}
          </span>
          <span className="truncate">Recommended by {p.recommendedBy.map(s => s.name.split(' ')[0]).join(', ')}</span>
        </div>
      ) : null}
      <div className="mt-auto flex justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          loading={toggle.isPending}
          onClick={() => {
            if (!p.isActive || window.confirm(`Hide “${p.name}” from the shop? Existing reservations are kept.`)) toggle.mutate();
          }}
        >
          {toggle.isPending ? null : p.isActive ? <PowerOff className="size-4" aria-hidden /> : <Power className="size-4" aria-hidden />}
          {p.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </Button>
      </div>
    </li>
  );
}

type RecRow = { key: number; staffId: string; note: string };

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const staff = useAdminStaff();
  const services = useAdminServices();

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [howToUse, setHowToUse] = useState(product?.howToUse ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [isFeatured, setFeatured] = useState(product?.isFeatured ?? false);
  const [isActive, setActive] = useState(product?.isActive ?? true);
  const [recs, setRecs] = useState<RecRow[]>(() => product?.recommendedBy.map((r, k) => ({ key: k, staffId: r.id, note: r.note })) ?? []);
  const [nextKey, setNextKey] = useState(() => (product?.recommendedBy.length ?? 0) + 1);
  const [serviceIds, setServiceIds] = useState<string[]>(product?.services.map(s => s.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      product ? api.patch(`/admin/products/${product.id}`, payload) : api.post('/admin/products', payload),
    onSuccess: () => {
      toast(product ? 'Product updated.' : 'Product created.');
      qc.invalidateQueries({ queryKey: extraKeys.products });
      onDone();
    },
    onError: e => {
      const fe = e instanceof RequestError ? fieldErrors(e.details) : {};
      setErrors(fe);
      setFormError(Object.keys(fe).length ? 'Please fix the highlighted fields.' : errorMessage(e));
    },
  });

  const updateRec = (key: number, patch: Partial<RecRow>) => setRecs(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (price.trim() === '' || Number.isNaN(Number(price))) local.price = 'Enter a price';
    if (recs.some(r => !r.staffId || r.note.trim().length < 2)) local.recommendations = 'Choose a team member and write a short note for every row';
    else if (new Set(recs.map(r => r.staffId)).size !== recs.length) local.recommendations = 'Each team member can only recommend once';
    if (Object.keys(local).length) {
      setErrors(local);
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setErrors({});
    setFormError('');
    save.mutate({
      name: name.trim(),
      slug: slug.trim(),
      brand: brand.trim(),
      category: category.trim(),
      description: description.trim(),
      howToUse: howToUse.trim() || null,
      price: Number(price),
      imageUrl: imageUrl.trim() || null,
      inStock,
      isFeatured,
      isActive,
      recommendations: recs.map(r => ({ staffId: r.staffId, note: r.note.trim() })),
      serviceIds,
    });
  }

  const recError = errors.recommendations ?? Object.entries(errors).find(([k]) => k.startsWith('recommendations.'))?.[1];

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          required
          value={name}
          error={errors.name}
          onChange={e => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
        <Input
          label="URL slug"
          required
          value={slug}
          error={errors.slug}
          hint="Lowercase letters, numbers and dashes"
          onChange={e => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Brand" required value={brand} error={errors.brand} onChange={e => setBrand(e.target.value)} />
        <Input
          label="Category"
          required
          value={category}
          error={errors.category}
          placeholder="e.g. Hair care"
          onChange={e => setCategory(e.target.value)}
        />
        <Input
          label="Price (Rs.)"
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={price}
          error={errors.price}
          onChange={e => setPrice(e.target.value)}
        />
      </div>
      <Textarea
        label="Description"
        required
        rows={3}
        value={description}
        error={errors.description}
        hint="At least 10 characters."
        onChange={e => setDescription(e.target.value)}
      />
      <Textarea label="How to use (optional)" rows={2} value={howToUse} error={errors.howToUse} onChange={e => setHowToUse(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem] sm:items-start">
        <Input
          label="Image URL (optional)"
          placeholder="https://… or /images/products/…"
          value={imageUrl}
          error={errors.imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />
        <ImagePreview src={imageUrl.trim()} alt="Preview" className="size-24 rounded-xl border border-line sm:mt-7" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Checkbox label="In stock" hint="Can be reserved" checked={inStock} onChange={setInStock} />
        <Checkbox label="Featured" hint="Shown first in the shop" checked={isFeatured} onChange={setFeatured} />
        <Checkbox label="Active" hint="Visible on the website" checked={isActive} onChange={setActive} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Recommended by</legend>
        {recs.length > 0 ? (
          <ul className="mt-2 space-y-3">
            {recs.map((row, i) => (
              <li key={row.key} className="rounded-xl border border-line bg-ivory/40 p-3">
                <div className="flex items-end gap-2">
                  <Select
                    label={`Team member ${i + 1}`}
                    className="min-w-0 flex-1 [&_label]:sr-only"
                    value={row.staffId}
                    onChange={e => updateRec(row.key, { staffId: e.target.value })}
                  >
                    <option value="" disabled>
                      {staff.isPending ? 'Loading…' : 'Choose a team member'}
                    </option>
                    {staff.data?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.title}
                        {s.isActive ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setRecs(rows => rows.filter(r => r.key !== row.key))}
                    aria-label={`Remove recommendation ${i + 1}`}
                    className="mb-1.5 rounded-full p-2 text-muted transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <Textarea
                  label={`Why they recommend it (${i + 1})`}
                  className="mt-2 [&_label]:sr-only [&_textarea]:min-h-16"
                  rows={2}
                  maxLength={300}
                  placeholder="Why they recommend it, in their words"
                  value={row.note}
                  onChange={e => updateRec(row.key, { note: e.target.value })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No recommendations yet.</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={recs.length >= 10}
          onClick={() => {
            setRecs(rows => [...rows, { key: nextKey, staffId: '', note: '' }]);
            setNextKey(k => k + 1);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add recommendation
        </Button>
        {recError ? <p className="mt-1.5 text-sm text-danger">{recError}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Pairs with services</legend>
        {services.isPending ? (
          <Skeleton className="mt-2 h-14" />
        ) : services.isError ? (
          <p className="mt-2 text-sm text-danger">{services.error.message}</p>
        ) : (
          <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {services.data.map(s => (
              <Checkbox
                key={s.id}
                label={s.name}
                hint={s.isActive ? s.category?.name : `${s.category?.name ?? 'Service'} · inactive`}
                checked={serviceIds.includes(s.id)}
                onChange={on => setServiceIds(ids => (on ? [...ids, s.id] : ids.filter(id => id !== s.id)))}
              />
            ))}
          </div>
        )}
      </fieldset>

      {formError ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {product ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
