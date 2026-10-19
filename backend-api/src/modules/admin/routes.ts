import { Router } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import { toCents, toPrice } from '../../lib/money';
import * as serialize from '../../lib/serialize';
import { requireAuth, requireRole } from '../../middleware/auth';
import { body, query } from '../../middleware/validate';
import { ACTIVE_STATUSES } from '../availability/service';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(Role.ADMIN));

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use lowercase letters, numbers and dashes');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const salonDay = (date?: string) =>
  date ? DateTime.fromISO(date, { zone: config.SALON_TIMEZONE }) : DateTime.now().setZone(config.SALON_TIMEZONE);

/** Revenue counts visits that happened or are still expected; cancellations and no-shows are excluded. */
const REVENUE_STATUSES: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.PENDING];

async function summarise(from: Date, to: Date) {
  const where = { startAt: { gte: from, lt: to } };
  const [byStatus, revenue] = await Promise.all([
    prisma.booking.groupBy({ by: ['status'], where, _count: true }),
    prisma.booking.aggregate({ where: { ...where, status: { in: REVENUE_STATUSES } }, _sum: { priceCents: true } }),
  ]);
  const count = (s: BookingStatus) => byStatus.find(r => r.status === s)?._count ?? 0;
  return {
    bookings: byStatus.reduce((n, r) => n + r._count, 0),
    completed: count(BookingStatus.COMPLETED),
    cancelled: count(BookingStatus.CANCELLED),
    noShows: count(BookingStatus.NO_SHOW),
    revenue: toPrice(revenue._sum.priceCents ?? 0),
  };
}

// ---------- Dashboard ----------

adminRouter.get('/stats', async (_req, res) => {
  const now = DateTime.now().setZone(config.SALON_TIMEZONE);
  const month = { from: now.startOf('month').toJSDate(), to: now.endOf('month').toJSDate() };

  const [today, thisMonth, upcomingWeek, customers, newCustomers, top] = await Promise.all([
    summarise(now.startOf('day').toJSDate(), now.endOf('day').toJSDate()),
    summarise(month.from, month.to),
    prisma.booking.count({
      where: { status: { in: ACTIVE_STATUSES }, startAt: { gte: now.toJSDate(), lt: now.plus({ days: 7 }).toJSDate() } },
    }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.user.count({ where: { role: Role.CUSTOMER, createdAt: { gte: month.from } } }),
    prisma.booking.groupBy({
      by: ['serviceId'],
      where: { startAt: { gte: month.from, lt: month.to }, status: { in: REVENUE_STATUSES } },
      _count: true,
      _sum: { priceCents: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    }),
  ]);

  const names = await prisma.service.findMany({ where: { id: { in: top.map(t => t.serviceId) } } });
  res.json({
    currency: config.CURRENCY,
    today,
    thisMonth,
    upcomingWeek,
    customers: { total: customers, newThisMonth: newCustomers },
    topServices: top.map(t => ({
      serviceId: t.serviceId,
      name: names.find(n => n.id === t.serviceId)?.name ?? 'Unknown',
      bookings: t._count,
      revenue: toPrice(t._sum.priceCents ?? 0),
    })),
  });
});

// ---------- Bookings ----------

adminRouter.get('/bookings', async (req, res) => {
  const q = query(
    req,
    z.object({
      from: isoDate.optional(),
      to: isoDate.optional(),
      status: z.nativeEnum(BookingStatus).optional(),
      staffId: z.string().optional(),
      q: z.string().trim().max(80).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(50),
    }),
  );
  const where: Prisma.BookingWhereInput = {
    startAt: {
      gte: salonDay(q.from).startOf('day').toJSDate(),
      ...(q.to ? { lt: salonDay(q.to).endOf('day').toJSDate() } : {}),
    },
  };
  if (q.status) where.status = q.status;
  if (q.staffId) where.staffId = q.staffId;
  if (q.q) {
    where.customer = {
      OR: [
        { name: { contains: q.q, mode: 'insensitive' } },
        { email: { contains: q.q, mode: 'insensitive' } },
        { phone: { contains: q.q } },
      ],
    };
  }
  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: { service: true, staff: true, customer: true, review: true },
      orderBy: { startAt: 'asc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ total, page: q.page, pageSize: q.pageSize, items: rows.map(b => serialize.booking(b)) });
});

adminRouter.patch('/bookings/:id', async (req, res) => {
  const data = body(req, z.object({ status: z.nativeEnum(BookingStatus) }));
  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Booking');
  const booking = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: data.status,
      cancelledAt: data.status === BookingStatus.CANCELLED ? (existing.cancelledAt ?? new Date()) : null,
    },
    include: { service: true, staff: true, customer: true, review: true },
  });
  res.json({ booking: serialize.booking(booking) });
});

// ---------- Categories ----------

const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  slug,
  description: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

adminRouter.post('/categories', async (req, res) => {
  const category = await prisma.category.create({ data: body(req, categoryInput) });
  res.status(201).json(serialize.category(category));
});

adminRouter.patch('/categories/:id', async (req, res) => {
  const category = await prisma.category.update({ where: { id: req.params.id }, data: body(req, categoryInput.partial()) });
  res.json(serialize.category(category));
});

// ---------- Services ----------

const serviceInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug,
  description: z.string().trim().min(10).max(1000),
  durationMins: z.number().int().min(5).max(480),
  price: z.number().min(0).max(100_000),
  categoryId: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  staffIds: z.array(z.string()).optional(),
});

function serviceData(input: Partial<z.infer<typeof serviceInput>>) {
  const { price, staffIds: _staffIds, ...rest } = input;
  return { ...rest, ...(price !== undefined ? { priceCents: toCents(price) } : {}) };
}

adminRouter.get('/services', async (_req, res) => {
  const services = await prisma.service.findMany({
    include: { category: true, staff: true },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  res.json(services.map(s => ({ ...serialize.service(s), staffIds: s.staff.map(l => l.staffId) })));
});

adminRouter.post('/services', async (req, res) => {
  const data = body(req, serviceInput);
  const service = await prisma.service.create({
    data: {
      ...(serviceData(data) as Prisma.ServiceUncheckedCreateInput),
      staff: data.staffIds ? { create: data.staffIds.map(staffId => ({ staffId })) } : undefined,
    },
    include: { category: true },
  });
  res.status(201).json(serialize.service(service));
});

adminRouter.patch('/services/:id', async (req, res) => {
  const data = body(req, serviceInput.partial());
  const service = await prisma.$transaction(async tx => {
    if (data.staffIds) {
      await tx.staffService.deleteMany({ where: { serviceId: req.params.id } });
      await tx.staffService.createMany({ data: data.staffIds.map(staffId => ({ staffId, serviceId: req.params.id })) });
    }
    return tx.service.update({ where: { id: req.params.id }, data: serviceData(data), include: { category: true } });
  });
  res.json(serialize.service(service));
});

/** Soft delete: past bookings keep pointing at the service. */
adminRouter.delete('/services/:id', async (req, res) => {
  await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
});

// ---------- Staff ----------

const staffInput = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(1000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  userId: z.string().nullable().optional(),
});

const hoursInput = z
  .array(
    z
      .object({
        dayOfWeek: z.number().int().min(1).max(7),
        startMinute: z.number().int().min(0).max(1440),
        endMinute: z.number().int().min(0).max(1440),
      })
      .refine(h => h.endMinute > h.startMinute, 'endMinute must be after startMinute'),
  )
  .max(28);

adminRouter.get('/staff', async (_req, res) => {
  const staff = await prisma.staff.findMany({
    include: { services: true, workingHours: true, user: true },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  res.json(
    staff.map(s => ({
      ...serialize.staffSummary(s),
      isActive: s.isActive,
      email: s.user?.email ?? null,
      serviceIds: s.services.map(l => l.serviceId),
      workingHours: s.workingHours.map(({ dayOfWeek, startMinute, endMinute }) => ({ dayOfWeek, startMinute, endMinute })),
    })),
  );
});

adminRouter.post('/staff', async (req, res) => {
  const staff = await prisma.staff.create({ data: body(req, staffInput) });
  res.status(201).json(serialize.staffSummary(staff));
});

adminRouter.patch('/staff/:id', async (req, res) => {
  const staff = await prisma.staff.update({ where: { id: req.params.id }, data: body(req, staffInput.partial()) });
  res.json(serialize.staffSummary(staff));
});

adminRouter.put('/staff/:id/hours', async (req, res) => {
  const hours = body(req, hoursInput);
  for (const day of new Set(hours.map(h => h.dayOfWeek))) {
    const shifts = hours.filter(h => h.dayOfWeek === day).sort((a, b) => a.startMinute - b.startMinute);
    if (shifts.some((s, i) => i > 0 && s.startMinute < shifts[i - 1].endMinute)) {
      throw badRequest(`Shifts overlap on day ${day}`);
    }
  }
  await prisma.$transaction([
    prisma.workingHours.deleteMany({ where: { staffId: req.params.id } }),
    prisma.workingHours.createMany({ data: hours.map(h => ({ ...h, staffId: req.params.id })) }),
  ]);
  res.json({ workingHours: hours });
});

adminRouter.put('/staff/:id/services', async (req, res) => {
  const { serviceIds } = body(req, z.object({ serviceIds: z.array(z.string()) }));
  await prisma.$transaction([
    prisma.staffService.deleteMany({ where: { staffId: req.params.id } }),
    prisma.staffService.createMany({ data: serviceIds.map(serviceId => ({ serviceId, staffId: req.params.id })) }),
  ]);
  res.json({ serviceIds });
});

// ---------- Customers ----------

adminRouter.get('/customers', async (req, res) => {
  const q = query(req, z.object({ q: z.string().trim().max(80).optional() }));
  const customers = await prisma.user.findMany({
    where: {
      role: Role.CUSTOMER,
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
              { phone: { contains: q.q } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(customers.map(c => ({ ...serialize.publicUser(c), bookingCount: c._count.bookings })));
});
