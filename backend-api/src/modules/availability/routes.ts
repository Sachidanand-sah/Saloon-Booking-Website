import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../middleware/validate';
import { getAvailability } from './service';

export const availabilityRouter = Router();

availabilityRouter.get('/', async (req, res) => {
  const q = query(
    req,
    z.object({
      serviceId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
      staffId: z.string().min(1).optional(),
      locationId: z.string().min(1).optional(),
    }),
  );
  res.json(await getAvailability(q));
});
