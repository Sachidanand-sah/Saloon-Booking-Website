import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken, type AccessPayload } from '../lib/tokens';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized();
  try {
    req.auth = verifyAccessToken(header.slice(7));
  } catch {
    throw unauthorized('Session expired or invalid token');
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };

export function currentUser(req: Express.Request): AccessPayload {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
