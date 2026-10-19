'use client';

import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarDays, CircleCheck, Clock, MapPin, PartyPopper, Pencil, Phone, Plus, Power, PowerOff, Send, Users } from 'lucide-react';
import { Checkbox, ErrorState, PageHeader, slugify } from '@/components/admin/common';
import {
  ConfirmDialog,
  EVENT_STATUS,
  FilterChips,
  ImagePreview,
  SearchBox,
  StatusPill,
  StringListEditor,
  Tabs,
  extraKeys,
  formatDay,
  formatHHMM,
  useAdminInbox,
  useDebounced,
} from '@/components/admin/extras';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Textarea, fieldErrors } from '@/components/ui/field';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn, formatPrice } from '@/lib/format';
import type { EventPackage, EventRequest, EventRequestStatus } from '@/lib/types';

type Tab = 'requests' | 'packages';

export default function AdminEventsPage() {
  const [tab, setTab] = useState<Tab>('requests');
  const [editing, setEditing] = useState<{ pkg?: EventPackage } | null>(null);
  const inbox = useAdminInbox();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Grow"
        title="Events & bridal"
        intro="Quote enquiries for weddings, parties and festivals, and manage the packages on the website."
        action={
          tab === 'packages' ? (
            <Button variant="accent" onClick={() => setEditing({})}>
              <Plus className="size-4" aria-hidden />
              New package
            </Button>
          ) : undefined
        }
      />
      <Tabs
        label="Events sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'requests', label: 'Requests', count: inbox.data?.newEventRequests },
          { key: 'packages', label: 'Packages' },
        ]}
      />
      {tab === 'requests' ? <Requests /> : <Packages onEdit={pkg => setEditing({ pkg })} />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.pkg ? `Edit ${editing.pkg.name}` : 'New event package'} wide>
        {editing ? <PackageForm key={editing.pkg?.id ?? 'new'} pkg={editing.pkg} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}

// ============================================================================
// Requests
// ============================================================================

type StatusFilter = EventRequestStatus | 'ALL';

function Requests() {
  const [status, setStatus] = useState<StatusFilter>('NEW');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const inbox = useAdminInbox();

  const params = new URLSearchParams();
  if (status !== 'ALL') params.set('status', status);
  if (q) params.set('q', q);
  const qs = params.toString();

  const list = useQuery({
    queryKey: [...extraKeys.eventRequests, qs],
    queryFn: () => api.get<EventRequest[]>(`/admin/event-requests?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <section className="space-y-5" aria-label="Event requests">
      <div className="card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-plum-900">Status</p>
          <FilterChips
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'NEW', label: 'New', count: inbox.data?.newEventRequests, highlight: true },
              { value: 'QUOTED', label: 'Quoted' },
              { value: 'CONFIRMED', label: 'Confirmed', count: inbox.data?.upcomingEvents },
              { value: 'DECLINED', label: 'Declined' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>
        <SearchBox value={search} onChange={setSearch} className="lg:w-72" />
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <EmptyState icon={PartyPopper} title={status === 'NEW' ? 'No new enquiries' : 'No requests found'}>
          {status === 'NEW' ? 'New event enquiries from the website appear here for you to quote.' : 'Try another status or clear the search.'}
        </EmptyState>
      ) : (
        <ul className={cn('grid gap-4 lg:grid-cols-2', list.isPlaceholderData && 'opacity-60')}>
          {list.data.map(r => (
            <RequestCard key={r.id} request={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestCard({ request: r }: { request: EventRequest }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [quoting, setQuoting] = useState(false);
  const [confirm, setConfirm] = useState<'COMPLETED' | 'CANCELLED' | 'DECLINED' | null>(null);
  const name = r.customer?.name ?? 'Customer';

  const setStatus = useMutation({
    mutationFn: (status: EventRequestStatus) => api.patch<{ request: EventRequest }>(`/admin/event-requests/${r.id}`, { status }),
    onSuccess: (_d, status) => {
      toast(`${name}’s ${r.package.name} marked ${EVENT_STATUS[status].label.toLowerCase()}.`);
      setConfirm(null);
      return qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  const canQuote = r.status === 'NEW' || r.status === 'QUOTED';
  const isNew = r.status === 'NEW';
  const declineStatus = r.status === 'NEW' ? 'DECLINED' : 'CANCELLED';

  return (
    <li className={cn('card flex flex-col overflow-hidden', isNew && 'border-warning/40')}>
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-rose-600">{r.package.name}</p>
            <h3 className="mt-0.5 truncate text-lg leading-snug">{name}</h3>
          </div>
          <StatusPill map={EVENT_STATUS} status={r.status} />
        </div>

        <dl className="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-plum-900">
            <CalendarDays className="size-4 shrink-0 text-rose-500" aria-hidden />
            <dt className="sr-only">Date</dt>
            <dd className="font-medium">{formatDay(r.eventDate)}</dd>
          </div>
          {r.startTime ? (
            <div className="flex items-center gap-2 text-plum-900">
              <Clock className="size-4 shrink-0 text-rose-500" aria-hidden />
              <dt className="sr-only">Start time</dt>
              <dd>{formatHHMM(r.startTime)}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-plum-900">
            <Users className="size-4 shrink-0 text-rose-500" aria-hidden />
            <dt className="sr-only">Guests</dt>
            <dd>
              {r.guestCount} guest{r.guestCount === 1 ? '' : 's'}
            </dd>
          </div>
          <div className="flex min-w-0 items-start gap-2 text-plum-900 sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
            <dt className="sr-only">Where</dt>
            <dd className="min-w-0 wrap-break-word">{r.location ? r.location.name : r.venue ? `On location: ${r.venue}` : 'Venue to confirm'}</dd>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Phone className="size-4 shrink-0 text-rose-500" aria-hidden />
            <dt className="sr-only">Phone</dt>
            <dd>
              <a href={`tel:${r.contactPhone}`} className="font-medium text-plum-900 underline-offset-2 hover:text-rose-600 hover:underline">
                {r.contactPhone}
              </a>
              {r.customer?.email ? (
                <a href={`mailto:${r.customer.email}`} className="ml-2 text-muted hover:text-rose-600">
                  {r.customer.email}
                </a>
              ) : null}
            </dd>
          </div>
        </dl>

        {r.notes ? <p className="mt-4 rounded-xl bg-ivory px-3.5 py-2.5 text-sm text-plum-800">“{r.notes}”</p> : null}

        {r.quotedPrice != null ? (
          <div className="mt-4 rounded-xl border border-plum-100 bg-plum-50/50 px-3.5 py-2.5 text-sm">
            <p className="font-medium text-plum-900">
              Quoted {formatPrice(r.quotedPrice, r.currency)}
              {r.quotedAt ? <span className="font-normal text-muted"> · {formatDay(r.quotedAt, { weekday: undefined })}</span> : null}
            </p>
            {r.quoteNote ? <p className="mt-0.5 text-muted">{r.quoteNote}</p> : null}
            {r.status === 'QUOTED' ? <p className="mt-1 text-xs text-muted">Waiting for the customer to accept from their account.</p> : null}
          </div>
        ) : null}
      </div>

      {canQuote || r.status === 'CONFIRMED' ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
          {canQuote ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(declineStatus)}>
              <Ban className="size-4" aria-hidden />
              {r.status === 'NEW' ? 'Decline' : 'Cancel'}
            </Button>
          ) : null}
          {r.status === 'CONFIRMED' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setConfirm('CANCELLED')}>
                <Ban className="size-4" aria-hidden />
                Cancel
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirm('COMPLETED')}>
                <CircleCheck className="size-4" aria-hidden />
                Mark completed
              </Button>
            </>
          ) : null}
          {canQuote ? (
            <Button size="sm" variant={isNew ? 'accent' : 'outline'} onClick={() => setQuoting(true)}>
              <Send className="size-4" aria-hidden />
              {isNew ? 'Send quote' : 'Revise quote'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Modal open={quoting} onClose={() => setQuoting(false)} title={isNew ? 'Send quote' : 'Revise quote'}>
        {quoting ? <QuoteForm request={r} onDone={() => setQuoting(false)} /> : null}
      </Modal>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'COMPLETED' ? 'Mark event completed?' : confirm === 'DECLINED' ? 'Decline this request?' : 'Cancel this event?'}
        confirmLabel={confirm === 'COMPLETED' ? 'Mark completed' : confirm === 'DECLINED' ? 'Decline request' : 'Cancel event'}
        tone={confirm === 'COMPLETED' ? 'primary' : 'danger'}
        loading={setStatus.isPending}
        onConfirm={() => confirm && setStatus.mutate(confirm)}
      >
        {confirm === 'COMPLETED'
          ? `${r.package.name} for ${name} on ${formatDay(r.eventDate)} will be moved to completed.`
          : `${name} will see this request as ${confirm === 'DECLINED' ? 'declined' : 'cancelled'} in their account. Consider calling them on ${r.contactPhone} first.`}
      </ConfirmDialog>
    </li>
  );
}

function QuoteForm({ request: r, onDone }: { request: EventRequest; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [price, setPrice] = useState(r.quotedPrice != null ? String(r.quotedPrice) : '');
  const [note, setNote] = useState(r.quoteNote ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const send = useMutation({
    mutationFn: (payload: { price: number; note?: string }) => api.post<{ request: EventRequest }>(`/admin/event-requests/${r.id}/quote`, payload),
    onSuccess: () => {
      toast(`Quote sent to ${r.customer?.name ?? 'the customer'}.`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      onDone();
    },
    onError: e => {
      const fe = e instanceof RequestError ? fieldErrors(e.details) : {};
      setErrors(fe);
      setFormError(Object.keys(fe).length ? 'Please fix the highlighted fields.' : errorMessage(e));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(price);
    if (price.trim() === '' || Number.isNaN(n) || n < 0) {
      setErrors({ price: 'Enter the quoted price' });
      return;
    }
    setErrors({});
    setFormError('');
    send.mutate({ price: n, note: note.trim() || undefined });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-muted">
        {r.package.name} · {formatDay(r.eventDate)} · {r.guestCount} guest{r.guestCount === 1 ? '' : 's'}. The customer can accept or decline
        the quote from their account.
      </p>
      <Input
        label="Price (Rs.)"
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        required
        autoFocus
        value={price}
        error={errors.price}
        onChange={e => setPrice(e.target.value)}
      />
      <Textarea
        label="Note to customer (optional)"
        rows={4}
        maxLength={1000}
        value={note}
        error={errors.note}
        placeholder="What’s included, trial date, travel, deposit…"
        onChange={e => setNote(e.target.value)}
      />
      {formError ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={send.isPending}>
          <Send className="size-4" aria-hidden />
          Send quote
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Packages
// ============================================================================

function Packages({ onEdit }: { onEdit: (pkg: EventPackage) => void }) {
  const list = useQuery({ queryKey: extraKeys.eventPackages, queryFn: () => api.get<EventPackage[]>('/admin/event-packages') });
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  if (list.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }
  if (list.data.length === 0) {
    return (
      <EmptyState icon={PartyPopper} title="No event packages yet">
        Add bridal, party or festival packages so customers can send enquiries.
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.data.map(p => (
        <PackageCard key={p.id} pkg={p} onEdit={() => onEdit(p)} />
      ))}
    </ul>
  );
}

const guestsLabel = (p: Pick<EventPackage, 'minGuests' | 'maxGuests'>) =>
  p.maxGuests ? `${p.minGuests}–${p.maxGuests} guests` : `${p.minGuests}+ guest${p.minGuests === 1 ? '' : 's'}`;

function PackageCard({ pkg: p, onEdit }: { pkg: EventPackage; onEdit: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: () =>
      p.isActive ? api.delete<void>(`/admin/event-packages/${p.id}`) : api.patch(`/admin/event-packages/${p.id}`, { isActive: true }),
    onSuccess: () => {
      toast(p.isActive ? `${p.name} hidden from the website.` : `${p.name} is live again.`);
      return qc.invalidateQueries({ queryKey: extraKeys.eventPackages });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <li className={cn('card flex flex-col overflow-hidden transition hover:shadow-lift', !p.isActive && 'opacity-75')}>
      <ImagePreview src={p.imageUrl ?? ''} alt={p.name} className="aspect-video w-full" />
      <div className="flex-1 p-5">
        <div className="flex flex-wrap gap-1.5">
          {p.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
          <Badge tone="plum">
            <Users className="size-3" aria-hidden />
            {guestsLabel(p)}
          </Badge>
        </div>
        <h3 className="mt-3 text-xl leading-snug">{p.name}</h3>
        <p className="mt-1 text-sm font-semibold text-plum-900">From {formatPrice(p.fromPrice, p.currency)}</p>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{p.description}</p>
        {p.includes.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {p.includes.slice(0, 4).map(item => (
              <li key={item} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
                {item}
              </li>
            ))}
            {p.includes.length > 4 ? <li className="pl-6 text-xs">+{p.includes.length - 4} more</li> : null}
          </ul>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          loading={toggle.isPending}
          onClick={() => {
            if (!p.isActive || window.confirm(`Hide “${p.name}” from the website? Existing requests are kept.`)) toggle.mutate();
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

function PackageForm({ pkg, onDone }: { pkg?: EventPackage; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(pkg?.name ?? '');
  const [slug, setSlug] = useState(pkg?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!pkg);
  const [description, setDescription] = useState(pkg?.description ?? '');
  const [fromPrice, setFromPrice] = useState(pkg ? String(pkg.fromPrice) : '');
  const [minGuests, setMinGuests] = useState(String(pkg?.minGuests ?? 1));
  const [maxGuests, setMaxGuests] = useState(pkg?.maxGuests != null ? String(pkg.maxGuests) : '');
  const [sortOrder, setSortOrder] = useState(String(pkg?.sortOrder ?? 0));
  const [imageUrl, setImageUrl] = useState(pkg?.imageUrl ?? '');
  const [includes, setIncludes] = useState<string[]>(pkg?.includes ?? []);
  const [isActive, setActive] = useState(pkg?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      pkg ? api.patch(`/admin/event-packages/${pkg.id}`, payload) : api.post('/admin/event-packages', payload),
    onSuccess: () => {
      toast(pkg ? 'Package updated.' : 'Package created.');
      qc.invalidateQueries({ queryKey: extraKeys.eventPackages });
      onDone();
    },
    onError: e => {
      const fe = e instanceof RequestError ? fieldErrors(e.details) : {};
      setErrors(fe);
      setFormError(Object.keys(fe).length ? 'Please fix the highlighted fields.' : errorMessage(e));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (fromPrice.trim() === '' || Number.isNaN(Number(fromPrice))) local.fromPrice = 'Enter a starting price';
    const min = Number(minGuests);
    if (!Number.isInteger(min) || min < 1) local.minGuests = 'At least 1';
    if (maxGuests.trim() && (!Number.isInteger(Number(maxGuests)) || Number(maxGuests) < min)) local.maxGuests = 'Must be ≥ minimum';
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
      description: description.trim(),
      fromPrice: Number(fromPrice),
      minGuests: min,
      maxGuests: maxGuests.trim() ? Number(maxGuests) : null,
      sortOrder: Number(sortOrder) || 0,
      imageUrl: imageUrl.trim() || null,
      includes,
      isActive,
    });
  }

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
      <Textarea
        label="Description"
        required
        rows={4}
        value={description}
        error={errors.description}
        hint="At least 10 characters. Shown on the website."
        onChange={e => setDescription(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="From price (Rs.)"
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={fromPrice}
          error={errors.fromPrice}
          onChange={e => setFromPrice(e.target.value)}
        />
        <Input
          label="Min guests"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={minGuests}
          error={errors.minGuests}
          onChange={e => setMinGuests(e.target.value)}
        />
        <Input
          label="Max guests"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={maxGuests}
          error={errors.maxGuests}
          hint="Blank for no limit"
          onChange={e => setMaxGuests(e.target.value)}
        />
        <Input label="Sort order" type="number" inputMode="numeric" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start">
        <Input
          label="Image URL (optional)"
          placeholder="https://… or /images/events/…"
          value={imageUrl}
          error={errors.imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />
        <ImagePreview src={imageUrl.trim()} alt="Preview" className="aspect-video w-full rounded-xl border border-line sm:mt-7" />
      </div>
      <StringListEditor
        legend="What’s included"
        items={includes}
        onChange={setIncludes}
        max={15}
        placeholder="e.g. Saree / lehenga draping"
        error={errors.includes ?? Object.entries(errors).find(([k]) => k.startsWith('includes.'))?.[1]}
      />
      <Checkbox label="Active" hint="Shown on the website and open for enquiries" checked={isActive} onChange={setActive} />

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
          {pkg ? 'Save changes' : 'Create package'}
        </Button>
      </div>
    </form>
  );
}
