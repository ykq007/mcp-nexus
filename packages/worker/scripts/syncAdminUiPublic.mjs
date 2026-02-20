import { existsSync } from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, '..');

const src = path.resolve(workerRoot, '../admin-ui/dist');
const dest = path.resolve(workerRoot, 'public/admin');

if (!existsSync(src)) {
  throw new Error(`Expected admin UI build output at: ${src}`);
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });

// eslint-disable-next-line no-console
console.log(`Synced admin UI assets to ${dest}`);

