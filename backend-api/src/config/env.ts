import 'dotenv/config';
import { z } from 'zod';
import { IANAZone } from 'luxon';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default(''),
  SALON_TIMEZONE: z.string().refine(tz => IANAZone.isValidZone(tz), 'must be a valid IANA time zone').default('UTC'),
  CURRENCY: z.string().length(3).default('NPR'),
  SLOT_STEP_MINS: z.coerce.number().int().min(5).max(120).default(15),
  MIN_LEAD_MINS: z.coerce.number().int().min(0).default(60),
  BOOKING_WINDOW_DAYS: z.coerce.number().int().positive().default(90),
  CANCEL_CUTOFF_MINS: z.coerce.number().int().min(0).default(120),
  // Login/signup attempts allowed per client IP per 15 minutes.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  // Loyalty programme: points earned per Rs. 100 paid, value of one point (paisa),
  // max share of a visit payable with points, and the welcome bonus.
  LOYALTY_POINTS_PER_100: z.coerce.number().min(0).default(5),
  LOYALTY_POINT_VALUE_CENTS: z.coerce.number().int().positive().default(100),
  LOYALTY_MAX_REDEEM_PERCENT: z.coerce.number().int().min(0).max(100).default(50),
  LOYALTY_SIGNUP_BONUS: z.coerce.number().int().min(0).default(100),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.startsWith('change-me')) {
  console.error('Refusing to start in production with the example JWT secrets.');
  process.exit(1);
}

export const config = {
  ...env,
  corsOrigins: env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
};
