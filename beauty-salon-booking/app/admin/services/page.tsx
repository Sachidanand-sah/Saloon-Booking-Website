'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil, Plus, Power, PowerOff, Scissors, Star } from 'lucide-react';
import {
  Checkbox,
  ErrorState,
  PageHeader,
  adminKeys,
  slugify,
  useAdminServices,
  useAdminStaff,
  useCategories,
  type AdminService,
} from '@/components/admin/common';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, fieldErrors } from '@/components/ui/field';
import { Badge, EmptyState, Modal, ServiceArt, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn, formatDuration, formatPrice } from '@/lib/format';

type Editing = { mode: 'create' } | { mode: 'edit'; service: AdminService } | null;

export default function AdminServicesPage() {
  const services = useAdminServices();
  const categories = useCategories();
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<Editing>(null);

  const list = (services.data ?? []).filter(s => category === 'all' || s.category?.id === category);
  const activeCount = services.data?.filter(s => s.isActive).length ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Menu"
        title="Services"
        intro={services.data ? `${activeCount} active of ${services.data.length} services` : 'Your treatment menu, prices and durations.'}
        action={
          <Button variant="accent" onClick={() => setEditing({ mode: 'create' })}>
            <Plus className="size-4" aria-hidden />
            New service
          </Button>
        }
      />

      {categories.data && categories.data.length > 0 ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
          {[{ id: 'all', name: 'All' }, ...categories.data].map(c => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                category === c.id
                  ? 'border-plum-900 bg-plum-900 text-white'
                  : 'border-line bg-white text-plum-800 hover:border-plum-200 hover:bg-plum-50',
              )}
            >
              {c.name}
              {c.id !== 'all' ? (
                <span className={cn('ml-1.5 text-xs', category === c.id ? 'text-rose-300' : 'text-muted')}>
                  {services.data?.filter(s => s.category?.id === c.id).length ?? ''}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : services.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Scissors} title="No services here yet">
          Create a service to start taking bookings for it.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(s => (
            <ServiceCard key={s.id} service={s} onEdit={() => setEditing({ mode: 'edit', service: s })} />
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? `Edit ${editing.service.name}` : 'New service'}
        wide
      >
        {editing ? (
          <ServiceForm
            key={editing.mode === 'edit' ? editing.service.id : 'new'}
            service={editing.mode === 'edit' ? editing.service : undefined}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function ServiceCard({ service: s, onEdit }: { service: AdminService; onEdit: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: () => (s.isActive ? api.delete<void>(`/admin/services/${s.id}`) : api.patch(`/admin/services/${s.id}`, { isActive: true })),
    onSuccess: () => {
      toast(s.isActive ? `${s.name} deactivated.` : `${s.name} is bookable again.`);
      return qc.invalidateQueries({ queryKey: adminKeys.services });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <li className={cn('card flex flex-col overflow-hidden transition hover:shadow-lift', !s.isActive && 'opacity-75')}>
      <div className="flex gap-4 p-4">
        <ServiceArt category={s.category?.slug} imageUrl={s.imageUrl} name={s.name} className="size-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-600">{s.category?.name ?? 'Uncategorised'}</p>
          <h3 className="mt-0.5 truncate text-lg leading-snug">{s.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatDuration(s.durationMins)}
            </span>
            <span className="font-semibold text-plum-900">{formatPrice(s.price, s.currency)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
            {s.isFeatured ? (
              <Badge tone="rose">
                <Star className="size-3 fill-current" aria-hidden />
                Featured
              </Badge>
            ) : null}
            <Badge tone="plum">
              {s.staffIds.length} stylist{s.staffIds.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          loading={toggle.isPending}
          onClick={() => {
            if (!s.isActive || window.confirm(`Deactivate “${s.name}”? It will be hidden from the website; past bookings are kept.`)) {
              toggle.mutate();
            }
          }}
        >
          {toggle.isPending ? null : s.isActive ? <PowerOff className="size-4" aria-hidden /> : <Power className="size-4" aria-hidden />}
          {s.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </Button>
      </div>
    </li>
  );
}

function ServiceForm({ service, onDone }: { service?: AdminService; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const categories = useCategories();
  const staff = useAdminStaff();

  const [name, setName] = useState(service?.name ?? '');
  const [slug, setSlug] = useState(service?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!service);
  const [categoryId, setCategoryId] = useState(service?.category?.id ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [duration, setDuration] = useState(String(service?.durationMins ?? 60));
  const [price, setPrice] = useState(service ? String(service.price) : '');
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? '');
  const [isFeatured, setFeatured] = useState(service?.isFeatured ?? false);
  const [isActive, setActive] = useState(service?.isActive ?? true);
  const [staffIds, setStaffIds] = useState<string[]>(service?.staffIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      service ? api.patch(`/admin/services/${service.id}`, payload) : api.post('/admin/services', payload),
    onSuccess: () => {
      toast(service ? 'Service updated.' : 'Service created.');
      qc.invalidateQueries({ queryKey: adminKeys.services });
      qc.invalidateQueries({ queryKey: adminKeys.staff });
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
    if (!categoryId) local.categoryId = 'Choose a category';
    if (price.trim() === '' || Number.isNaN(Number(price))) local.price = 'Enter a price';
    if (!Number.isInteger(Number(duration))) local.durationMins = 'Enter whole minutes';
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
      categoryId,
      description: description.trim(),
      durationMins: Number(duration),
      price: Number(price),
      imageUrl: imageUrl.trim() || null,
      isFeatured,
      isActive,
      staffIds,
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
      <Select label="Category" required value={categoryId} error={errors.categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="" disabled>
          {categories.isPending ? 'Loading…' : 'Choose a category'}
        </option>
        {categories.data?.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Textarea
        label="Description"
        required
        rows={4}
        value={description}
        error={errors.description}
        hint="At least 10 characters. Shown on the website."
        onChange={e => setDescription(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Duration (minutes)"
          type="number"
          inputMode="numeric"
          min={5}
          max={480}
          step={5}
          required
          value={duration}
          error={errors.durationMins}
          onChange={e => setDuration(e.target.value)}
        />
        <Input
          label="Price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          value={price}
          error={errors.price}
          onChange={e => setPrice(e.target.value)}
        />
      </div>
      <Input
        label="Image URL (optional)"
        type="url"
        placeholder="https://…"
        value={imageUrl}
        error={errors.imageUrl}
        onChange={e => setImageUrl(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox label="Featured" hint="Highlighted on the home page" checked={isFeatured} onChange={setFeatured} />
        <Checkbox label="Active" hint="Visible and bookable online" checked={isActive} onChange={setActive} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Stylists who perform this service</legend>
        {staff.isPending ? (
          <Skeleton className="mt-2 h-14" />
        ) : staff.isError ? (
          <p className="mt-2 text-sm text-danger">{staff.error.message}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {staff.data.map(m => (
              <Checkbox
                key={m.id}
                label={m.name}
                hint={m.isActive ? m.title : `${m.title} · inactive`}
                checked={staffIds.includes(m.id)}
                onChange={on => setStaffIds(ids => (on ? [...ids, m.id] : ids.filter(id => id !== m.id)))}
              />
            ))}
          </div>
        )}
        {errors.staffIds ? <p className="mt-1.5 text-sm text-danger">{errors.staffIds}</p> : null}
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
          {service ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </form>
  );
}
