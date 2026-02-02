import { existsSync } from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

const src = path.resolve('packages/admin-ui/dist');
const destAdmin = path.resolve('public/admin');
const destLegacy = path.resolve('public/admin-ui');

if (!existsSync(src)) {
  throw new Error(`Expected admin UI build output at: ${src}`);
}

for (const dest of [destAdmin, destLegacy]) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
}

// eslint-disable-next-line no-console
console.log(`Synced admin UI assets to ${destAdmin} (and ${destLegacy} for compatibility)`);
