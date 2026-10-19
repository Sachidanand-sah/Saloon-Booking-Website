import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { lifetimePoints, programme, tierFor } from '../../lib/loyalty';
import { currentUser, requireAuth } from '../../middleware/auth';

export const loyaltyRouter = Router();

/** How the programme works: earn rate, point value and tiers. Public. */
loyaltyRouter.get('/programme', (_req, res) => {
  res.json(programme());
});

/** The signed-in customer's balance, tier and history. */
loyaltyRouter.get('/me', requireAuth, async (req, res) => {
  const { sub } = currentUser(req);
  const [user, lifetime, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: sub }, select: { loyaltyPoints: true } }),
    lifetimePoints(sub),
    prisma.loyaltyTransaction.findMany({
      where: { userId: sub },
      include: { booking: { include: { service: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  const { tier, next, pointsToNext } = tierFor(lifetime);
  res.json({
    balance: user.loyaltyPoints,
    lifetime,
    tier,
    nextTier: next,
    pointsToNext,
    programme: programme(),
    history: history.map(t => ({
      id: t.id,
      points: t.points,
      reason: t.reason,
      note: t.note,
      createdAt: t.createdAt,
      booking: t.booking ? { id: t.booking.id, serviceName: t.booking.service.name, startAt: t.booking.startAt } : null,
    })),
  });
});
