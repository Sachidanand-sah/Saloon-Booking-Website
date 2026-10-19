import { Router } from 'express';
import { z } from 'zod';
import { EventRequestStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import * as serialize from '../../lib/serialize-extras';
import { currentUser, requireAuth } from '../../middleware/auth';
import { body } from '../../middleware/validate';
import { salonToday } from '../availability/service';

/** GET /event-packages: bridal, party, group packages. Public. */
export const eventPackagesRouter = Router();

eventPackagesRouter.get('/', async (_req, res) => {
  const packages = await prisma.eventPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json(packages.map(serialize.eventPackage));
});

eventPackagesRouter.get('/:idOrSlug', async (req, res) => {
  const p = await prisma.eventPackage.findFirst({
    where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }], isActive: true },
  });
  if (!p) throw notFound('Event package');
  res.json(serialize.eventPackage(p));
});

/** /event-requests: a customer's quote requests. */
export const eventRequestsRouter = Router();
eventRequestsRouter.use(requireAuth);

const include = { package: true, location: true };

eventRequestsRouter.get('/', async (req, res) => {
  const list = await prisma.eventRequest.findMany({
    where: { userId: currentUser(req).sub },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(list.map(serialize.eventRequest));
});

eventRequestsRouter.post('/', async (req, res) => {
  const data = body(
    req,
    z.object({
      packageId: z.string().min(1),
      locationId: z.string().min(1).optional(),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'must be HH:mm').optional(),
      guestCount: z.number().int().min(1).max(500),
      venue: z.string().trim().max(300).optional(),
      notes: z.string().trim().max(1000).optional(),
      contactPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Please enter a valid phone number'),
    }),
  );
  const pkg = await prisma.eventPackage.findFirst({
    where: { OR: [{ id: data.packageId }, { slug: data.packageId }], isActive: true },
  });
  if (!pkg) throw notFound('Event package');
  if (data.eventDate <= salonToday()) throw badRequest('Please choose a date from tomorrow onwards');
  if (data.guestCount < pkg.minGuests || (pkg.maxGuests && data.guestCount > pkg.maxGuests)) {
    throw badRequest(
      `This package is for ${pkg.minGuests}${pkg.maxGuests ? `–${pkg.maxGuests}` : '+'} guest${pkg.maxGuests === 1 ? '' : 's'}`,
    );
  }
  if (!data.locationId && !data.venue) throw badRequest('Choose a branch, or tell us the venue for an on-site event');

  const request = await prisma.eventRequest.create({
    data: { ...data, packageId: pkg.id, userId: currentUser(req).sub },
    include,
  });
  res.status(201).json({
    message: 'Request received. We will send you a quote shortly.',
    request: serialize.eventRequest(request),
  });
});

async function own(id: string, userId: string) {
  const r = await prisma.eventRequest.findUnique({ where: { id } });
  if (!r || r.userId !== userId) throw notFound('Event request');
  return r;
}

const respond = (to: EventRequestStatus, allowed: EventRequestStatus[], verb: string) =>
  eventRequestsRouter.post(`/:id/${verb}`, async (req, res) => {
    const r = await own(req.params.id, currentUser(req).sub);
    if (!allowed.includes(r.status)) throw badRequest(`This request can no longer be ${verb === 'accept' ? 'accepted' : `${verb}ed`}`);
    const updated = await prisma.eventRequest.update({
      where: { id: r.id },
      data: { status: to, respondedAt: new Date() },
      include,
    });
    res.json({ request: serialize.eventRequest(updated) });
  });

respond(EventRequestStatus.CONFIRMED, [EventRequestStatus.QUOTED], 'accept');
respond(EventRequestStatus.DECLINED, [EventRequestStatus.QUOTED], 'decline');
respond(EventRequestStatus.CANCELLED, [EventRequestStatus.NEW, EventRequestStatus.QUOTED], 'cancel');
