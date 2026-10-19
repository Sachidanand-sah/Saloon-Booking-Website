import { Router } from 'express';
import { z } from 'zod';
import {
  EventRequestStatus,
  LoyaltyReason,
  MembershipStatus,
  ReservationStatus,
  Role,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import { toCents } from '../../lib/money';
import { addPoints, lifetimePoints, tierFor } from '../../lib/loyalty';
import { usage } from '../../lib/membership';
import * as serialize from '../../lib/serialize-extras';
import { requireAuth, requireRole } from '../../middleware/auth';
import { body, query } from '../../middleware/validate';

/** Admin endpoints for packages, loyalty, events and products. Mounted at /api/admin. */
export const adminExtrasRouter = Router();
adminExtrasRouter.use(requireAuth, requireRole(Role.ADMIN));

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use lowercase letters, numbers and dashes');
const imageRef = z
  .string()
  .trim()
  .refine(v => /^https?:\/\//.test(v) || /^\/[\w\-./]+$/.test(v), 'must be an image URL or a /path');
const price = z.number().min(0).max(10_000_000);
const search = (q?: string): Prisma.UserWhereInput | undefined =>
  q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      }
    : undefined;

// ============================================================================
// Monthly packages
// ============================================================================

const planInclude = { items: { include: { service: true } } };

const planInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug,
  tagline: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().min(10).max(1000),
  price,
  durationDays: z.number().int().min(1).max(366).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  perks: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  items: z
    .array(z.object({ serviceId: z.string().min(1), quantity: z.number().int().min(1).max(31) }))
    .max(20)
    .optional(),
});

function planData(input: Partial<z.infer<typeof planInput>>) {
  const { price: p, items: _items, ...rest } = input;
  return { ...rest, ...(p !== undefined ? { priceCents: toCents(p) } : {}) };
}

adminExtrasRouter.get('/plans', async (_req, res) => {
  const plans = await prisma.membershipPlan.findMany({
    include: { ...planInclude, _count: { select: { memberships: { where: { status: MembershipStatus.ACTIVE } } } } },
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
  });
  res.json(plans.map(p => ({ ...serialize.plan(p), activeMembers: p._count.memberships })));
});

adminExtrasRouter.post('/plans', async (req, res) => {
  const data = body(req, planInput);
  const plan = await prisma.membershipPlan.create({
    data: {
      ...(planData(data) as Prisma.MembershipPlanCreateInput),
      items: data.items ? { create: data.items } : undefined,
    },
    include: planInclude,
  });
  res.status(201).json(serialize.plan(plan));
});

adminExtrasRouter.patch('/plans/:id', async (req, res) => {
  const data = body(req, planInput.partial());
  const plan = await prisma.$transaction(async tx => {
    if (data.items) {
      await tx.membershipPlanItem.deleteMany({ where: { planId: req.params.id } });
      await tx.membershipPlanItem.createMany({ data: data.items.map(i => ({ ...i, planId: req.params.id })) });
    }
    return tx.membershipPlan.update({ where: { id: req.params.id }, data: planData(data), include: planInclude });
  });
  res.json(serialize.plan(plan));
});

adminExtrasRouter.delete('/plans/:id', async (req, res) => {
  await prisma.membershipPlan.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
});

const membershipInclude = { plan: { include: planInclude }, location: true, user: true };

adminExtrasRouter.get('/memberships', async (req, res) => {
  const q = query(
    req,
    z.object({ status: z.nativeEnum(MembershipStatus).optional(), q: z.string().trim().max(80).optional() }),
  );
  const now = new Date();
  const where: Prisma.MembershipWhereInput = { user: search(q.q) };
  // ACTIVE/EXPIRED are judged by end date so lapsed packages don't show as active.
  if (q.status === MembershipStatus.ACTIVE) Object.assign(where, { status: MembershipStatus.ACTIVE, endsAt: { gt: now } });
  else if (q.status === MembershipStatus.EXPIRED) {
    where.OR = [{ status: MembershipStatus.EXPIRED }, { status: MembershipStatus.ACTIVE, endsAt: { lte: now } }];
  } else if (q.status) where.status = q.status;

  const list = await prisma.membership.findMany({
    where,
    include: membershipInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json(list.map(m => serialize.membership(m)));
});

/** Payment received at the counter: start the package now (or from a given date). */
adminExtrasRouter.post('/memberships/:id/activate', async (req, res) => {
  const data = body(req, z.object({ note: z.string().trim().max(300).optional() }));
  const m = await prisma.membership.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!m) throw notFound('Package');
  if (m.status !== MembershipStatus.PENDING) throw badRequest('Only packages awaiting payment can be activated');
  const startsAt = new Date();
  const updated = await prisma.membership.update({
    where: { id: m.id },
    data: {
      status: MembershipStatus.ACTIVE,
      startsAt,
      endsAt: new Date(startsAt.getTime() + m.plan.durationDays * 86_400_000),
      note: data.note ?? m.note,
    },
    include: membershipInclude,
  });
  res.json({ membership: serialize.membership(updated, await usage(updated)) });
});

/** Another month paid: extend from the current end date (or from today if it has lapsed). */
adminExtrasRouter.post('/memberships/:id/renew', async (req, res) => {
  const m = await prisma.membership.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!m) throw notFound('Package');
  if (m.status !== MembershipStatus.ACTIVE && m.status !== MembershipStatus.EXPIRED) {
    throw badRequest('Only active or expired packages can be renewed');
  }
  const from = m.endsAt && m.endsAt > new Date() ? m.endsAt : new Date();
  const updated = await prisma.membership.update({
    where: { id: m.id },
    data: {
      status: MembershipStatus.ACTIVE,
      startsAt: m.startsAt && m.endsAt && m.endsAt > new Date() ? m.startsAt : new Date(),
      endsAt: new Date(from.getTime() + m.plan.durationDays * 86_400_000),
    },
    include: membershipInclude,
  });
  res.json({ membership: serialize.membership(updated) });
});

adminExtrasRouter.post('/memberships/:id/cancel', async (req, res) => {
  const updated = await prisma.membership.update({
    where: { id: req.params.id },
    data: { status: MembershipStatus.CANCELLED },
    include: membershipInclude,
  });
  res.json({ membership: serialize.membership(updated) });
});

// ============================================================================
// Loyalty
// ============================================================================

adminExtrasRouter.get('/customers/:id/loyalty', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw notFound('Customer');
  const [lifetime, history] = await Promise.all([
    lifetimePoints(user.id),
    prisma.loyaltyTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  const { tier, next, pointsToNext } = tierFor(lifetime);
  res.json({ balance: user.loyaltyPoints, lifetime, tier, nextTier: next, pointsToNext, history });
});

/** Manual adjustment, e.g. goodwill points or correcting a mistake. */
adminExtrasRouter.post('/customers/:id/loyalty', async (req, res) => {
  const data = body(
    req,
    z.object({ points: z.number().int().min(-100_000).max(100_000).refine(p => p !== 0, 'cannot be zero'), note: z.string().trim().min(2).max(200) }),
  );
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw notFound('Customer');
  if (user.loyaltyPoints + data.points < 0) throw badRequest(`Balance is only ${user.loyaltyPoints} points`);
  await prisma.$transaction(tx =>
    addPoints(tx, { userId: user.id, points: data.points, reason: LoyaltyReason.ADJUSTMENT, note: data.note }),
  );
  res.json({ balance: user.loyaltyPoints + data.points });
});

// ============================================================================
// Events
// ============================================================================

const eventPackageInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug,
  description: z.string().trim().min(10).max(1500),
  fromPrice: price,
  includes: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
  minGuests: z.number().int().min(1).max(500).optional(),
  maxGuests: z.number().int().min(1).max(500).nullable().optional(),
  imageUrl: imageRef.nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function eventPackageData(input: Partial<z.infer<typeof eventPackageInput>>) {
  const { fromPrice, ...rest } = input;
  return { ...rest, ...(fromPrice !== undefined ? { fromPriceCents: toCents(fromPrice) } : {}) };
}

adminExtrasRouter.get('/event-packages', async (_req, res) => {
  const list = await prisma.eventPackage.findMany({ orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }] });
  res.json(list.map(serialize.eventPackage));
});

adminExtrasRouter.post('/event-packages', async (req, res) => {
  const p = await prisma.eventPackage.create({
    data: eventPackageData(body(req, eventPackageInput)) as Prisma.EventPackageCreateInput,
  });
  res.status(201).json(serialize.eventPackage(p));
});

adminExtrasRouter.patch('/event-packages/:id', async (req, res) => {
  const p = await prisma.eventPackage.update({
    where: { id: req.params.id },
    data: eventPackageData(body(req, eventPackageInput.partial())),
  });
  res.json(serialize.eventPackage(p));
});

adminExtrasRouter.delete('/event-packages/:id', async (req, res) => {
  await prisma.eventPackage.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
});

const eventInclude = { package: true, location: true, user: true };

adminExtrasRouter.get('/event-requests', async (req, res) => {
  const q = query(
    req,
    z.object({ status: z.nativeEnum(EventRequestStatus).optional(), q: z.string().trim().max(80).optional() }),
  );
  const list = await prisma.eventRequest.findMany({
    where: { ...(q.status ? { status: q.status } : {}), user: search(q.q) },
    include: eventInclude,
    orderBy: [{ eventDate: 'asc' }],
    take: 200,
  });
  res.json(list.map(serialize.eventRequest));
});

/** Send (or revise) a quote; the customer accepts or declines it from their account. */
adminExtrasRouter.post('/event-requests/:id/quote', async (req, res) => {
  const data = body(req, z.object({ price, note: z.string().trim().max(1000).optional() }));
  const r = await prisma.eventRequest.findUnique({ where: { id: req.params.id } });
  if (!r) throw notFound('Event request');
  if (r.status !== EventRequestStatus.NEW && r.status !== EventRequestStatus.QUOTED) {
    throw badRequest('Quotes can only be sent for new or already-quoted requests');
  }
  const updated = await prisma.eventRequest.update({
    where: { id: r.id },
    data: { status: EventRequestStatus.QUOTED, quotedPriceCents: toCents(data.price), quoteNote: data.note, quotedAt: new Date() },
    include: eventInclude,
  });
  res.json({ request: serialize.eventRequest(updated) });
});

adminExtrasRouter.patch('/event-requests/:id', async (req, res) => {
  const data = body(req, z.object({ status: z.nativeEnum(EventRequestStatus) }));
  const updated = await prisma.eventRequest.update({
    where: { id: req.params.id },
    data: { status: data.status },
    include: eventInclude,
  });
  res.json({ request: serialize.eventRequest(updated) });
});

// ============================================================================
// Products
// ============================================================================

const productInclude = {
  recommendations: { include: { staff: true } },
  services: { include: { service: true } },
} satisfies Prisma.ProductInclude;

const productInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  brand: z.string().trim().min(1).max(60),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().min(10).max(1500),
  howToUse: z.string().trim().max(800).nullable().optional(),
  price,
  imageUrl: imageRef.nullable().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  recommendations: z.array(z.object({ staffId: z.string().min(1), note: z.string().trim().min(2).max(300) })).max(10).optional(),
  serviceIds: z.array(z.string().min(1)).max(30).optional(),
});

function productData(input: Partial<z.infer<typeof productInput>>) {
  const { price: p, recommendations: _r, serviceIds: _s, ...rest } = input;
  return { ...rest, ...(p !== undefined ? { priceCents: toCents(p) } : {}) };
}

adminExtrasRouter.get('/products', async (_req, res) => {
  const list = await prisma.product.findMany({ include: productInclude, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  res.json(list.map(serialize.product));
});

adminExtrasRouter.post('/products', async (req, res) => {
  const data = body(req, productInput);
  const p = await prisma.product.create({
    data: {
      ...(productData(data) as Prisma.ProductCreateInput),
      recommendations: data.recommendations ? { create: data.recommendations } : undefined,
      services: data.serviceIds ? { create: data.serviceIds.map(serviceId => ({ serviceId })) } : undefined,
    },
    include: productInclude,
  });
  res.status(201).json(serialize.product(p));
});

adminExtrasRouter.patch('/products/:id', async (req, res) => {
  const data = body(req, productInput.partial());
  const id = req.params.id;
  const p = await prisma.$transaction(async tx => {
    if (data.recommendations) {
      await tx.productRecommendation.deleteMany({ where: { productId: id } });
      await tx.productRecommendation.createMany({ data: data.recommendations.map(r => ({ ...r, productId: id })) });
    }
    if (data.serviceIds) {
      await tx.productService.deleteMany({ where: { productId: id } });
      await tx.productService.createMany({ data: data.serviceIds.map(serviceId => ({ serviceId, productId: id })) });
    }
    return tx.product.update({ where: { id }, data: productData(data), include: productInclude });
  });
  res.json(serialize.product(p));
});

adminExtrasRouter.delete('/products/:id', async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
});

const reservationInclude = { items: { include: { product: true } }, location: true, user: true };

adminExtrasRouter.get('/reservations', async (req, res) => {
  const q = query(
    req,
    z.object({
      status: z.nativeEnum(ReservationStatus).optional(),
      locationId: z.string().optional(),
      q: z.string().trim().max(80).optional(),
    }),
  );
  const list = await prisma.productReservation.findMany({
    where: {
      ...(q.status ? { status: q.status } : {}),
      ...(q.locationId ? { locationId: q.locationId } : {}),
      user: search(q.q),
    },
    include: reservationInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(list.map(serialize.reservation));
});

adminExtrasRouter.patch('/reservations/:id', async (req, res) => {
  const data = body(req, z.object({ status: z.nativeEnum(ReservationStatus) }));
  const updated = await prisma.productReservation.update({
    where: { id: req.params.id },
    data: { status: data.status },
    include: reservationInclude,
  });
  res.json({ reservation: serialize.reservation(updated) });
});

// ============================================================================
// To-do counts for the dashboard
// ============================================================================

adminExtrasRouter.get('/inbox', async (_req, res) => {
  const now = new Date();
  const [pendingMemberships, activeMembers, newEventRequests, upcomingEvents, pendingReservations] = await Promise.all([
    prisma.membership.count({ where: { status: MembershipStatus.PENDING } }),
    prisma.membership.count({ where: { status: MembershipStatus.ACTIVE, endsAt: { gt: now } } }),
    prisma.eventRequest.count({ where: { status: EventRequestStatus.NEW } }),
    prisma.eventRequest.count({ where: { status: EventRequestStatus.CONFIRMED } }),
    prisma.productReservation.count({ where: { status: ReservationStatus.PENDING } }),
  ]);
  res.json({ pendingMemberships, activeMembers, newEventRequests, upcomingEvents, pendingReservations });
});
