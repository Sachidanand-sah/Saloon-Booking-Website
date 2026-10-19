import { Router } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/errors';
import * as serialize from '../../lib/serialize';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { body, query } from '../../middleware/validate';
import { ACTIVE_STATUSES, staffFreeAt } from '../availability/service';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const include = { service: true, staff: true, review: true } satisfies Prisma.BookingInclude;

const startAtField = z
  .string()
  .datetime({ offset: true, message: 'must be an ISO 8601 date-time' })
  .transform(s => new Date(s));

const slotTaken = () =>
  conflict('Sorry, that time is no longer available. Please choose another slot.', 'SLOT_UNAVAILABLE');

/** The DB exclusion constraint is the final guard against two requests grabbing the same slot. */
function isOverlapViolation(err: unknown) {
  return err instanceof Error && err.message.includes('booking_no_overlap');
}

/** Picks the requested stylist if free, otherwise the free stylist with the lightest day. */
async function chooseStaff(free: string[], requested: string | undefined, startAt: Date) {
  if (requested) {
    if (!free.includes(requested)) throw slotTaken();
    return requested;
  }
  if (free.length === 0) throw slotTaken();
  if (free.length === 1) return free[0];

  const day = DateTime.fromJSDate(startAt, { zone: config.SALON_TIMEZONE });
  const loads = await prisma.booking.groupBy({
    by: ['staffId'],
    where: {
      staffId: { in: free },
      status: { in: ACTIVE_STATUSES },
      startAt: { gte: day.startOf('day').toJSDate(), lt: day.endOf('day').toJSDate() },
    },
    _count: true,
  });
  const load = (id: string) => loads.find(l => l.staffId === id)?._count ?? 0;
  return [...free].sort((a, b) => load(a) - load(b))[0];
}

async function loadOwnBooking(id: string, userId: string, role: Role) {
  const booking = await prisma.booking.findUnique({ where: { id }, include });
  if (!booking) throw notFound('Booking');
  if (booking.customerId !== userId && role !== Role.ADMIN) throw forbidden();
  return booking;
}

function assertChangeable(b: { status: BookingStatus; startAt: Date }, action: string) {
  if (!ACTIVE_STATUSES.includes(b.status)) throw badRequest(`This booking can no longer be ${action}`);
  const cutoff = b.startAt.getTime() - config.CANCEL_CUTOFF_MINS * 60_000;
  if (Date.now() > cutoff) {
    throw new HttpError(
      422,
      'TOO_LATE',
      `Bookings can only be ${action} up to ${config.CANCEL_CUTOFF_MINS} minutes before the appointment. Please call the salon.`,
    );
  }
}

bookingsRouter.post('/', async (req, res) => {
  const data = body(
    req,
    z.object({
      serviceId: z.string().min(1),
      staffId: z.string().min(1).optional(),
      startAt: startAtField,
      notes: z.string().trim().max(500).optional(),
    }),
  );
  const { sub } = currentUser(req);
  const { service, staffIds } = await staffFreeAt({
    serviceId: data.serviceId,
    startAt: data.startAt,
    staffId: data.staffId,
  });
  const staffId = await chooseStaff(staffIds, data.staffId, data.startAt);
  const { priceCents } = await prisma.service.findUniqueOrThrow({
    where: { id: service.id },
    select: { priceCents: true },
  });

  try {
    const booking = await prisma.booking.create({
      data: {
        customerId: sub,
        serviceId: service.id,
        staffId,
        startAt: data.startAt,
        endAt: new Date(data.startAt.getTime() + service.durationMins * 60_000),
        priceCents,
        notes: data.notes,
        status: BookingStatus.CONFIRMED,
      },
      include,
    });
    res.status(201).json({ message: 'Booking confirmed', booking: serialize.booking(booking) });
  } catch (err) {
    if (isOverlapViolation(err)) throw slotTaken();
    throw err;
  }
});

bookingsRouter.get('/', async (req, res) => {
  const q = query(req, z.object({ scope: z.enum(['upcoming', 'past', 'all']).default('all') }));
  const now = new Date();
  const where: Prisma.BookingWhereInput = { customerId: currentUser(req).sub };
  if (q.scope === 'upcoming') Object.assign(where, { endAt: { gte: now }, status: { in: ACTIVE_STATUSES } });
  if (q.scope === 'past') where.OR = [{ endAt: { lt: now } }, { status: { notIn: ACTIVE_STATUSES } }];

  const bookings = await prisma.booking.findMany({
    where,
    include,
    orderBy: { startAt: q.scope === 'upcoming' ? 'asc' : 'desc' },
  });
  res.json(bookings.map(b => serialize.booking(b, now)));
});

/** A stylist's own appointments for one salon-local day (admins may pass any staffId). */
bookingsRouter.get('/schedule', requireRole(Role.STAFF, Role.ADMIN), async (req, res) => {
  const q = query(
    req,
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), staffId: z.string().optional() }),
  );
  const { sub, role } = currentUser(req);
  let staffId = q.staffId;
  if (role === Role.STAFF || !staffId) {
    const own = await prisma.staff.findUnique({ where: { userId: sub } });
    if (!own) throw notFound('Stylist profile for this account');
    staffId = own.id;
  }
  const day = q.date
    ? DateTime.fromISO(q.date, { zone: config.SALON_TIMEZONE })
    : DateTime.now().setZone(config.SALON_TIMEZONE);
  const bookings = await prisma.booking.findMany({
    where: { staffId, startAt: { gte: day.startOf('day').toJSDate(), lt: day.endOf('day').toJSDate() } },
    include: { ...include, customer: true },
    orderBy: { startAt: 'asc' },
  });
  res.json(bookings.map(b => serialize.booking(b)));
});

bookingsRouter.get('/:id', async (req, res) => {
  const { sub, role } = currentUser(req);
  res.json(serialize.booking(await loadOwnBooking(req.params.id, sub, role)));
});

bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { sub, role } = currentUser(req);
  const existing = await loadOwnBooking(req.params.id, sub, role);
  if (role !== Role.ADMIN) assertChangeable(existing, 'cancelled');
  const booking = await prisma.booking.update({
    where: { id: existing.id },
    data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    include,
  });
  res.json({ message: 'Booking cancelled', booking: serialize.booking(booking) });
});

bookingsRouter.post('/:id/reschedule', async (req, res) => {
  const data = body(req, z.object({ startAt: startAtField, staffId: z.string().min(1).optional() }));
  const { sub, role } = currentUser(req);
  const existing = await loadOwnBooking(req.params.id, sub, role);
  if (role !== Role.ADMIN) assertChangeable(existing, 'rescheduled');

  const { service, staffIds } = await staffFreeAt({
    serviceId: existing.serviceId,
    startAt: data.startAt,
    staffId: data.staffId,
    excludeBookingId: existing.id,
  });
  // Keep the same stylist when they're free and none was requested.
  const preferred = data.staffId ?? (staffIds.includes(existing.staffId) ? existing.staffId : undefined);
  const staffId = await chooseStaff(staffIds, preferred, data.startAt);

  try {
    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        staffId,
        startAt: data.startAt,
        endAt: new Date(data.startAt.getTime() + service.durationMins * 60_000),
      },
      include,
    });
    res.json({ message: 'Booking rescheduled', booking: serialize.booking(booking) });
  } catch (err) {
    if (isOverlapViolation(err)) throw slotTaken();
    throw err;
  }
});

bookingsRouter.post('/:id/review', async (req, res) => {
  const data = body(
    req,
    z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }),
  );
  const { sub } = currentUser(req);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include });
  if (!booking || booking.customerId !== sub) throw notFound('Booking');
  if (booking.status !== BookingStatus.COMPLETED) throw badRequest('You can review a visit once it is completed');
  if (booking.review) throw conflict('You have already reviewed this visit');
  const review = await prisma.review.create({ data: { bookingId: booking.id, customerId: sub, ...data } });
  res.status(201).json({ message: 'Thanks for your review!', review });
});
