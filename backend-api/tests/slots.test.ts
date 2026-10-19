import { describe, expect, it } from 'vitest';
import { freeSlots, localDayBounds, shiftsForDate } from '../src/modules/availability/slots';

const iso = (dates: Date[]) => dates.map(d => d.toISOString());

describe('shiftsForDate', () => {
  it('converts salon-local hours to UTC (Kathmandu is UTC+05:45)', () => {
    // 2026-10-20 is a Tuesday (ISO weekday 2).
    const shifts = shiftsForDate('2026-10-20', 'Asia/Kathmandu', [{ dayOfWeek: 2, startMinute: 540, endMinute: 1020 }]);
    expect(shifts).toEqual([{ start: new Date('2026-10-20T03:15:00Z'), end: new Date('2026-10-20T11:15:00Z') }]);
  });

  it('ignores other weekdays', () => {
    expect(shiftsForDate('2026-10-19', 'UTC', [{ dayOfWeek: 2, startMinute: 540, endMinute: 600 }])).toEqual([]);
  });

  it('uses wall-clock times on DST change days', () => {
    // US clocks spring forward on 2026-03-08 (a Sunday); 09:00 local is then UTC-4.
    const [shift] = shiftsForDate('2026-03-08', 'America/New_York', [{ dayOfWeek: 7, startMinute: 540, endMinute: 600 }]);
    expect(shift.start.toISOString()).toBe('2026-03-08T13:00:00.000Z');
  });
});

describe('localDayBounds', () => {
  it('rejects malformed dates', () => {
    expect(localDayBounds('2026-13-01', 'UTC')).toBeNull();
    expect(localDayBounds('20261001', 'UTC')).toBeNull();
  });
});

describe('freeSlots', () => {
  const shift = { start: new Date('2026-10-20T09:00:00Z'), end: new Date('2026-10-20T11:00:00Z') };
  const base = { shifts: [shift], busy: [], durationMins: 60, stepMins: 30, notBefore: new Date(0) };

  it('only offers starts where the whole appointment fits in the shift', () => {
    expect(iso(freeSlots(base))).toEqual([
      '2026-10-20T09:00:00.000Z',
      '2026-10-20T09:30:00.000Z',
      '2026-10-20T10:00:00.000Z',
    ]);
  });

  it('skips starts that overlap a booking but allows back-to-back', () => {
    const busy = [{ start: new Date('2026-10-20T10:00:00Z'), end: new Date('2026-10-20T10:30:00Z') }];
    expect(iso(freeSlots({ ...base, busy }))).toEqual(['2026-10-20T09:00:00.000Z']);
  });

  it('respects the minimum lead time', () => {
    expect(iso(freeSlots({ ...base, notBefore: new Date('2026-10-20T09:15:00Z') }))).toEqual([
      '2026-10-20T09:30:00.000Z',
      '2026-10-20T10:00:00.000Z',
    ]);
  });
});
