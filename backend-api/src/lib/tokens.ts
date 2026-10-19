import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config/env';
import { prisma } from './prisma';

export type AccessPayload = { sub: string; role: Role };

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: config.JWT_ACCESS_TTL as SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessPayload;
}

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Refresh tokens are opaque random strings; only their hash is stored so a DB leak can't be replayed. */
export async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.JWT_REFRESH_TTL_DAYS * 86_400_000);
  await prisma.refreshToken.create({ data: { userId, tokenHash: hash(token), expiresAt } });
  return token;
}

/** Validates and revokes a refresh token (rotation). Returns the owning user id, or null if invalid. */
export async function consumeRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count === 1 ? record.userId : null;
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
