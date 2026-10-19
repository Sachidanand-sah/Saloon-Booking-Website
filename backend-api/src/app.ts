import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/routes';
import { catalogRouter } from './modules/catalog/routes';
import { availabilityRouter } from './modules/availability/routes';
import { bookingsRouter } from './modules/bookings/routes';
import { reviewsRouter } from './modules/reviews/routes';
import { adminRouter } from './modules/admin/routes';
import { adminExtrasRouter } from './modules/admin/extras';
import { membershipsRouter, plansRouter } from './modules/memberships/routes';
import { loyaltyRouter } from './modules/loyalty/routes';
import { eventPackagesRouter, eventRequestsRouter } from './modules/events/routes';
import { productsRouter, reservationsRouter } from './modules/products/routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      // Native mobile apps send no Origin header; browsers must be on the allow-list.
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin) || config.NODE_ENV === 'development'),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  if (config.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.get('/', (_req, res) => {
    res.json({ name: 'Lalima Beauty API', status: 'ok', docs: '/api/health' });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', catalogRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/memberships', membershipsRouter);
  app.use('/api/loyalty', loyaltyRouter);
  app.use('/api/event-packages', eventPackagesRouter);
  app.use('/api/event-requests', eventRequestsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin', adminExtrasRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
