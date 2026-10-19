import { DateTime } from 'luxon';

export type Interval = { start: Date; end: Date };
export type WeeklyShift = { dayOfWeek: number; startMinute: number; endMinute: number };

/** Salon-local calendar day → [start, end) in UTC. Returns null for malformed dates. */
export function localDayBounds(date: string, zone: string): Interval | null {
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { start: day.startOf('day').toJSDate(), end: day.plus({ days: 1 }).startOf('day').toJSDate() };
}

/** Expands weekly working hours into concrete UTC intervals for one salon-local date. */
export function shiftsForDate(date: string, zone: string, hours: WeeklyShift[]): Interval[] {
  const day = DateTime.fromISO(date, { zone }).startOf('day');
  const at = (minute: number) => day.set({ hour: Math.floor(minute / 60), minute: minute % 60 }).toJSDate();
  return hours
    .filter(h => h.dayOfWeek === day.weekday && h.endMinute > h.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute)
    .map(h => ({ start: at(h.startMinute), end: at(h.endMinute) }));
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Start times (UTC) at which an appointment of `durationMins` fits inside a shift,
 * doesn't overlap any busy interval, and isn't earlier than `notBefore`.
 * Candidates are spaced `stepMins` apart from each shift's start.
 */
export function freeSlots(opts: {
  shifts: Interval[];
  busy: Interval[];
  durationMins: number;
  stepMins: number;
  notBefore: Date;
}): Date[] {
  const { shifts, busy, durationMins, stepMins, notBefore } = opts;
  const durationMs = durationMins * 60_000;
  const stepMs = stepMins * 60_000;
  const slots: Date[] = [];

  for (const shift of shifts) {
    for (let t = shift.start.getTime(); t + durationMs <= shift.end.getTime(); t += stepMs) {
      const candidate = { start: new Date(t), end: new Date(t + durationMs) };
      if (candidate.start < notBefore) continue;
      if (busy.some(b => overlaps(candidate, b))) continue;
      slots.push(candidate.start);
    }
  }
  return slots;
}
