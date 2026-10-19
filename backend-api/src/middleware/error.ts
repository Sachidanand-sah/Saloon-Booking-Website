import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'Malformed JSON body' });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ code: 'CONFLICT', message: 'A record with these details already exists' });
    return;
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL', message: 'Something went wrong. Please try again.' });
};
