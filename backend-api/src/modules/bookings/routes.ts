import { Router } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { BookingStatus, LoyaltyReason, Prisma, Role } from '@prisma/client';
import { benefitFor } from '../../lib/membership';
import { maxRedeemable, pointsToCents, refundRedeemed } from '../../lib/loyalty';
import { toPrice } from '../../lib/money';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/errors';
import * as serialize from '../../lib/serialize';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { body, query } from '../../middleware/validate';
import { ACTIVE_STATUSES, staffFreeAt } from '../availability/service';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const include = { service: true, staff: true, review: true, location: true } satisfies Prisma.BookingInclude;

const staffLocation = async (staffId: string) =>
  (await prisma.staff.findUnique({ where: { id: staffId }, select: { locationId: true } }))?.locationId ?? null;

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
      locationId: z.string().min(1).optional(),
      startAt: startAtField,
      notes: z.string().trim().max(500).optional(),
      /** Loyalty points to spend; capped by balance and the redeem limit. */
      redeemPoints: z.number().int().min(0).optional(),
    }),
  );
  const { sub } = currentUser(req);
  const { service, staffIds } = await staffFreeAt({
    serviceId: data.serviceId,
    startAt: data.startAt,
    staffId: data.staffId,
    locationId: data.locationId,
  });
  const staffId = await chooseStaff(staffIds, data.staffId, data.startAt);
  const quote = await priceQuote(sub, service.id, data.startAt);
  const redeem = Math.min(data.redeemPoints ?? 0, quote.maxRedeemablePoints);

  try {
    const booking = await prisma.$transaction(async tx => {
      const created = await tx.booking.create({
        data: {
          customerId: sub,
          serviceId: service.id,
          staffId,
          locationId: await staffLocation(staffId),
          startAt: data.startAt,
          endAt: new Date(data.startAt.getTime() + service.durationMins * 60_000),
          priceCents: quote.priceCents,
          discountCents: quote.membership.discountCents + pointsToCents(redeem),
          pointsRedeemed: redeem,
          membershipId: quote.membership.kind ? quote.membership.membershipId : null,
          notes: data.notes,
          status: BookingStatus.CONFIRMED,
        },
        include,
      });
      if (redeem > 0) {
        // Conditional decrement so two simultaneous bookings can't overspend the balance.
        const { count } = await tx.user.updateMany({
          where: { id: sub, loyaltyPoints: { gte: redeem } },
          data: { loyaltyPoints: { decrement: redeem } },
        });
        if (count === 0) throw conflict('Your points balance has changed. Please review and try again.', 'POINTS_CHANGED');
        await tx.loyaltyTransaction.create({
          data: { userId: sub, points: -redeem, reason: LoyaltyReason.REDEEMED, bookingId: created.id },
        });
      }
      return created;
    });
    res.status(201).json({ message: 'Booking confirmed', booking: serialize.booking(booking) });
  } catch (err) {
    if (isOverlapViolation(err)) throw slotTaken();
    throw err;
  }
});

/** Price breakdown before confirming: membership saving and how many points can be used. */
async function priceQuote(userId: string, serviceId: string, startAt: Date) {
  const service = await prisma.service.findFirst({ where: { OR: [{ id: serviceId }, { slug: serviceId }] } });
  if (!service) throw notFound('Service');
  const [membership, user] = await Promise.all([
    benefitFor(userId, service.id, startAt, service.priceCents),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { loyaltyPoints: true } }),
  ]);
  const afterMembership = service.priceCents - membership.discountCents;
  return {
    priceCents: service.priceCents,
    membership,
    pointsBalance: user.loyaltyPoints,
    maxRedeemablePoints: maxRedeemable(user.loyaltyPoints, afterMembership),
    afterMembershipCents: afterMembership,
  };
}

bookingsRouter.get('/quote', async (req, res) => {
  const q = query(req, z.object({ serviceId: z.string().min(1), startAt: startAtField }));
  const quote = await priceQuote(currentUser(req).sub, q.serviceId, q.startAt);
  res.json({
    currency: config.CURRENCY,
    price: toPrice(quote.priceCents),
    membership: quote.membership.kind
      ? { planName: quote.membership.planName, kind: quote.membership.kind, discount: toPrice(quote.membership.discountCents) }
      : null,
    afterMembership: toPrice(quote.afterMembershipCents),
    points: {
      balance: quote.pointsBalance,
      maxRedeemable: quote.maxRedeemablePoints,
      pointValue: config.LOYALTY_POINT_VALUE_CENTS / 100,
    },
  });
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
  const booking = await prisma.$transaction(async tx => {
    const updated = await tx.booking.update({
      where: { id: existing.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      include,
    });
    await refundRedeemed(tx, updated);
    return updated;
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
    // Stay at the same branch unless a specific stylist was requested.
    locationId: data.staffId ? undefined : (existing.locationId ?? undefined),
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
        locationId: await staffLocation(staffId),
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
