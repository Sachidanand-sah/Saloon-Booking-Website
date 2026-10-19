import { config } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const server = createApp().listen(config.PORT, '0.0.0.0', () => {
  console.log(`Lalima Beauty API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
