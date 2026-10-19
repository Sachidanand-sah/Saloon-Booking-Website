'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MapPin, Pencil, Phone, Plus, Power, PowerOff, Store, Users } from 'lucide-react';
import {
  Checkbox,
  ErrorState,
  PageHeader,
  adminKeys,
  slugify,
  useAdminLocations,
  type AdminLocation,
} from '@/components/admin/common';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Textarea, fieldErrors } from '@/components/ui/field';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { cn } from '@/lib/format';
import type { Location } from '@/lib/types';

type Editing = { mode: 'create' } | { mode: 'edit'; location: AdminLocation } | null;

export default function AdminBranchesPage() {
  const locations = useAdminLocations();
  const [editing, setEditing] = useState<Editing>(null);
  const activeCount = locations.data?.filter(l => l.isActive).length ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Locations"
        title="Branches"
        intro={
          locations.data
            ? `${activeCount} active of ${locations.data.length} branch${locations.data.length === 1 ? '' : 'es'}`
            : 'Your salon locations, addresses and contact details.'
        }
        action={
          <Button variant="accent" onClick={() => setEditing({ mode: 'create' })}>
            <Plus className="size-4" aria-hidden />
            New branch
          </Button>
        }
      />

      {locations.isError ? (
        <ErrorState error={locations.error} onRetry={() => locations.refetch()} />
      ) : locations.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : locations.data.length === 0 ? (
        <EmptyState icon={Store} title="No branches yet">
          Add your first location so clients can choose where to book.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locations.data.map(l => (
            <BranchCard key={l.id} location={l} onEdit={() => setEditing({ mode: 'edit', location: l })} />
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? `Edit ${editing.location.name}` : 'New branch'}
        wide
      >
        {editing ? (
          <BranchForm
            key={editing.mode === 'edit' ? editing.location.id : 'new'}
            location={editing.mode === 'edit' ? editing.location : undefined}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function BranchPhoto({ imageUrl, name, className }: { imageUrl: string | null; name: string; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs or site paths
    return <img src={imageUrl} alt={name} className={cn('object-cover', className)} />;
  }
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-plum-900 to-plum-500', className)} aria-hidden>
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-4 size-28 rounded-full bg-white/10" />
      <Store className="absolute bottom-4 right-4 size-10 text-white/80" strokeWidth={1.25} />
    </div>
  );
}

function BranchCard({ location: l, onEdit }: { location: AdminLocation; onEdit: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const toggle = useMutation({
    mutationFn: () => (l.isActive ? api.delete<void>(`/admin/locations/${l.id}`) : api.patch(`/admin/locations/${l.id}`, { isActive: true })),
    onSuccess: () => {
      toast(l.isActive ? `${l.name} deactivated.` : `${l.name} is open for bookings again.`);
      qc.invalidateQueries({ queryKey: adminKeys.staff });
      return qc.invalidateQueries({ queryKey: adminKeys.locations });
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <li className={cn('card flex flex-col overflow-hidden transition hover:shadow-lift', !l.isActive && 'opacity-75')}>
      <BranchPhoto imageUrl={l.imageUrl} name={l.name} className="h-40 w-full" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg leading-snug">{l.name}</h3>
          {l.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <span>
            {l.addressLine1}
            {l.addressLine2 ? (
              <>
                <br />
                {l.addressLine2}
              </>
            ) : null}
            <br />
            {l.city}
          </span>
        </p>
        <div className="mt-3 space-y-1 text-sm text-muted">
          {l.phone ? (
            <p className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {l.phone}
            </p>
          ) : null}
          {l.email ? (
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{l.email}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-3">
          <Badge tone="plum">
            <Users className="size-3" aria-hidden />
            {l.staffCount} team member{l.staffCount === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-line bg-ivory/50 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          loading={toggle.isPending}
          onClick={() => {
            if (
              !l.isActive ||
              window.confirm(`Deactivate “${l.name}”? It will be hidden from the website; past bookings and team assignments are kept.`)
            ) {
              toggle.mutate();
            }
          }}
        >
          {toggle.isPending ? null : l.isActive ? <PowerOff className="size-4" aria-hidden /> : <Power className="size-4" aria-hidden />}
          {l.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </Button>
      </div>
    </li>
  );
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

function BranchForm({ location, onDone }: { location?: AdminLocation; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(location?.name ?? '');
  const [slug, setSlug] = useState(location?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!location);
  const [description, setDescription] = useState(location?.description ?? '');
  const [addressLine1, setAddressLine1] = useState(location?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(location?.addressLine2 ?? '');
  const [city, setCity] = useState(location?.city ?? '');
  const [phone, setPhone] = useState(location?.phone ?? '');
  const [email, setEmail] = useState(location?.email ?? '');
  const [latitude, setLatitude] = useState(location?.latitude != null ? String(location.latitude) : '');
  const [longitude, setLongitude] = useState(location?.longitude != null ? String(location.longitude) : '');
  const [imageUrl, setImageUrl] = useState(location?.imageUrl ?? '');
  const [sortOrder, setSortOrder] = useState(String(location?.sortOrder ?? 0));
  const [isActive, setActive] = useState(location?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const lat = numOrNull(latitude);
  const lng = numOrNull(longitude);
  const hasCoords = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      location ? api.patch<Location>(`/admin/locations/${location.id}`, payload) : api.post<Location>('/admin/locations', payload),
    onSuccess: l => {
      toast(location ? 'Branch updated.' : `${l.name} created. Assign team members to it from the Team page.`);
      qc.invalidateQueries({ queryKey: adminKeys.locations });
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
    if (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) local.latitude = 'Enter a latitude between -90 and 90';
    if (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180)) local.longitude = 'Enter a longitude between -180 and 180';
    if ((lat === null) !== (lng === null)) local[lat === null ? 'latitude' : 'longitude'] = 'Enter both coordinates or neither';
    if (!Number.isInteger(Number(sortOrder))) local.sortOrder = 'Enter a whole number';
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
      description: description.trim() || null,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || null,
      city: city.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      latitude: lat,
      longitude: lng,
      imageUrl: imageUrl.trim() || null,
      sortOrder: Number(sortOrder),
      isActive,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          required
          placeholder="Lalima Thamel"
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
        label="Description (optional)"
        rows={3}
        value={description}
        error={errors.description}
        hint="Shown on the website."
        onChange={e => setDescription(e.target.value)}
      />

      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-medium text-plum-900">Address</legend>
        <Input label="Address line 1" required value={addressLine1} error={errors.addressLine1} onChange={e => setAddressLine1(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Address line 2 (optional)"
            value={addressLine2}
            error={errors.addressLine2}
            onChange={e => setAddressLine2(e.target.value)}
          />
          <Input label="City" required value={city} error={errors.city} onChange={e => setCity(e.target.value)} />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone (optional)" type="tel" value={phone} error={errors.phone} onChange={e => setPhone(e.target.value)} />
        <Input label="Email (optional)" type="email" value={email} error={errors.email} onChange={e => setEmail(e.target.value)} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-plum-900">Map location (optional)</legend>
        <p className="mt-1 text-sm text-muted">Right-click the place in Google Maps to copy coordinates.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Input
            label="Latitude"
            type="number"
            inputMode="decimal"
            step="any"
            min={-90}
            max={90}
            placeholder="51.5072"
            value={latitude}
            error={errors.latitude}
            onChange={e => setLatitude(e.target.value)}
          />
          <Input
            label="Longitude"
            type="number"
            inputMode="decimal"
            step="any"
            min={-180}
            max={180}
            placeholder="-0.1276"
            value={longitude}
            error={errors.longitude}
            onChange={e => setLongitude(e.target.value)}
          />
        </div>
        {hasCoords ? (
          <iframe
            title={`Map preview for ${name || 'this branch'}`}
            src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-3 h-48 w-full rounded-xl border border-line"
          />
        ) : null}
      </fieldset>

      <div className="flex items-start gap-4">
        <BranchPhoto imageUrl={imageUrl.trim() || null} name={name || 'Branch photo'} className="size-20 shrink-0 rounded-xl" />
        <Input
          label="Photo URL (optional)"
          placeholder="https://… or /images/branches/downtown.jpg"
          value={imageUrl}
          error={errors.imageUrl}
          hint="A full image URL or a path on this site"
          className="min-w-0 flex-1"
          onChange={e => setImageUrl(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Display order"
          type="number"
          inputMode="numeric"
          step={1}
          value={sortOrder}
          error={errors.sortOrder}
          hint="Lower numbers are listed first"
          onChange={e => setSortOrder(e.target.value)}
        />
        <div className="sm:pt-7">
          <Checkbox label="Active" hint="Visible on the website and bookable" checked={isActive} onChange={setActive} />
        </div>
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
          {location ? 'Save changes' : 'Create branch'}
        </Button>
      </div>
    </form>
  );
}
