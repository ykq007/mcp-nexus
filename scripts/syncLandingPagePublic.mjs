import { existsSync } from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

const src = path.resolve('packages/landing-page/dist');
const destBridgeServer = path.resolve('packages/bridge-server/public');
const destWorker = path.resolve('packages/worker/public');

if (!existsSync(src)) {
  throw new Error(`Expected landing page build output at: ${src}`);
}

// bridge-server only serves the landing page from this directory; safe to fully replace.
await rm(destBridgeServer, { recursive: true, force: true });
await mkdir(destBridgeServer, { recursive: true });
await cp(src, destBridgeServer, { recursive: true });

// Worker public directory also contains the Admin UI under /admin; only replace landing outputs.
await rm(path.join(destWorker, 'index.html'), { force: true });
await rm(path.join(destWorker, 'assets'), { recursive: true, force: true });
await mkdir(destWorker, { recursive: true });
await cp(src, destWorker, { recursive: true });

// eslint-disable-next-line no-console
console.log(`Synced landing page assets to ${destBridgeServer} and ${destWorker}`);
