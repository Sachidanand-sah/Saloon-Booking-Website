import { BookingStatus, MembershipStatus, type Prisma } from '@prisma/client';
import { prisma } from './prisma';

type Tx = Prisma.TransactionClient;

/** Statuses that use up an included-service credit. */
const COUNTED: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/** The membership covering a moment in time, if any. */
export function activeMembership(userId: string, at: Date, tx: Tx = prisma) {
  return tx.membership.findFirst({
    where: { userId, status: MembershipStatus.ACTIVE, startsAt: { lte: at }, endsAt: { gt: at } },
    include: { plan: { include: { items: { include: { service: true } } } } },
    orderBy: { endsAt: 'desc' },
  });
}

type ActiveMembership = NonNullable<Awaited<ReturnType<typeof activeMembership>>>;

/** How many of each included service have been used in this membership period. */
export async function usage(membership: ActiveMembership, tx: Tx = prisma) {
  const used = await tx.booking.groupBy({
    by: ['serviceId'],
    where: {
      membershipId: membership.id,
      status: { in: COUNTED },
      discountCents: { gt: 0 },
      serviceId: { in: membership.plan.items.map(i => i.serviceId) },
    },
    _count: true,
  });
  return membership.plan.items.map(item => {
    const count = used.find(u => u.serviceId === item.serviceId)?._count ?? 0;
    return {
      serviceId: item.serviceId,
      serviceName: item.service.name,
      included: item.quantity,
      used: Math.min(count, item.quantity),
      remaining: Math.max(item.quantity - count, 0),
    };
  });
}

export type Benefit = {
  membershipId: string | null;
  planName: string | null;
  kind: 'included' | 'discount' | null;
  discountCents: number;
};

const none: Benefit = { membershipId: null, planName: null, kind: null, discountCents: 0 };

/**
 * What a member saves on a booking: the service is free if it's included and credits remain,
 * otherwise the plan's percentage discount applies.
 */
export async function benefitFor(
  userId: string,
  serviceId: string,
  startAt: Date,
  priceCents: number,
  tx: Tx = prisma,
): Promise<Benefit> {
  const membership = await activeMembership(userId, startAt, tx);
  if (!membership) return none;

  const item = membership.plan.items.find(i => i.serviceId === serviceId);
  if (item) {
    const left = (await usage(membership, tx)).find(u => u.serviceId === serviceId)?.remaining ?? 0;
    if (left > 0) {
      return { membershipId: membership.id, planName: membership.plan.name, kind: 'included', discountCents: priceCents };
    }
  }
  if (membership.plan.discountPercent > 0) {
    return {
      membershipId: membership.id,
      planName: membership.plan.name,
      kind: 'discount',
      discountCents: Math.round((priceCents * membership.plan.discountPercent) / 100),
    };
  }
  return { ...none, membershipId: membership.id, planName: membership.plan.name };
}

/** Members whose period has ended are shown as expired without a background job. */
export function effectiveStatus(m: { status: MembershipStatus; endsAt: Date | null }, now = new Date()) {
  return m.status === MembershipStatus.ACTIVE && m.endsAt && m.endsAt <= now ? MembershipStatus.EXPIRED : m.status;
}
