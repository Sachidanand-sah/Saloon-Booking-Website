import type { Request } from 'express';
import type { z, ZodTypeAny } from 'zod';
import { badRequest } from '../lib/errors';

function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw badRequest(details[0] ? `${details[0].field || 'request'}: ${details[0].message}` : 'Invalid request', details);
  }
  return result.data;
}

export const body = <S extends ZodTypeAny>(req: Request, schema: S) => parse(schema, req.body);
export const query = <S extends ZodTypeAny>(req: Request, schema: S) => parse(schema, req.query);
