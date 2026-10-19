import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { query } from '../../middleware/validate';

export const reviewsRouter = Router();

reviewsRouter.get('/', async (req, res) => {
  const q = query(
    req,
    z.object({ limit: z.coerce.number().int().min(1).max(50).default(10), serviceId: z.string().optional() }),
  );
  const reviews = await prisma.review.findMany({
    where: q.serviceId ? { booking: { serviceId: q.serviceId } } : {},
    include: { customer: true, booking: { include: { service: true, staff: true } } },
    orderBy: { createdAt: 'desc' },
    take: q.limit,
  });
  res.json(
    reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      // First name + initial only — reviews are public.
      author: r.customer.name.split(' ').map((p, i) => (i === 0 ? p : `${p[0]}.`)).join(' '),
      service: { id: r.booking.service.id, name: r.booking.service.name },
      staff: { id: r.booking.staff.id, name: r.booking.staff.name },
    })),
  );
});
