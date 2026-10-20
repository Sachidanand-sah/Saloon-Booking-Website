/**
 * Lets the backend deploy on Render with the service's default commands
 * (build: `yarn` / `npm install`, start: `npm start` or `npm run dev`) run from the repo root.
 *
 * Only does anything when Render's RENDER env var is set, so `npm install` in the
 * repo root on a developer machine never builds or migrates anything.
 *
 *   node scripts/render.cjs build   install, compile and migrate backend-api
 *   node scripts/render.cjs start   start the compiled API
 */
const { execSync, spawn } = require('node:child_process');
const path = require('node:path');

const backend = path.join(__dirname, '..', 'backend-api');
const onRender = !!process.env.RENDER;
const command = process.argv[2];

const run = cmd => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: backend, stdio: 'inherit', env: process.env });
};

if (!onRender) {
  if (command === 'start') {
    console.log('This repo holds three apps. For local development run `npm run dev` inside');
    console.log('backend-api/ and beauty-salon-booking/, or `npm start` inside customer-mobile-app/.');
  }
  process.exit(0);
}

if (command === 'build') {
  // Dev dependencies (TypeScript, Prisma CLI) are needed to build even in production.
  run('npm install --include=dev');
  run('npm run build');
  run('npx prisma migrate deploy');
} else if (command === 'start') {
  const child = spawn('npm', ['start'], { cwd: backend, stdio: 'inherit', env: process.env, shell: true });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', code => process.exit(code ?? 0));
} else {
  console.error('Usage: node scripts/render.cjs build|start');
  process.exit(1);
}
