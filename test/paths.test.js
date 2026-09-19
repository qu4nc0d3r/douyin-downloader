import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeRootDir, getSeaAsset, isPackaged, resolveDirs, writableDir } from '../src/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

test('resolveDirs for SEA keeps code root at module parent and writes next to the exe', () => {
  const dirs = resolveDirs({
    sea: true,
    electron: false,
    defaultApp: false,
    execPath: 'C:\\apps\\DouyinDownloader.exe',
    moduleDir: 'C:\\repo\\build',
  });
  assert.equal(dirs.codeRootDir, 'C:\\repo');
  assert.equal(dirs.writableDir, 'C:\\apps');
});

test('resolveDirs for packaged Electron writes next to the exe and reads code from resources/app', () => {
  const dirs = resolveDirs({
    sea: false,
    electron: true,
    defaultApp: false,
    execPath: 'C:\\apps\\Douyin Downloader.exe',
    moduleDir: 'C:\\project\\dist-desktop\\win-unpacked\\resources\\app\\src',
  });
  assert.equal(dirs.codeRootDir, 'C:\\project\\dist-desktop\\win-unpacked\\resources\\app');
  assert.equal(dirs.writableDir, 'C:\\apps');
});

test('resolveDirs in dev (node or electron .) writes into the project root', () => {
  const node = resolveDirs({
    sea: false,
    electron: false,
    defaultApp: false,
    execPath: 'C:\\node\\node.exe',
    moduleDir: path.join(projectRoot, 'src'),
  });
  assert.equal(node.writableDir, projectRoot);

  const electronDev = resolveDirs({
    sea: false,
    electron: true,
    defaultApp: true,
    execPath: 'C:\\repo\\node_modules\\electron\\dist\\electron.exe',
    moduleDir: path.join(projectRoot, 'src'),
  });
  assert.equal(electronDev.writableDir, projectRoot);
  assert.equal(electronDev.codeRootDir, projectRoot);
});

test('isPackaged is false under the node test runner', () => {
  assert.equal(isPackaged(), false);
});

test('codeRootDir and writableDir point at the project root in dev', () => {
  assert.ok(fs.existsSync(path.join(codeRootDir(), 'package.json')));
  assert.equal(writableDir(), projectRoot);
});

test('getSeaAsset returns undefined when not packaged', () => {
  assert.equal(getSeaAsset('web/index.html'), undefined);
});
