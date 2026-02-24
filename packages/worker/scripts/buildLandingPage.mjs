import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, '..');

const landingRoot = path.resolve(workerRoot, '../landing-page');
const landingPackageJson = path.join(landingRoot, 'package.json');
const landingDist = path.join(landingRoot, 'dist');

const dest = path.resolve(workerRoot, 'public');

if (!existsSync(landingPackageJson)) {
  // Deploy Button builds an isolated repo from `packages/worker/` only. In that
  // template environment, the landing page workspace is not present, but
  // prebuilt assets are committed in `public/`.
  console.log('Landing page source not found; using prebuilt assets in public/.');
  process.exit(0);
}

const buildExit = await run(NPM, ['run', 'build'], { cwd: landingRoot });
if (buildExit !== 0) {
  process.exit(buildExit);
}

if (!existsSync(landingDist)) {
  throw new Error(`Landing page build output not found at: ${landingDist}`);
}

// Clean only the landing page outputs; preserve /public/admin for the Admin UI.
await rm(path.join(dest, 'index.html'), { force: true });
await rm(path.join(dest, 'assets'), { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(landingDist, dest, { recursive: true });

console.log(`Synced landing page assets to ${dest}`);

