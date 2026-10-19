import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, unauthorized } from '../../lib/errors';
import { publicUser } from '../../lib/serialize';
import { consumeRefreshToken, issueRefreshToken, revokeRefreshToken, signAccessToken } from '../../lib/tokens';
import { currentUser, requireAuth } from '../../middleware/auth';
import { body } from '../../middleware/validate';
import { LoyaltyReason, type User } from '@prisma/client';
import { addPoints } from '../../lib/loyalty';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.NODE_ENV === 'test' ? 1000 : config.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' },
});

const email = z.string().trim().toLowerCase().email('Please enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Please enter a valid phone number');

// Compared against when the email doesn't exist, so response time doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

async function session(user: User) {
  return {
    user: publicUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken: await issueRefreshToken(user.id),
  };
}

authRouter.post('/signup', authLimiter, async (req, res) => {
  const data = body(
    req,
    z.object({ name: z.string().trim().min(2, 'Please enter your name').max(80), email, password, phone: phone.optional() }),
  );
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({
      data: { name: data.name, email: data.email, phone: data.phone, passwordHash },
    });
    await addPoints(tx, {
      userId: created.id,
      points: config.LOYALTY_SIGNUP_BONUS,
      reason: LoyaltyReason.SIGNUP_BONUS,
      note: 'Welcome to the loyalty programme',
    });
    return created;
  });
  res.status(201).json({ message: 'Account created', ...(await session(user)) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const data = body(req, z.object({ email, password: z.string().min(1, 'Password is required') }));
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = await bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Incorrect email or password');
  res.json({ message: 'Login successful', ...(await session(user)) });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(1) }));
  const userId = await consumeRefreshToken(refreshToken);
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!user) throw unauthorized('Session expired. Please log in again.');
  res.json(await session(user));
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = body(req, z.object({ refreshToken: z.string().min(1) }));
  await revokeRefreshToken(refreshToken);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).sub } });
  if (!user) throw unauthorized();
  res.json({ user: publicUser(user) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const data = body(
    req,
    z.object({ name: z.string().trim().min(2).max(80).optional(), phone: phone.nullable().optional() }),
  );
  const user = await prisma.user.update({ where: { id: currentUser(req).sub }, data });
  res.json({ user: publicUser(user) });
});

authRouter.post('/change-password', requireAuth, authLimiter, async (req, res) => {
  const data = body(req, z.object({ currentPassword: z.string().min(1), newPassword: password }));
  const { sub } = currentUser(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sub } });
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    throw badRequest('Current password is incorrect');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: sub }, data: { passwordHash: await bcrypt.hash(data.newPassword, 10) } }),
    // Sign out other devices.
    prisma.refreshToken.updateMany({ where: { userId: sub, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  res.json({ message: 'Password updated', ...(await session(user)) });
});
