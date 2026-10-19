import type { WorkingHours } from '@prisma/client';

export type OpeningHours = { dayOfWeek: number; open: number | null; close: number | null };

/** A branch is open whenever at least one of its stylists is working: the outer bounds per weekday. */
export function openingHours(hours: Pick<WorkingHours, 'dayOfWeek' | 'startMinute' | 'endMinute'>[]): OpeningHours[] {
  return [1, 2, 3, 4, 5, 6, 7].map(dayOfWeek => {
    const shifts = hours.filter(h => h.dayOfWeek === dayOfWeek);
    return shifts.length
      ? {
          dayOfWeek,
          open: Math.min(...shifts.map(s => s.startMinute)),
          close: Math.max(...shifts.map(s => s.endMinute)),
        }
      : { dayOfWeek, open: null, close: null };
  });
}
