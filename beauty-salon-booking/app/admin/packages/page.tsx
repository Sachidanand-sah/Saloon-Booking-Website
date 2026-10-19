'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Ban, CircleCheck, Crown, Mail, MapPin, Pencil, Phone, Plus, Power, PowerOff, RotateCw, Star, Users, X } from 'lucide-react';
import { Checkbox, ErrorState, PageHeader, slugify, useAdminServices } from '@/components/admin/common';
import {
  ConfirmDialog,
  FilterChips,
  MEMBERSHIP_STATUS,
  SearchBox,
  StatusPill,
  StringListEditor,
  Tabs,
  extraKeys,
  formatDay,
  useAdminInbox,
  useAdminPlans,
  useDebounced,
  type AdminPlan,
} from '@/components/admin/extras';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, fieldErrors } from '@/components/ui/field';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn, formatPrice } from '@/lib/format';
import type { Membership, MembershipStatus } from '@/lib/types';

type Tab = 'members' | 'plans';

export default function AdminPackagesPage() {
  const [tab, setTab] = useState<Tab>('members');
  const [editing, setEditing] = useState<{ plan?: AdminPlan } | null>(null);
  const inbox = useAdminInbox();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Grow"
        title="Monthly packages"
        intro="Activate memberships once paid at the counter, renew them, and shape the plans you offer."
        action={
          tab === 'plans' ? (
            <Button variant="accent" onClick={() => setEditing({})}>
              <Plus className="size-4" aria-hidden />
              New plan
            </Button>
          ) : undefined
        }
      />
      <Tabs
        label="Packages sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'members', label: 'Members', count: inbox.data?.pendingMemberships },
          { key: 'plans', label: 'Plans' },
        ]}
      />
      {tab === 'members' ? <Members /> : <Plans onEdit={plan => setEditing({ plan })} />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.plan ? `Edit ${editing.plan.name}` : 'New plan'} wide>
        {editing ? <PlanForm key={editing.plan?.id ?? 'new'} plan={editing.plan} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}

// ============================================================================
// Members
// ============================================================================

type StatusFilter = MembershipStatus | 'ALL';

function Members() {
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const inbox = useAdminInbox();

  const params = new URLSearchParams();
  if (status !== 'ALL') params.set('status', status);
  if (q) params.set('q', q);
  const qs = params.toString();

  const list = useQuery({
    queryKey: [...extraKeys.memberships, qs],
    queryFn: () => api.get<Membership[]>(`/admin/memberships?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <section className="space-y-5" aria-label="Members">
      <div className="card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-plum-900">Status</p>
          <FilterChips
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PENDING', label: 'Pending payment', count: inbox.data?.pendingMemberships, highlight: true },
              { value: 'ACTIVE', label: 'Active', count: inbox.data?.activeMembers },
              { value: 'EXPIRED', label: 'Expired' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>
        <SearchBox value={search} onChange={setSearch} className="lg:w-72" />
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <EmptyState icon={Users} title={status === 'PENDING' ? 'Nothing awaiting payment' : 'No packages found'}>
          {status === 'PENDING'
            ? 'When a customer signs up for a package online, it appears here until they pay at the counter.'
            : 'Try another status or clear the search.'}
        </EmptyState>
      ) : (
        <ul className={cn('space-y-3 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
          {list.data.map(m => (
            <MemberRow key={m.id} membership={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

type MemberAction = 'activate' | 'renew' | 'cancel';

/** Mirrors the API: extend from the current end date, or restart today if it has lapsed. */
function renewedUntil(m: Membership) {
  const now = Date.now();
  const end = m.endsAt ? new Date(m.endsAt).getTime() : 0;
  const from = end > now ? end : now;
  const until = new Date(from + m.plan.durationDays * 86_400_000).toISOString();
  return `${end > now ? 'It extends' : 'It restarts today and runs'} until ${formatDay(until, { weekday: undefined })}.`;
}

function MemberRow({ membership: m }: { membership: Membership }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<MemberAction | null>(null);
  const name = m.customer?.name ?? 'Customer';

  const act = useMutation({
    mutationFn: ({ action, note }: { action: MemberAction; note?: string }) =>
      api.post<{ membership: Membership }>(`/admin/memberships/${m.id}/${action}`, action === 'activate' && note ? { note } : {}),
    onSuccess: (_d, { action }) => {
      toast(
        action === 'activate'
          ? `${name}’s ${m.plan.name} package is now active.`
          : action === 'renew'
            ? `${name}’s package renewed for another ${m.plan.durationDays} days.`
            : `${name}’s package was cancelled.`,
      );
      setConfirm(null);
      return qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  const pending = m.status === 'PENDING';

  return (
    <li className={cn('card p-4 sm:p-5', pending && 'border-warning/40 bg-warning/3')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-0.5 text-sm">
            <p className="truncate font-medium text-plum-900">{name}</p>
            {m.customer?.phone ? (
              <a href={`tel:${m.customer.phone}`} className="flex items-center gap-1.5 text-muted hover:text-rose-600">
                <Phone className="size-3.5 shrink-0" aria-hidden />
                {m.customer.phone}
              </a>
            ) : null}
            {m.customer?.email ? (
              <a href={`mailto:${m.customer.email}`} className="flex min-w-0 items-center gap-1.5 text-muted hover:text-rose-600">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{m.customer.email}</span>
              </a>
            ) : null}
          </div>
          <div className="min-w-0 space-y-1 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-plum-900">
              <Crown className="size-4 shrink-0 text-rose-500" aria-hidden />
              <span className="truncate">{m.plan.name}</span>
            </p>
            {m.location ? (
              <p className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{m.location.name}</span>
              </p>
            ) : null}
            <p className="text-muted">
              {m.startsAt && m.endsAt
                ? `${formatDay(m.startsAt, { weekday: undefined })} – ${formatDay(m.endsAt, { weekday: undefined })}`
                : `Requested ${formatDay(m.createdAt, { weekday: undefined })}`}
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 sm:flex-col sm:items-end">
            <StatusPill map={MEMBERSHIP_STATUS} status={m.status} />
            <p className="font-semibold text-plum-900">
              {formatPrice(m.price, m.currency)}
              <span className="text-xs font-normal text-muted"> / {m.plan.durationDays} days</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3 lg:w-auto lg:shrink-0 lg:justify-end lg:border-0 lg:pt-0">
          {pending ? (
            <Button size="sm" variant="accent" onClick={() => setConfirm('activate')}>
              <CircleCheck className="size-4" aria-hidden />
              Mark paid &amp; activate
            </Button>
          ) : null}
          {m.status === 'ACTIVE' || m.status === 'EXPIRED' ? (
            <Button size="sm" variant="outline" onClick={() => setConfirm('renew')}>
              <RotateCw className="size-4" aria-hidden />
              Renew 1 month
            </Button>
          ) : null}
          {m.status !== 'CANCELLED' ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm('cancel')}>
              <Ban className="size-4" aria-hidden />
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
      {m.note ? <p className="mt-3 rounded-xl bg-ivory px-3.5 py-2 text-sm text-muted">Note: {m.note}</p> : null}

      <ConfirmDialog
        open={confirm === 'activate'}
        onClose={() => setConfirm(null)}
        title="Mark paid & activate"
        confirmLabel={`Activate · ${formatPrice(m.price, m.currency)}`}
        tone="accent"
        loading={act.isPending}
        noteLabel="Note (optional)"
        notePlaceholder="e.g. Paid by eSewa, receipt #1042"
        onConfirm={note => act.mutate({ action: 'activate', note: note || undefined })}
      >
        Confirm you’ve received <strong className="text-plum-900">{formatPrice(m.price, m.currency)}</strong> from {name} for{' '}
        <strong className="text-plum-900">{m.plan.name}</strong>. The package starts today and runs for {m.plan.durationDays} days.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'renew'}
        onClose={() => setConfirm(null)}
        title="Renew package"
        confirmLabel="Renew"
        loading={act.isPending}
        onConfirm={() => act.mutate({ action: 'renew' })}
      >
        Confirm {name} has paid {formatPrice(m.plan.price, m.currency)} for another {m.plan.durationDays} days of {m.plan.name}.{' '}
        {renewedUntil(m)}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title="Cancel package?"
        confirmLabel="Cancel package"
        tone="danger"
        loading={act.isPending}
        onConfirm={() => act.mutate({ action: 'cancel' })}
      >
        {name}’s {m.plan.name} package will stop immediately and its benefits will no longer apply to new bookings.
      </ConfirmDialog>
    </li>
  );
}

// ============================================================================
// Plans
// ============================================================================

function Plans({ onEdit }: { onEdit: (plan: AdminPlan) => void }) {
  const plans = useAdminPlans();
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => plans.refetch()} />;
  if (plans.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }
  if (plans.data.length === 0) {
    return (
      <EmptyState icon={Crown} title="No plans yet">
        Create a monthly package so customers can subscribe from the website.
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.data.map(p => (
        <PlanCard key={p.id} plan={p} onEdit={() => onEdit(p)} />
      ))}
    </ul>
  );
}

function PlanCard({ plan: p, onEdit }: { plan: AdminPlan; onEdit: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: () => (p.isActive ? api.delete<void>(`/admin/plans/${p.id}`) : api.patch(`/admin/plans/${p.id}`, { isActive: true })),
    onSuccess: () => {
      toast(p.isActive ? `${p.name} is no longer offered.` : `${p.name} is available again.`);
      return qc.invalidateQueries({ queryKey: extraKeys.plans });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });
  const value = p.includes.reduce((sum, i) => sum + i.value, 0);

  return (
    <li className={cn('card flex flex-col overflow-hidden transition hover:shadow-lift', !p.isActive && 'opacity-75')}>
      <div className="flex-1 p-5">
        <div className="flex flex-wrap gap-1.5">
          {p.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
          {p.isFeatured ? (
            <Badge tone="rose">
              <Star className="size-3 fill-current" aria-hidden />
              Featured
            </Badge>
          ) : null}
          <Badge tone="plum">
            <Users className="size-3" aria-hidden />
            {p.activeMembers} active member{p.activeMembers === 1 ? '' : 's'}
          </Badge>
        </div>
        <h3 className="mt-3 text-xl leading-snug">{p.name}</h3>
        {p.tagline ? <p className="text-sm text-muted">{p.tagline}</p> : null}
        <p className="mt-3 font-display text-3xl font-semibold text-plum-900">
          {formatPrice(p.price, p.currency)}
          <span className="font-sans text-sm font-normal text-muted"> / {p.durationDays === 30 ? 'month' : `${p.durationDays} days`}</span>
        </p>
        {p.discountPercent > 0 ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-rose-600">
            <BadgePercent className="size-4" aria-hidden />
            {p.discountPercent}% off other services
          </p>
        ) : null}

        {p.includes.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Included each period</p>
            <ul className="mt-2 space-y-1 text-sm">
              {p.includes.map(i => (
                <li key={i.serviceId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-plum-900">
                    {i.quantity} × {i.serviceName}
                  </span>
                  <span className="shrink-0 text-muted">{formatPrice(i.value, p.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted">Worth {formatPrice(value, p.currency)} at menu prices</p>
          </div>
        ) : null}
        {p.perks.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {p.perks.map(perk => (
              <li key={perk} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
                {perk}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          loading={toggle.isPending}
          onClick={() => {
            if (!p.isActive || window.confirm(`Stop offering “${p.name}”? Existing members keep their package until it ends.`)) {
              toggle.mutate();
            }
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

type ItemRow = { key: number; serviceId: string; quantity: string };

function PlanForm({ plan, onDone }: { plan?: AdminPlan; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const services = useAdminServices();

  const [name, setName] = useState(plan?.name ?? '');
  const [slug, setSlug] = useState(plan?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!plan);
  const [tagline, setTagline] = useState(plan?.tagline ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [price, setPrice] = useState(plan ? String(plan.price) : '');
  const [durationDays, setDurationDays] = useState(String(plan?.durationDays ?? 30));
  const [discount, setDiscount] = useState(String(plan?.discountPercent ?? 0));
  const [sortOrder, setSortOrder] = useState(String(plan?.sortOrder ?? 0));
  const [perks, setPerks] = useState<string[]>(plan?.perks ?? []);
  const [items, setItems] = useState<ItemRow[]>(
    () => plan?.includes.map((i, k) => ({ key: k, serviceId: i.serviceId, quantity: String(i.quantity) })) ?? [],
  );
  const [nextKey, setNextKey] = useState(() => (plan?.includes.length ?? 0) + 1);
  const [isFeatured, setFeatured] = useState(plan?.isFeatured ?? false);
  const [isActive, setActive] = useState(plan?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      plan ? api.patch(`/admin/plans/${plan.id}`, payload) : api.post('/admin/plans', payload),
    onSuccess: () => {
      toast(plan ? 'Plan updated.' : 'Plan created.');
      qc.invalidateQueries({ queryKey: extraKeys.plans });
      onDone();
    },
    onError: e => {
      const fe = e instanceof RequestError ? fieldErrors(e.details) : {};
      setErrors(fe);
      setFormError(Object.keys(fe).length ? 'Please fix the highlighted fields.' : errorMessage(e));
    },
  });

  const updateItem = (key: number, patch: Partial<ItemRow>) => setItems(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (price.trim() === '' || Number.isNaN(Number(price))) local.price = 'Enter a price';
    if (!Number.isInteger(Number(durationDays)) || Number(durationDays) < 1) local.durationDays = 'Enter whole days';
    if (!Number.isInteger(Number(discount)) || Number(discount) < 0 || Number(discount) > 100) local.discountPercent = '0–100';
    if (items.some(i => !i.serviceId)) local.items = 'Choose a service for every row (or remove it)';
    else if (new Set(items.map(i => i.serviceId)).size !== items.length) local.items = 'Each service can only appear once';
    else if (items.some(i => !Number.isInteger(Number(i.quantity)) || Number(i.quantity) < 1)) local.items = 'Quantities must be whole numbers from 1';
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
      tagline: tagline.trim() || null,
      description: description.trim(),
      price: Number(price),
      durationDays: Number(durationDays),
      discountPercent: Number(discount),
      sortOrder: Number(sortOrder) || 0,
      perks,
      isFeatured,
      isActive,
      items: items.map(i => ({ serviceId: i.serviceId, quantity: Number(i.quantity) })),
    });
  }

  const itemsError = errors.items ?? Object.entries(errors).find(([k]) => k.startsWith('items.'))?.[1];

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
      <Input label="Tagline (optional)" maxLength={120} value={tagline} error={errors.tagline} onChange={e => setTagline(e.target.value)} />
      <Textarea
        label="Description"
        required
        rows={3}
        value={description}
        error={errors.description}
        hint="At least 10 characters. Shown on the website."
        onChange={e => setDescription(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Price (Rs.)"
          type="number"
          inputMode="numeric"
          min={0}
          step="1"
          required
          value={price}
          error={errors.price}
          onChange={e => setPrice(e.target.value)}
        />
        <Input
          label="Period (days)"
          type="number"
          inputMode="numeric"
          min={1}
          max={366}
          value={durationDays}
          error={errors.durationDays}
          onChange={e => setDurationDays(e.target.value)}
        />
        <Input
          label="Discount %"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={discount}
          error={errors.discountPercent}
          hint="On other services"
          onChange={e => setDiscount(e.target.value)}
        />
        <Input
          label="Sort order"
          type="number"
          inputMode="numeric"
          value={sortOrder}
          error={errors.sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Included services each period</legend>
        {services.isError ? (
          <p className="mt-2 text-sm text-danger">{services.error.message}</p>
        ) : (
          <>
            {items.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {items.map((row, i) => (
                  <li key={row.key} className="flex items-end gap-2">
                    <Select
                      label={`Service ${i + 1}`}
                      className="min-w-0 flex-1 [&_label]:sr-only"
                      value={row.serviceId}
                      onChange={e => updateItem(row.key, { serviceId: e.target.value })}
                    >
                      <option value="" disabled>
                        {services.isPending ? 'Loading…' : 'Choose a service'}
                      </option>
                      {services.data?.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {formatPrice(s.price, s.currency)}
                          {s.isActive ? '' : ' (inactive)'}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={`Quantity for service ${i + 1}`}
                      className="w-20 shrink-0 [&_label]:sr-only"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      value={row.quantity}
                      onChange={e => updateItem(row.key, { quantity: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setItems(rows => rows.filter(r => r.key !== row.key))}
                      aria-label={`Remove service ${i + 1}`}
                      className="mb-1.5 rounded-full p-2 text-muted transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No included services, so the plan only gives its discount and perks.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={items.length >= 20}
              onClick={() => {
                setItems(rows => [...rows, { key: nextKey, serviceId: '', quantity: '1' }]);
                setNextKey(k => k + 1);
              }}
            >
              <Plus className="size-4" aria-hidden />
              Add service
            </Button>
          </>
        )}
        {itemsError ? <p className="mt-1.5 text-sm text-danger">{itemsError}</p> : null}
      </fieldset>

      <StringListEditor
        legend="Perks"
        items={perks}
        onChange={setPerks}
        placeholder="e.g. Priority weekend slots"
        error={errors.perks ?? Object.entries(errors).find(([k]) => k.startsWith('perks.'))?.[1]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox label="Featured" hint="Highlighted as the recommended plan" checked={isFeatured} onChange={setFeatured} />
        <Checkbox label="Active" hint="Customers can sign up online" checked={isActive} onChange={setActive} />
      </div>

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
          {plan ? 'Save changes' : 'Create plan'}
        </Button>
      </div>
    </form>
  );
}
