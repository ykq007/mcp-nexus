import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const landingPageDistDir = join(rootDir, 'packages/landing-page/dist');
const bridgeServerPublicDir = join(rootDir, 'packages/bridge-server/public');
const workerPublicDir = join(rootDir, 'packages/worker/public');

function copyRecursive(src, dest) {
  try {
    mkdirSync(dest, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      const content = readFileSync(srcPath);
      writeFileSync(destPath, content);
      console.log(`  Copied: ${entry.name}`);
    }
  }
}

console.log('Syncing landing page to public directories...\n');

console.log('→ Copying to bridge-server/public/');
copyRecursive(landingPageDistDir, bridgeServerPublicDir);

console.log('\n→ Copying to worker/public/');
copyRecursive(landingPageDistDir, workerPublicDir);

console.log('\n✓ Landing page sync complete!');
