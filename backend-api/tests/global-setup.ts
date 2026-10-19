import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
// @ts-expect-error -- plain .mjs helper shared with vitest.config.mts
import { testDatabaseUrl } from './test-db.mjs';

export default async function setup() {
  const url: string = testDatabaseUrl();
  const env = { ...process.env, DATABASE_URL: url };

  // Create the database if needed and apply migrations (non-destructive).
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });

  // Empty every table so each run starts clean. Guarded by testDatabaseUrl()'s _test check.
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map(t => `"${t.tablename}"`).join(', ')} CASCADE`);
  }
  await prisma.$disconnect();
}
