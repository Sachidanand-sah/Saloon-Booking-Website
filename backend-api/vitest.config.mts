import { defineConfig } from 'vitest/config';
import 'dotenv/config';
import { testDatabaseUrl } from './tests/test-db.mjs';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
    globalSetup: './tests/global-setup.ts',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      SALON_TIMEZONE: 'Asia/Kathmandu',
      MIN_LEAD_MINS: '60',
      CANCEL_CUTOFF_MINS: '120',
    },
  },
});
