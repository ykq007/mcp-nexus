import { existsSync } from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

const src = path.resolve('packages/admin-ui/dist');
const destAdmin = path.resolve('public/admin');
const destLegacy = path.resolve('public/admin-ui');
const destWorker = path.resolve('packages/worker/public/admin');

if (!existsSync(src)) {
  throw new Error(`Expected admin UI build output at: ${src}`);
}

const destinations = [destAdmin, destLegacy];

// Cloudflare Worker serves static assets from packages/worker/public (wrangler assets.directory).
// Keep a prebuilt copy there so Deploy Button / worker-only builds pick up the latest Admin UI.
if (existsSync(path.resolve('packages/worker'))) {
  destinations.push(destWorker);
}

for (const dest of destinations) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
}

// eslint-disable-next-line no-console
console.log(
  `Synced admin UI assets to ${destAdmin} (and ${destLegacy} for compatibility)${destinations.includes(destWorker) ? ` and ${destWorker} for Cloudflare Worker` : ''}`
);
