import { Router } from 'express';
import { z } from 'zod';
import { ReservationStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import * as serialize from '../../lib/serialize-extras';
import { currentUser, requireAuth } from '../../middleware/auth';
import { body, query } from '../../middleware/validate';

const productInclude = {
  recommendations: { include: { staff: true } },
  services: { include: { service: true } },
} satisfies Prisma.ProductInclude;

/** GET /products: shop catalogue with professional recommendations. Public. */
export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const q = query(
    req,
    z.object({
      category: z.string().optional(),
      serviceId: z.string().optional(),
      staffId: z.string().optional(),
      featured: z.enum(['true', 'false']).optional(),
    }),
  );
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q.category) where.category = q.category;
  if (q.featured) where.isFeatured = q.featured === 'true';
  if (q.serviceId) where.services = { some: { service: { OR: [{ id: q.serviceId }, { slug: q.serviceId }] } } };
  if (q.staffId) where.recommendations = { some: { staffId: q.staffId } };
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });
  res.json(products.map(serialize.product));
});

productsRouter.get('/:idOrSlug', async (req, res) => {
  const p = await prisma.product.findFirst({
    where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }], isActive: true },
    include: productInclude,
  });
  if (!p) throw notFound('Product');
  res.json(serialize.product(p));
});

/** /reservations: reserve products online, pay and collect at a branch. */
export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

const reservationInclude = { items: { include: { product: true } }, location: true };

reservationsRouter.get('/', async (req, res) => {
  const list = await prisma.productReservation.findMany({
    where: { userId: currentUser(req).sub },
    include: reservationInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(list.map(serialize.reservation));
});

reservationsRouter.post('/', async (req, res) => {
  const data = body(
    req,
    z.object({
      locationId: z.string().min(1),
      note: z.string().trim().max(500).optional(),
      items: z
        .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
        .min(1, 'Add at least one product')
        .max(20),
    }),
  );
  const location = await prisma.location.findFirst({ where: { id: data.locationId, isActive: true } });
  if (!location) throw badRequest('Please choose an open branch to collect from');

  const ids = [...new Set(data.items.map(i => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true } });
  const missing = ids.filter(id => !products.some(p => p.id === id));
  if (missing.length) throw badRequest('Some products are no longer available. Please refresh your bag.');
  const out = products.filter(p => !p.inStock);
  if (out.length) throw badRequest(`${out.map(p => p.name).join(', ')} ${out.length === 1 ? 'is' : 'are'} out of stock`);

  // Merge duplicate lines and snapshot prices.
  const lines = ids.map(id => {
    const p = products.find(x => x.id === id)!;
    const quantity = Math.min(10, data.items.filter(i => i.productId === id).reduce((n, i) => n + i.quantity, 0));
    return { productId: id, quantity, priceCents: p.priceCents };
  });

  const reservation = await prisma.productReservation.create({
    data: {
      userId: currentUser(req).sub,
      locationId: location.id,
      note: data.note,
      totalCents: lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
      items: { create: lines },
    },
    include: reservationInclude,
  });
  res.status(201).json({
    message: `Reserved! We'll have it ready at ${location.name}.`,
    reservation: serialize.reservation(reservation),
  });
});

reservationsRouter.post('/:id/cancel', async (req, res) => {
  const r = await prisma.productReservation.findUnique({ where: { id: req.params.id } });
  if (!r || r.userId !== currentUser(req).sub) throw notFound('Reservation');
  if (r.status !== ReservationStatus.PENDING && r.status !== ReservationStatus.READY) {
    throw badRequest('This reservation can no longer be cancelled');
  }
  const updated = await prisma.productReservation.update({
    where: { id: r.id },
    data: { status: ReservationStatus.CANCELLED },
    include: reservationInclude,
  });
  res.json({ reservation: serialize.reservation(updated) });
});
