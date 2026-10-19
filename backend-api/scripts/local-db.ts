/**
 * Runs a real PostgreSQL server from npm binaries — no Docker or system install needed.
 * Data persists in ./.pgdata. Stop with Ctrl+C.
 */
import path from 'node:path';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);
const dataDir = path.resolve(__dirname, '..', '.pgdata');

async function main() {
  const firstRun = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
  });

  if (firstRun) await pg.initialise();
  await pg.start();
  if (firstRun) await pg.createDatabase('salon');

  console.log(`Postgres ready on localhost:${PORT} (database "salon"). Ctrl+C to stop.`);

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
