import path from 'node:path';
import { app, BrowserWindow, Menu, MenuItem, dialog, screen, session, shell } from 'electron';
import { createApp } from '../src/app.js';
import { resetBrowser } from '../src/browser.js';
import { writableDir } from '../src/paths.js';
import { computeRestoredState, createWindowStateStore } from './window-state.js';

let server = null;
let win = null;
let saveTimer = null;

const stateStore = createWindowStateStore(path.join(writableDir(), 'data', 'window-state.json'));

const CLIPBOARD_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write']);

function isAppUrl(url) {
  try {
    return new URL(url).hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      shell.openExternal(url).catch(() => {});
    }
  } catch {}
}

function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getNormalBounds();
  stateStore.save({ ...bounds, maximized: win.isMaximized() });
}

function scheduleSaveWindowState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveWindowState();
  }, 400);
}

function setupSession() {
  const allow = (contents, permission) =>
    CLIPBOARD_PERMISSIONS.has(permission) && isAppUrl(contents?.getURL?.() || '');

  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(allow(contents, permission));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => allow(contents, permission));
}

function createWindow(url) {
  const primary = screen.getPrimaryDisplay();
  const others = screen.getAllDisplays().filter((display) => display.id !== primary.id);
  const state = computeRestoredState(stateStore.load(), [primary, ...others]);

  win = new BrowserWindow({
    ...state.bounds,
    minWidth: 940,
    minHeight: 640,
    title: 'Douyin Downloader',
    backgroundColor: '#0c1210',
    autoHideMenuBar: true,
    ...(process.platform === 'win32'
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: { color: '#101814', symbolColor: '#e9f2ec', height: 44 },
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  const origin = new URL(url).origin;

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    openExternal(target);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(origin)) {
      event.preventDefault();
      openExternal(target);
    }
  });
  win.webContents.on('context-menu', (event, params) => {
    if (!params.isEditable && !params.selectionText) return;
    const menu = new Menu();
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'cut', enabled: params.editFlags.canCut }));
    }
    menu.append(new MenuItem({ role: 'copy', enabled: params.editFlags.canCopy }));
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'paste', enabled: params.editFlags.canPaste }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    }
    menu.popup({ window: win });
  });

  win.on('resize', scheduleSaveWindowState);
  win.on('move', scheduleSaveWindowState);
  win.on('close', saveWindowState);
  win.on('closed', () => {
    win = null;
  });

  if (state.maximized) win.maximize();

  win.loadURL(url);
}

async function listenOn(expressApp, port) {
  return new Promise((resolve, reject) => {
    const instance = expressApp.listen(port, '127.0.0.1');
    instance.once('listening', () => resolve(instance));
    instance.once('error', reject);
  });
}

async function startServer() {
  const expressApp = createApp();
  const preferred = Number(process.env.PORT) || 3030;
  try {
    server = await listenOn(expressApp, preferred);
  } catch (err) {
    if (err?.code !== 'EADDRINUSE') throw err;
    server = await listenOn(expressApp, 0);
  }
  return server.address().port;
}

async function start() {
  try {
    process.loadEnvFile(path.join(writableDir(), '.env'));
  } catch {}
  setupSession();
  Menu.setApplicationMenu(null);
  const port = await startServer();
  createWindow(`http://127.0.0.1:${port}`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.on('window-all-closed', () => app.quit());

  app.on('before-quit', () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveWindowState();
    try {
      server?.close();
    } catch {}
  });

  app.on('will-quit', () => {
    resetBrowser().catch(() => {});
  });

  app
    .whenReady()
    .then(start)
    .catch((err) => {
      dialog.showErrorBox('Douyin Downloader', `Không khởi động được ứng dụng:\n${err?.message || err}`);
      app.quit();
    });
}
