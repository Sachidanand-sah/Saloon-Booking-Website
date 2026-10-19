'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Mail, MapPin, Pencil, Plus, Scissors, Trash2, UserPlus, Users } from 'lucide-react';
import {
  Checkbox,
  ErrorState,
  PageHeader,
  adminKeys,
  hhmmToMinutes,
  minutesToHHMM,
  useAdminLocations,
  useAdminServices,
  useAdminStaff,
  type AdminLocation,
  type AdminStaff,
  type WorkingShift,
} from '@/components/admin/common';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, fieldErrors } from '@/components/ui/field';
import { Avatar, Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { RequestError, api, errorMessage } from '@/lib/client';
import { DAY_NAMES, cn, minutesToLabel } from '@/lib/format';
import type { StaffSummary } from '@/lib/types';

type Editing = { mode: 'create' } | { mode: 'edit'; id: string } | null;

const weeklyMinutes = (hours: WorkingShift[]) => hours.reduce((n, h) => n + (h.endMinute - h.startMinute), 0);

function hoursLabel(mins: number) {
  const h = Math.round((mins / 60) * 10) / 10;
  return `${h} hr${h === 1 ? '' : 's'}`;
}

export default function AdminStaffPage() {
  const staff = useAdminStaff();
  const locations = useAdminLocations();
  const [editing, setEditing] = useState<Editing>(null);
  const [branch, setBranch] = useState('all');
  const editingMember = editing?.mode === 'edit' ? staff.data?.find(s => s.id === editing.id) : undefined;

  const branchName = (id: string | null) => (id ? locations.data?.find(l => l.id === id)?.name : undefined);
  const list = (staff.data ?? []).filter(m => branch === 'all' || (branch === 'none' ? !m.locationId : m.locationId === branch));
  const branchFilters = locations.data?.length
    ? [
        { id: 'all', name: 'All' },
        ...locations.data.map(l => ({ id: l.id, name: l.name })),
        ...(staff.data?.some(m => !m.locationId) ? [{ id: 'none', name: 'Not assigned' }] : []),
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="People"
        title="Team"
        intro="Profiles, the services each stylist offers, and their weekly schedule."
        action={
          <Button variant="accent" onClick={() => setEditing({ mode: 'create' })}>
            <UserPlus className="size-4" aria-hidden />
            Add team member
          </Button>
        }
      />

      {branchFilters.length > 0 ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by branch">
          {branchFilters.map(b => (
            <button
              key={b.id}
              type="button"
              aria-pressed={branch === b.id}
              onClick={() => setBranch(b.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                branch === b.id
                  ? 'border-plum-900 bg-plum-900 text-white'
                  : 'border-line bg-white text-plum-800 hover:border-plum-200 hover:bg-plum-50',
              )}
            >
              {b.name}
              {b.id !== 'all' ? (
                <span className={cn('ml-1.5 text-xs', branch === b.id ? 'text-rose-300' : 'text-muted')}>
                  {staff.data?.filter(m => (b.id === 'none' ? !m.locationId : m.locationId === b.id)).length ?? ''}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {staff.isError ? (
        <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
      ) : staff.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : staff.data.length === 0 ? (
        <EmptyState icon={Users} title="No team members yet">
          Add your first stylist to start accepting bookings.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title="No one here yet">
          Assign team members to this branch from their profile.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(m => (
            <StaffCard
              key={m.id}
              member={m}
              branchName={branchName(m.locationId)}
              onEdit={() => setEditing({ mode: 'edit', id: m.id })}
            />
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editingMember ? editingMember.name : 'Add team member'}
        wide={editing?.mode === 'edit'}
      >
        {editing?.mode === 'create' ? (
          <ProfileForm locations={locations.data} onDone={() => setEditing(null)} />
        ) : editingMember ? (
          <EditMember key={editingMember.id} member={editingMember} locations={locations.data} onDone={() => setEditing(null)} />
        ) : null}
      </Modal>
    </div>
  );
}

function StaffCard({ member: m, branchName, onEdit }: { member: AdminStaff; branchName?: string; onEdit: () => void }) {
  const days = new Set(m.workingHours.map(h => h.dayOfWeek));
  const total = weeklyMinutes(m.workingHours);
  return (
    <li className={cn('card flex flex-col p-5 transition hover:shadow-lift', !m.isActive && 'opacity-75')}>
      <div className="flex items-start gap-4">
        <Avatar name={m.name} src={m.avatarUrl} className="size-14 shrink-0 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg leading-snug">{m.name}</h3>
            {m.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
          </div>
          <p className="truncate text-sm text-muted">{m.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{branchName ?? 'No branch assigned'}</span>
          </p>
          {m.email ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{m.email}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-plum-800">
        <span className="inline-flex items-center gap-1.5">
          <Scissors className="size-4 text-rose-500" aria-hidden />
          {m.serviceIds.length} service{m.serviceIds.length === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 text-rose-500" aria-hidden />
          {days.size ? `${days.size} day${days.size === 1 ? '' : 's'} · ${hoursLabel(total)}/week` : 'No hours set'}
        </span>
      </div>

      <div className="mt-3 flex gap-1" aria-label={`Works ${DAY_NAMES.filter((_, i) => days.has(i + 1)).join(', ') || 'no days'}`}>
        {DAY_NAMES.map((d, i) => (
          <span
            key={d}
            aria-hidden
            className={cn(
              'flex h-7 flex-1 items-center justify-center rounded-md text-[0.7rem] font-semibold',
              days.has(i + 1) ? 'bg-plum-100 text-plum-800' : 'bg-sand/60 text-muted/60',
            )}
          >
            {d.slice(0, 2)}
          </span>
        ))}
      </div>

      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </Button>
      </div>
    </li>
  );
}

// ---------- Edit modal with tabs ----------

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'services', label: 'Services' },
  { id: 'hours', label: 'Working hours' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function EditMember({ member, locations, onDone }: { member: AdminStaff; locations?: AdminLocation[]; onDone: () => void }) {
  const [tab, setTab] = useState<TabId>('profile');
  return (
    <div>
      <div role="tablist" aria-label="Edit sections" className="mb-6 flex gap-1 rounded-full bg-sand/70 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition',
              tab === t.id ? 'bg-white text-plum-900 shadow-soft' : 'text-muted hover:text-plum-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Panels stay mounted so unsaved edits survive switching tabs. */}
      <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" hidden={tab !== 'profile'}>
        <ProfileForm member={member} locations={locations} onDone={onDone} />
      </div>
      <div role="tabpanel" id="panel-services" aria-labelledby="tab-services" hidden={tab !== 'services'}>
        <ServicesForm member={member} onDone={onDone} />
      </div>
      <div role="tabpanel" id="panel-hours" aria-labelledby="tab-hours" hidden={tab !== 'hours'}>
        <HoursForm member={member} onDone={onDone} />
      </div>
    </div>
  );
}

function FormFooter({ onCancel, loading, label, error }: { onCancel: () => void; loading: boolean; label: string; error?: string }) {
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {label}
        </Button>
      </div>
    </>
  );
}

// ---------- Profile ----------

function ProfileForm({ member, locations, onDone }: { member?: AdminStaff; locations?: AdminLocation[]; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(member?.name ?? '');
  const [title, setTitle] = useState(member?.title ?? '');
  const [bio, setBio] = useState(member?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(member?.avatarUrl ?? '');
  const [locationId, setLocationId] = useState(member?.locationId ?? '');
  const [isActive, setActive] = useState(member?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      member ? api.patch<StaffSummary>(`/admin/staff/${member.id}`, payload) : api.post<StaffSummary>('/admin/staff', payload),
    onSuccess: s => {
      toast(member ? 'Profile saved.' : `${s.name} added to the team. Set their services and hours next.`);
      qc.invalidateQueries({ queryKey: adminKeys.staff });
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
    setErrors({});
    setFormError('');
    save.mutate({
      name: name.trim(),
      title: title.trim(),
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      locationId: locationId || null,
      ...(member ? { isActive } : {}),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="flex items-center gap-4">
        <Avatar name={name || 'New member'} src={avatarUrl.trim() || null} className="size-16 shrink-0 text-xl" />
        <p className="text-sm text-muted">Paste an image URL to use a photo; otherwise initials are shown.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required value={name} error={errors.name} onChange={e => setName(e.target.value)} />
        <Input
          label="Title"
          required
          placeholder="Senior Stylist"
          value={title}
          error={errors.title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      <Textarea label="Bio (optional)" rows={4} value={bio} error={errors.bio} onChange={e => setBio(e.target.value)} />
      <Input
        label="Photo URL (optional)"
        type="url"
        placeholder="https://…"
        value={avatarUrl}
        error={errors.avatarUrl}
        onChange={e => setAvatarUrl(e.target.value)}
      />
      <Select
        label="Branch"
        value={locationId}
        error={errors.locationId}
        hint="The location this team member works at."
        onChange={e => setLocationId(e.target.value)}
      >
        <option value="">Not assigned</option>
        {locations
          ?.filter(l => l.isActive || l.id === locationId)
          .map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.isActive ? '' : ' (inactive)'}
            </option>
          ))}
      </Select>
      {member ? (
        <Checkbox
          label="Active"
          hint="Inactive team members can’t be booked and are hidden from the website"
          checked={isActive}
          onChange={setActive}
        />
      ) : null}
      <FormFooter onCancel={onDone} loading={save.isPending} label={member ? 'Save profile' : 'Add team member'} error={formError} />
    </form>
  );
}

// ---------- Services ----------

function ServicesForm({ member, onDone }: { member: AdminStaff; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const services = useAdminServices();
  const [ids, setIds] = useState<string[]>(member.serviceIds);

  const save = useMutation({
    mutationFn: () => api.put(`/admin/staff/${member.id}/services`, { serviceIds: ids }),
    onSuccess: () => {
      toast(`Services updated for ${member.name}.`);
      qc.invalidateQueries({ queryKey: adminKeys.staff });
      qc.invalidateQueries({ queryKey: adminKeys.services });
      onDone();
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-5"
    >
      <fieldset>
        <legend className="text-sm text-muted">Choose the treatments {member.name} can be booked for.</legend>
        {services.isPending ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : services.isError ? (
          <div className="mt-3">
            <ErrorState error={services.error} onRetry={() => services.refetch()} />
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setIds(services.data.map(s => s.id))}>
                Select all
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIds([])}>
                Clear
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {services.data.map(s => (
                <Checkbox
                  key={s.id}
                  label={s.name}
                  hint={`${s.category?.name ?? 'Service'}${s.isActive ? '' : ' · inactive'}`}
                  checked={ids.includes(s.id)}
                  onChange={on => setIds(cur => (on ? [...cur, s.id] : cur.filter(id => id !== s.id)))}
                />
              ))}
            </div>
          </>
        )}
      </fieldset>
      <FormFooter onCancel={onDone} loading={save.isPending} label={`Save ${ids.length} service${ids.length === 1 ? '' : 's'}`} />
    </form>
  );
}

// ---------- Working hours ----------

type Shift = { key: number; start: string; end: string };
let shiftKey = 0;
const newShift = (start = '09:00', end = '17:00'): Shift => ({ key: ++shiftKey, start, end });

function toWeek(hours: WorkingShift[]): Shift[][] {
  return DAY_NAMES.map((_, i) =>
    hours
      .filter(h => h.dayOfWeek === i + 1)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map(h => newShift(minutesToHHMM(h.startMinute), minutesToHHMM(h.endMinute))),
  );
}

function validateWeek(week: Shift[][]) {
  for (const [i, shifts] of week.entries()) {
    const sorted = shifts.map(s => [hhmmToMinutes(s.start), hhmmToMinutes(s.end)]).sort((a, b) => a[0] - b[0]);
    for (const [j, [start, end]] of sorted.entries()) {
      if (end <= start) return `${DAY_NAMES[i]}: each shift must end after it starts.`;
      if (j > 0 && start < sorted[j - 1][1]) return `${DAY_NAMES[i]}: shifts overlap.`;
    }
  }
  return '';
}

function HoursForm({ member, onDone }: { member: AdminStaff; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [week, setWeek] = useState<Shift[][]>(() => toWeek(member.workingHours));
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (hours: WorkingShift[]) => api.put(`/admin/staff/${member.id}/hours`, hours),
    onSuccess: () => {
      toast(`Working hours saved for ${member.name}.`);
      qc.invalidateQueries({ queryKey: adminKeys.staff });
      qc.invalidateQueries({ queryKey: ['salon'] });
      onDone();
    },
    onError: e => setError(errorMessage(e)),
  });

  const updateDay = (day: number, fn: (shifts: Shift[]) => Shift[]) => {
    setError('');
    setWeek(w => w.map((shifts, i) => (i === day ? fn(shifts) : shifts)));
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateWeek(week);
    if (problem) {
      setError(problem);
      return;
    }
    save.mutate(
      week.flatMap((shifts, i) =>
        shifts.map(s => ({ dayOfWeek: i + 1, startMinute: hhmmToMinutes(s.start), endMinute: hhmmToMinutes(s.end) })),
      ),
    );
  }

  const total = week.flat().reduce((n, s) => n + Math.max(0, hhmmToMinutes(s.end) - hhmmToMinutes(s.start)), 0);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Add one or more shifts per day. Leave a day empty when closed.</p>
        <Badge tone="plum">{hoursLabel(total)} / week</Badge>
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {week.map((shifts, day) => {
          const dayName = DAY_NAMES[day];
          return (
            <li key={dayName} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start">
              <p className="w-28 shrink-0 pt-2 font-medium text-plum-900">{dayName}</p>
              <div className="min-w-0 flex-1 space-y-2">
                {shifts.length === 0 ? (
                  <p className="pt-2 text-sm text-muted">Closed</p>
                ) : (
                  shifts.map((s, idx) => (
                    <div key={s.key} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        step={300}
                        aria-label={`${dayName} shift ${idx + 1} start`}
                        value={s.start}
                        onChange={e => updateDay(day, list => list.map(x => (x.key === s.key ? { ...x, start: e.target.value } : x)))}
                        className="h-10 w-[7.5rem] rounded-lg border border-line bg-white px-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100"
                      />
                      <span className="text-sm text-muted">to</span>
                      <input
                        type="time"
                        step={300}
                        aria-label={`${dayName} shift ${idx + 1} end`}
                        value={s.end}
                        onChange={e => updateDay(day, list => list.map(x => (x.key === s.key ? { ...x, end: e.target.value } : x)))}
                        className="h-10 w-[7.5rem] rounded-lg border border-line bg-white px-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100"
                      />
                      <button
                        type="button"
                        onClick={() => updateDay(day, list => list.filter(x => x.key !== s.key))}
                        aria-label={`Remove ${dayName} shift ${idx + 1}`}
                        className="rounded-full p-2 text-muted transition hover:bg-rose-50 hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() =>
                  updateDay(day, list => {
                    const last = list.at(-1);
                    if (!last) return [newShift()];
                    const start = Math.min(hhmmToMinutes(last.end) + 60, 22 * 60);
                    return [...list, newShift(minutesToHHMM(start), minutesToHHMM(Math.min(start + 120, 1439)))];
                  })
                }
                aria-label={`Add shift on ${dayName}`}
              >
                <Plus className="size-4" aria-hidden />
                Add shift
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        Example: {minutesToLabel(9 * 60)}–{minutesToLabel(13 * 60)} and {minutesToLabel(14 * 60)}–{minutesToLabel(18 * 60)} for a lunch break.
      </p>
      <FormFooter onCancel={onDone} loading={save.isPending} label="Save hours" error={error} />
    </form>
  );
}
