import { DateTime } from 'luxon';
import { BookingStatus, type Prisma } from '@prisma/client';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import { freeSlots, localDayBounds, shiftsForDate } from './slots';

/** Statuses that occupy a stylist's time. */
export const ACTIVE_STATUSES: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

export type Slot = { startAt: string; endAt: string; staffIds: string[] };

type Query = {
  serviceId: string;
  date: string;
  staffId?: string;
  /** Limit to stylists at one branch (id or slug). */
  locationId?: string;
  /** Booking to ignore when checking conflicts (used when rescheduling). */
  excludeBookingId?: string;
  now?: Date;
};

export function salonToday(now = new Date()) {
  return DateTime.fromJSDate(now, { zone: config.SALON_TIMEZONE }).toISODate()!;
}

export async function getAvailability(q: Query) {
  const now = q.now ?? new Date();
  const zone = config.SALON_TIMEZONE;
  const bounds = localDayBounds(q.date, zone);
  if (!bounds) throw badRequest('date must be in YYYY-MM-DD format');

  const today = salonToday(now);
  const lastDay = DateTime.fromISO(today, { zone }).plus({ days: config.BOOKING_WINDOW_DAYS }).toISODate()!;
  if (q.date < today || q.date > lastDay) {
    throw badRequest(`Bookings can be made from ${today} to ${lastDay}`);
  }

  const service = await prisma.service.findFirst({
    where: { OR: [{ id: q.serviceId }, { slug: q.serviceId }], isActive: true },
  });
  if (!service) throw notFound('Service');

  const staffWhere: Prisma.StaffWhereInput = {
    isActive: true,
    // Stylists at a closed (deactivated) branch can't be booked.
    NOT: { location: { isActive: false } },
    services: { some: { serviceId: service.id } },
    ...(q.staffId ? { id: q.staffId } : {}),
    ...(q.locationId ? { location: { OR: [{ id: q.locationId }, { slug: q.locationId }] } } : {}),
  };
  const staff = await prisma.staff.findMany({
    where: staffWhere,
    include: { workingHours: true },
    orderBy: { name: 'asc' },
  });
  if (q.staffId && staff.length === 0) throw notFound('Stylist for this service');

  const bookings = await prisma.booking.findMany({
    where: {
      staffId: { in: staff.map(s => s.id) },
      status: { in: ACTIVE_STATUSES },
      startAt: { lt: bounds.end },
      endAt: { gt: bounds.start },
      ...(q.excludeBookingId ? { id: { not: q.excludeBookingId } } : {}),
    },
    select: { staffId: true, startAt: true, endAt: true },
  });

  const notBefore = new Date(now.getTime() + config.MIN_LEAD_MINS * 60_000);
  const byStart = new Map<number, Slot>();

  for (const member of staff) {
    const starts = freeSlots({
      shifts: shiftsForDate(q.date, zone, member.workingHours),
      busy: bookings.filter(b => b.staffId === member.id).map(b => ({ start: b.startAt, end: b.endAt })),
      durationMins: service.durationMins,
      stepMins: config.SLOT_STEP_MINS,
      notBefore,
    });
    for (const start of starts) {
      const key = start.getTime();
      const slot = byStart.get(key) ?? {
        startAt: start.toISOString(),
        endAt: new Date(key + service.durationMins * 60_000).toISOString(),
        staffIds: [],
      };
      slot.staffIds.push(member.id);
      byStart.set(key, slot);
    }
  }

  return {
    date: q.date,
    timezone: zone,
    service: { id: service.id, name: service.name, durationMins: service.durationMins },
    staff: staff.map(s => ({ id: s.id, name: s.name, title: s.title, avatarUrl: s.avatarUrl })),
    slots: [...byStart.entries()].sort(([a], [b]) => a - b).map(([, slot]) => slot),
  };
}

/** Returns the stylists free at exactly `startAt` for the service, per the same rules as the public slot list. */
export async function staffFreeAt(opts: {
  serviceId: string;
  startAt: Date;
  staffId?: string;
  locationId?: string;
  excludeBookingId?: string;
}) {
  const date = DateTime.fromJSDate(opts.startAt, { zone: config.SALON_TIMEZONE }).toISODate()!;
  const availability = await getAvailability({ ...opts, date });
  const slot = availability.slots.find(s => s.startAt === opts.startAt.toISOString());
  return { service: availability.service, staffIds: slot?.staffIds ?? [] };
}
