import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSea, getAsset } from 'node:sea';

export function resolveDirs({ sea, electron, defaultApp, execPath, moduleDir }) {
  const codeRootDir = path.resolve(moduleDir, '..');
  const writableDir = sea || (electron && !defaultApp) ? path.dirname(execPath) : codeRootDir;
  return { codeRootDir, writableDir };
}

function currentModuleDir() {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
}

export function isPackaged() {
  try {
    return typeof isSea === 'function' && isSea();
  } catch {
    return false;
  }
}

function currentDirs() {
  return resolveDirs({
    sea: isPackaged(),
    electron: Boolean(process.versions?.electron),
    defaultApp: Boolean(process.defaultApp),
    execPath: process.execPath,
    moduleDir: currentModuleDir(),
  });
}

export function codeRootDir() {
  return currentDirs().codeRootDir;
}

export function writableDir() {
  return currentDirs().writableDir;
}

export function getSeaAsset(key) {
  if (!isPackaged()) return undefined;
  try {
    return getAsset(key);
  } catch {
    return undefined;
  }
}
