import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import * as serialize from '../../lib/serialize';
import { openingHours } from '../../lib/hours';
import { query } from '../../middleware/validate';

export const catalogRouter = Router();

/** Accepts either a database id or a URL slug. */
const byIdOrSlug = (idOrSlug: string) => ({ OR: [{ id: idOrSlug }, { slug: idOrSlug }] });

async function ratingsByService(serviceIds: string[]) {
  const rows = await prisma.review.findMany({
    where: { booking: { serviceId: { in: serviceIds } } },
    select: { rating: true, booking: { select: { serviceId: true } } },
  });
  const totals = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const t = totals.get(r.booking.serviceId) ?? { sum: 0, count: 0 };
    t.sum += r.rating;
    t.count += 1;
    totals.set(r.booking.serviceId, t);
  }
  return (id: string) => {
    const t = totals.get(id);
    return t ? { average: Math.round((t.sum / t.count) * 10) / 10, count: t.count } : { average: null, count: 0 };
  };
}

catalogRouter.get('/salon', async (_req, res) => {
  const [hours, locationCount] = await Promise.all([
    prisma.workingHours.findMany({ where: { staff: { isActive: true } } }),
    prisma.location.count({ where: { isActive: true } }),
  ]);
  res.json({
    timezone: config.SALON_TIMEZONE,
    currency: config.CURRENCY,
    slotStepMins: config.SLOT_STEP_MINS,
    bookingWindowDays: config.BOOKING_WINDOW_DAYS,
    cancelCutoffMins: config.CANCEL_CUTOFF_MINS,
    locationCount,
    openingHours: openingHours(hours),
  });
});

// ---------- Branches ----------

const activeStaffAt = { where: { isActive: true }, include: { workingHours: true, services: { include: { service: true } } } };

catalogRouter.get('/locations', async (_req, res) => {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    include: { staff: activeStaffAt },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json(
    locations.map(l => ({
      ...serialize.location(l),
      staffCount: l.staff.length,
      serviceIds: [...new Set(l.staff.flatMap(s => s.services.filter(x => x.service.isActive).map(x => x.serviceId)))],
      openingHours: openingHours(l.staff.flatMap(s => s.workingHours)),
    })),
  );
});

catalogRouter.get('/locations/:idOrSlug', async (req, res) => {
  const l = await prisma.location.findFirst({
    where: { ...byIdOrSlug(req.params.idOrSlug), isActive: true },
    include: { staff: { ...activeStaffAt, orderBy: { name: 'asc' } } },
  });
  if (!l) throw notFound('Branch');
  const services = new Map<string, Prisma.ServiceGetPayload<object>>();
  for (const s of l.staff) for (const link of s.services) if (link.service.isActive) services.set(link.serviceId, link.service);
  res.json({
    ...serialize.location(l),
    openingHours: openingHours(l.staff.flatMap(s => s.workingHours)),
    staff: l.staff.map(serialize.staffSummary),
    services: [...services.values()].sort((a, b) => a.name.localeCompare(b.name)).map(s => serialize.service(s)),
  });
});

catalogRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { services: { where: { isActive: true } } } } },
  });
  res.json(categories.map(c => ({ ...serialize.category(c), serviceCount: c._count.services })));
});

catalogRouter.get('/services', async (req, res) => {
  const q = query(
    req,
    z.object({
      category: z.string().optional(),
      q: z.string().trim().max(80).optional(),
      featured: z.enum(['true', 'false']).optional(),
      locationId: z.string().optional(),
    }),
  );
  const where: Prisma.ServiceWhereInput = { isActive: true };
  if (q.category) where.category = { slug: q.category };
  // Only services someone at that branch can perform.
  if (q.locationId) where.staff = { some: { staff: { isActive: true, location: byIdOrSlug(q.locationId) } } };
  if (q.featured) where.isFeatured = q.featured === 'true';
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: 'insensitive' } },
      { description: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  const services = await prisma.service.findMany({
    where,
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });
  const rating = await ratingsByService(services.map(s => s.id));
  res.json(services.map(s => ({ ...serialize.service(s), rating: rating(s.id) })));
});

catalogRouter.get('/services/:idOrSlug', async (req, res) => {
  const s = await prisma.service.findFirst({
    where: { ...byIdOrSlug(req.params.idOrSlug), isActive: true },
    include: {
      category: true,
      staff: { where: { staff: { isActive: true } }, include: { staff: true } },
    },
  });
  if (!s) throw notFound('Service');
  const rating = await ratingsByService([s.id]);
  res.json({
    ...serialize.service(s),
    rating: rating(s.id),
    staff: s.staff.map(link => serialize.staffSummary(link.staff)),
  });
});

catalogRouter.get('/staff', async (req, res) => {
  const q = query(req, z.object({ serviceId: z.string().optional(), locationId: z.string().optional() }));
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      NOT: { location: { isActive: false } },
      ...(q.serviceId ? { services: { some: { service: byIdOrSlug(q.serviceId) } } } : {}),
      ...(q.locationId ? { location: byIdOrSlug(q.locationId) } : {}),
    },
    include: { services: { include: { service: true } }, location: true },
    orderBy: { name: 'asc' },
  });
  res.json(
    staff.map(s => ({
      ...serialize.staffSummary(s),
      location: s.location ? { id: s.location.id, slug: s.location.slug, name: s.location.name } : null,
      services: s.services.filter(l => l.service.isActive).map(l => ({ id: l.service.id, name: l.service.name })),
    })),
  );
});

catalogRouter.get('/staff/:id', async (req, res) => {
  const s = await prisma.staff.findFirst({
    where: { id: req.params.id, isActive: true },
    include: { services: { include: { service: { include: { category: true } } } }, workingHours: true },
  });
  if (!s) throw notFound('Stylist');
  res.json({
    ...serialize.staffSummary(s),
    services: s.services.filter(l => l.service.isActive).map(l => serialize.service(l.service)),
    workingHours: s.workingHours
      .map(({ dayOfWeek, startMinute, endMinute }) => ({ dayOfWeek, startMinute, endMinute }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute),
  });
});
