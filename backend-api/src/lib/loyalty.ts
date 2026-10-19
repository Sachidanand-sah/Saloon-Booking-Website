import { LoyaltyReason, type Prisma } from '@prisma/client';
import { config } from '../config/env';
import { prisma } from './prisma';

type Tx = Prisma.TransactionClient;

export const TIERS = [
  {
    key: 'SILVER',
    name: 'Silver',
    minPoints: 0,
    multiplier: 1,
    perks: ['Earn points on every visit', 'Birthday treat'],
  },
  {
    key: 'GOLD',
    name: 'Gold',
    minPoints: 1000,
    multiplier: 1.25,
    perks: ['1.25× points on every visit', 'Priority weekend booking', 'Birthday treat'],
  },
  {
    key: 'PLATINUM',
    name: 'Platinum',
    minPoints: 3000,
    multiplier: 1.5,
    perks: ['1.5× points on every visit', 'Free blow-dry each quarter', 'Priority booking', 'Birthday treat'],
  },
] as const;

export type Tier = (typeof TIERS)[number];

/** Public description of how the programme works (shown on the website). */
export const programme = () => ({
  pointsPer100: config.LOYALTY_POINTS_PER_100,
  pointValue: config.LOYALTY_POINT_VALUE_CENTS / 100,
  maxRedeemPercent: config.LOYALTY_MAX_REDEEM_PERCENT,
  signupBonus: config.LOYALTY_SIGNUP_BONUS,
  tiers: TIERS,
});

export function tierFor(lifetimePoints: number) {
  let index = 0;
  TIERS.forEach((t, i) => {
    if (lifetimePoints >= t.minPoints) index = i;
  });
  const tier = TIERS[index];
  const next = TIERS[index + 1] ?? null;
  return { tier, next, pointsToNext: next ? next.minPoints - lifetimePoints : 0 };
}

/** Points ever earned (tiers are based on this, so redeeming never drops your tier). */
export async function lifetimePoints(userId: string, tx: Tx = prisma) {
  const sum = await tx.loyaltyTransaction.aggregate({
    where: { userId, reason: { in: [LoyaltyReason.EARNED, LoyaltyReason.SIGNUP_BONUS] } },
    _sum: { points: true },
  });
  return sum._sum.points ?? 0;
}

/** Records a points movement and keeps the user's balance in step. */
export async function addPoints(
  tx: Tx,
  data: { userId: string; points: number; reason: LoyaltyReason; bookingId?: string; note?: string },
) {
  if (data.points === 0) return;
  await tx.loyaltyTransaction.create({ data });
  await tx.user.update({ where: { id: data.userId }, data: { loyaltyPoints: { increment: data.points } } });
}

/** Most points a booking can use: limited by balance and by the redeem cap on what is left to pay. */
export function maxRedeemable(balance: number, payableCents: number) {
  const capCents = Math.floor((payableCents * config.LOYALTY_MAX_REDEEM_PERCENT) / 100);
  return Math.max(0, Math.min(balance, Math.floor(capCents / config.LOYALTY_POINT_VALUE_CENTS)));
}

export const pointsToCents = (points: number) => points * config.LOYALTY_POINT_VALUE_CENTS;

/** Awards points for a completed visit, once. Uses the tier at the time of the visit. */
export async function awardForBooking(tx: Tx, booking: { id: string; customerId: string; priceCents: number; discountCents: number }) {
  const already = await tx.loyaltyTransaction.findFirst({
    where: { bookingId: booking.id, reason: LoyaltyReason.EARNED },
  });
  if (already) return 0;
  const { tier } = tierFor(await lifetimePoints(booking.customerId, tx));
  const paidRupees = (booking.priceCents - booking.discountCents) / 100;
  const points = Math.floor((paidRupees / 100) * config.LOYALTY_POINTS_PER_100 * tier.multiplier);
  await addPoints(tx, { userId: booking.customerId, points, reason: LoyaltyReason.EARNED, bookingId: booking.id });
  return points;
}

/** Undoes points earned for a booking (e.g. a visit marked completed by mistake). */
export async function reverseAward(tx: Tx, booking: { id: string; customerId: string }) {
  const earned = await tx.loyaltyTransaction.aggregate({
    where: { bookingId: booking.id, reason: { in: [LoyaltyReason.EARNED, LoyaltyReason.ADJUSTMENT] } },
    _sum: { points: true },
  });
  const net = earned._sum.points ?? 0;
  if (net > 0) {
    await addPoints(tx, {
      userId: booking.customerId,
      points: -net,
      reason: LoyaltyReason.ADJUSTMENT,
      bookingId: booking.id,
      note: 'Visit no longer marked completed',
    });
  }
}

/** Returns points spent on a booking that was cancelled, once. */
export async function refundRedeemed(tx: Tx, booking: { id: string; customerId: string; pointsRedeemed: number }) {
  if (booking.pointsRedeemed <= 0) return;
  const already = await tx.loyaltyTransaction.findFirst({
    where: { bookingId: booking.id, reason: LoyaltyReason.REFUNDED },
  });
  if (already) return;
  await addPoints(tx, {
    userId: booking.customerId,
    points: booking.pointsRedeemed,
    reason: LoyaltyReason.REFUNDED,
    bookingId: booking.id,
    note: 'Booking cancelled',
  });
}
