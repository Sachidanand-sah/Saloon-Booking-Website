import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { activeMembership, usage } from '../../lib/membership';
import * as serialize from '../../lib/serialize-extras';
import { currentUser, requireAuth } from '../../middleware/auth';
import { body } from '../../middleware/validate';

const planInclude = { items: { include: { service: true } } };

/** GET /plans: monthly packages on sale. */
export const plansRouter = Router();

plansRouter.get('/', async (_req, res) => {
  const plans = await prisma.membershipPlan.findMany({
    where: { isActive: true },
    include: planInclude,
    orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
  });
  res.json(plans.map(serialize.plan));
});

/** /memberships: a customer's own packages. */
export const membershipsRouter = Router();
membershipsRouter.use(requireAuth);

membershipsRouter.get('/', async (req, res) => {
  const { sub } = currentUser(req);
  const list = await prisma.membership.findMany({
    where: { userId: sub },
    include: { plan: { include: planInclude }, location: true },
    orderBy: { createdAt: 'desc' },
  });
  const active = await activeMembership(sub, new Date());
  const activeUsage = active ? await usage(active) : undefined;
  res.json(list.map(m => serialize.membership(m, m.id === active?.id ? activeUsage : undefined)));
});

/** Request a package; staff activate it once paid at the salon. */
membershipsRouter.post('/', async (req, res) => {
  const data = body(req, z.object({ planId: z.string().min(1), locationId: z.string().min(1).optional() }));
  const { sub } = currentUser(req);
  const plan = await prisma.membershipPlan.findFirst({
    where: { OR: [{ id: data.planId }, { slug: data.planId }], isActive: true },
  });
  if (!plan) throw notFound('Package');
  if (data.locationId && !(await prisma.location.findFirst({ where: { id: data.locationId, isActive: true } }))) {
    throw badRequest('Please choose an open branch');
  }
  const pending = await prisma.membership.findFirst({ where: { userId: sub, status: MembershipStatus.PENDING } });
  if (pending) throw conflict('You already have a package waiting for payment at the salon.', 'MEMBERSHIP_PENDING');

  const membership = await prisma.membership.create({
    data: { userId: sub, planId: plan.id, locationId: data.locationId, priceCents: plan.priceCents },
    include: { plan: { include: planInclude }, location: true },
  });
  res.status(201).json({
    message: 'Package requested. Pay at the salon to activate it.',
    membership: serialize.membership(membership),
  });
});

membershipsRouter.post('/:id/cancel', async (req, res) => {
  const { sub } = currentUser(req);
  const m = await prisma.membership.findUnique({ where: { id: req.params.id } });
  if (!m || m.userId !== sub) throw notFound('Package');
  if (m.status !== MembershipStatus.PENDING) {
    throw badRequest('Only packages awaiting payment can be cancelled online. Please speak to the salon.');
  }
  const updated = await prisma.membership.update({
    where: { id: m.id },
    data: { status: MembershipStatus.CANCELLED },
    include: { plan: { include: planInclude }, location: true },
  });
  res.json({ membership: serialize.membership(updated) });
});
