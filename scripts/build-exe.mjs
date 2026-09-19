import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const distDir = path.join(root, 'dist');
const bundlePath = path.join(buildDir, 'server.cjs');
const seaConfigPath = path.join(buildDir, 'sea-config.json');
const blobPath = path.join(buildDir, 'sea-prep.blob');
const exeName = process.platform === 'win32' ? 'DouyinDownloader.exe' : 'DouyinDownloader';
const exePath = path.join(distDir, exeName);

const NODE_SEA_SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const LUCIDE_ASSET_KEY = 'web/vendor/lucide/lucide.min.js';

async function collectAssets() {
  const assets = {};
  const publicDir = path.join(root, 'public');
  const entries = await fsp.readdir(publicDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const abs = path.join(entry.parentPath, entry.name);
    const rel = path.relative(publicDir, abs).split(path.sep).join('/');
    assets[`web/${rel}`] = abs;
  }

  const lucidePath = path.join(root, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
  if (!fs.existsSync(lucidePath)) {
    throw new Error('Thiếu node_modules/lucide — chạy "npm install" trước khi build.');
  }
  assets[LUCIDE_ASSET_KEY] = lucidePath;
  return assets;
}

async function bundleServer() {
  await build({
    entryPoints: [path.join(root, 'server.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    outfile: bundlePath,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'warning',
    logOverride: { 'empty-import-meta': 'silent' },
  });
}

async function buildExe() {
  await fsp.rm(buildDir, { recursive: true, force: true });
  await fsp.rm(distDir, { recursive: true, force: true });
  await fsp.mkdir(buildDir, { recursive: true });
  await fsp.mkdir(distDir, { recursive: true });

  console.log('1/4 Bundle server.js bằng esbuild...');
  await bundleServer();

  console.log('2/4 Tạo SEA blob (nhúng giao diện web)...');
  const assets = await collectAssets();
  const seaConfig = {
    main: bundlePath,
    output: blobPath,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false,
    assets,
  };
  await fsp.writeFile(seaConfigPath, JSON.stringify(seaConfig, null, 2));
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
    cwd: root,
    stdio: 'inherit',
  });

  console.log(`3/4 Copy node.exe (${process.version}) -> ${exeName}...`);
  await fsp.copyFile(process.execPath, exePath);

  console.log('4/4 Inject blob vào exe bằng postject...');
  const { inject } = await import('postject');
  await inject(exePath, 'NODE_SEA_BLOB', await fsp.readFile(blobPath), {
    sentinelFuse: NODE_SEA_SENTINEL_FUSE,
    overwrite: true,
  });

  const { size } = await fsp.stat(exePath);
  console.log(`\nXong: ${exePath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log('Double-click để chạy; downloads/ và data/ sẽ tạo cạnh file exe.');
}

buildExe().catch((err) => {
  console.error(err);
  process.exit(1);
});
