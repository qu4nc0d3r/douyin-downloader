import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractError } from './errors.js';
import { createSettings, splitCookiePairs } from './settings.js';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
];

export function findBrowserExecutable() {
  const fromEnv = process.env.DOUYIN_BROWSER_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  for (const candidate of CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw extractError('BROWSER_NOT_FOUND', 'Không tìm thấy Chrome hoặc Edge trên máy');
}

function buildApiExpression(url) {
  return `(async () => {
    const res = await fetch(${JSON.stringify(url)}, { credentials: 'include' });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 2000000) };
  })()`;
}

const COMMON_PARAMS =
  'device_platform=webapp&aid=6383&channel=channel_pc_web&pc_client_type=1' +
  '&version_code=190500&version_name=19.5.0&cookie_enabled=true&platform=PC&downlink=10';

export function buildFetchExpression(awemeId) {
  if (!/^\d{15,20}$/.test(String(awemeId))) {
    throw extractError('NOT_FOUND', `Invalid aweme id: ${awemeId}`);
  }
  const url =
    `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}` + `&${COMMON_PARAMS}`;
  return buildApiExpression(url);
}

export function buildSelfProfileExpression() {
  const url =
    'https://www.douyin.com/aweme/v1/web/user/profile/self/?' +
    'device_platform=webapp&aid=6383&channel=channel_pc_web&pc_client_type=1' +
    '&version_code=190500&version_name=19.5.0&cookie_enabled=true&platform=PC&downlink=10';
  return buildApiExpression(url);
}

export const SEC_UID_RE = /^[A-Za-z0-9_-]{20,128}$/;

export function buildUserProfileExpression(secUid) {
  if (!SEC_UID_RE.test(String(secUid))) {
    throw extractError('NOT_FOUND', `Invalid sec uid: ${secUid}`);
  }
  const url =
    `https://www.douyin.com/aweme/v1/web/user/profile/other/?sec_user_id=${secUid}` +
    `&${COMMON_PARAMS}`;
  return buildApiExpression(url);
}

export function buildUserPostExpression(secUid, maxCursor = 0, count = 18) {
  if (!SEC_UID_RE.test(String(secUid))) {
    throw extractError('NOT_FOUND', `Invalid sec uid: ${secUid}`);
  }
  const cursor = Math.max(0, Number(maxCursor) || 0);
  const pageSize = Number(count) || 18;
  const url =
    `https://www.douyin.com/aweme/v1/web/aweme/post/?sec_user_id=${secUid}` +
    `&max_cursor=${cursor}&count=${pageSize}&${COMMON_PARAMS}`;
  return buildApiExpression(url);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const AUTH_COOKIE_NAMES = [
  'sessionid',
  'sessionid_ss',
  'sid_tt',
  'sid_tt_ss',
  'uid_tt',
  'uid_tt_ss',
  'sid_guard',
  'session_tlb_tag',
  'sid_ucp_v1',
  'ssid_ucp_v1',
  'passport_csrf_token',
  'passport_csrf_token_default',
  'passport_assist_user',
  'd_ticket',
  'login_time',
  'is_staff_user',
  'has_biz_token',
];

export function cookieToCdpParams(cookie) {
  return splitCookiePairs(cookie)
    .filter(({ name }) => AUTH_COOKIE_NAMES.includes(name))
    .map(({ name, value }) => ({
      name,
      value,
      domain: '.douyin.com',
      path: '/',
      secure: true,
    }));
}

export const DEFAULT_IDLE_TIMEOUT_MS = 120_000;

export function getBrowserLaunchFlags(port, userDataDir) {
  return [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--mute-audio',
    '--blink-settings=imagesEnabled=false',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    `--user-agent=${DESKTOP_UA}`,
    'about:blank',
  ];
}

export class DouyinBrowser {
  constructor() {
    this.child = null;
    this.ws = null;
    this.userDataDir = null;
    this.sessionId = null;
    this.msgId = 0;
    this.pending = new Map();
    this.ready = false;
    this.settings = createSettings();
    this.activeRequests = 0;
    this.idleTimer = null;
    this.startPromise = null;
    this.apiQueue = Promise.resolve();
  }

  scheduleIdleTimer(timeoutMs) {
    this.clearIdleTimer();
    const duration =
      timeoutMs !== undefined
        ? timeoutMs
        : Number(process.env.BROWSER_IDLE_TIMEOUT_MS) || DEFAULT_IDLE_TIMEOUT_MS;
    if (duration <= 0 || !this.ready) return;
    this.idleTimer = setTimeout(() => {
      resetBrowser().catch(() => {});
    }, duration);
    this.idleTimer.unref?.();
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  async start() {
    if (this.ready) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = (async () => {
      try {
        const exe = findBrowserExecutable();
        this.userDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'douyin-dl-'));
        const port = 9000 + Math.floor(Math.random() * 1000);
        this.child = spawn(exe, getBrowserLaunchFlags(port, this.userDataDir), { stdio: 'ignore' });
        this.child.on('exit', () => {
          this.ready = false;
          this.ws = null;
          this.child = null;
        });

        const version = await this.#waitForCdp(port);
        await this.#connect(version.webSocketDebuggerUrl);
        await this.#applyCookie();
        const { targetId } = await this.#send('Target.createTarget', { url: 'https://www.douyin.com/' });
        const { sessionId } = await this.#send('Target.attachToTarget', { targetId, flatten: true });
        this.sessionId = sessionId;
        await this.#send('Runtime.enable', {}, sessionId);
        this.ready = true;
        this.scheduleIdleTimer();
      } finally {
        this.startPromise = null;
      }
    })();
    return this.startPromise;
  }

  async #applyCookie() {
    const cookie = this.settings.getCookie();
    if (!cookie) return;
    const cookies = cookieToCdpParams(cookie);
    if (cookies.length === 0) return;
    try {
      await this.#send('Storage.setCookies', { cookies });
    } catch {}
  }

  async #waitForCdp(port) {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) return res.json();
      } catch {}
      await sleep(250);
    }
    throw extractError('PARSE_FAILED', 'Không kết nối được DevTools của trình duyệt');
  }

  #connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        this.ws = ws;
        resolve();
      };
      ws.onerror = () => reject(extractError('PARSE_FAILED', 'Kết nối CDP thất bại'));
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(extractError('PARSE_FAILED', JSON.stringify(msg.error)));
          else res(msg.result);
        }
      };
    });
  }

  #send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(extractError('PARSE_FAILED', 'Trình duyệt chưa khởi động'));
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  async fetchAwemeDetail(awemeId) {
    const run = () => this.#fetchApi(buildFetchExpression(awemeId), (parsed) => !!parsed?.aweme_detail);
    const queued = this.apiQueue.then(run, run);
    this.apiQueue = queued.catch(() => {});
    const data = await queued;
    return data.aweme_detail;
  }

  async fetchSelfProfile() {
    const run = () => this.#fetchApi(buildSelfProfileExpression());
    const queued = this.apiQueue.then(run, run);
    this.apiQueue = queued.catch(() => {});
    return queued;
  }

  async fetchUserProfile(secUid) {
    const run = () =>
      this.#fetchApi(buildUserProfileExpression(secUid), (parsed) => !!parsed?.user);
    const queued = this.apiQueue.then(run, run);
    this.apiQueue = queued.catch(() => {});
    return queued;
  }

  async fetchUserPosts(secUid, { maxCursor = 0, count = 18 } = {}) {
    const run = () =>
      this.#fetchApi(
        buildUserPostExpression(secUid, maxCursor, count),
        (parsed) => Array.isArray(parsed?.aweme_list),
      );
    const queued = this.apiQueue.then(run, run);
    this.apiQueue = queued.catch(() => {});
    return queued;
  }

  async #fetchApi(expression, isValid = () => true) {
    this.clearIdleTimer();
    this.activeRequests++;
    try {
      await this.start();
      for (let attempt = 0; attempt < 20; attempt++) {
        const result = await this.#send(
          'Runtime.evaluate',
          { expression, awaitPromise: true, returnByValue: true },
          this.sessionId,
        );
        const value = result?.result?.value;
        if (value?.status === 200) {
          try {
            const parsed = JSON.parse(value.body);
            if (isValid(parsed)) return parsed;
          } catch {}
        }
        await sleep(500);
      }
      throw extractError('PARSE_FAILED', 'Douyin không trả về dữ liệu');
    } finally {
      this.activeRequests--;
      if (this.activeRequests <= 0) {
        this.activeRequests = 0;
        this.scheduleIdleTimer();
      }
    }
  }

  async close() {
    this.clearIdleTimer();
    this.startPromise = null;
    this.apiQueue = Promise.resolve();
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.ready = false;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    if (this.userDataDir) {
      await fsp.rm(this.userDataDir, { recursive: true, force: true }).catch(() => {});
      this.userDataDir = null;
    }
  }
}

let browserInstance = null;
let launchPromise = null;

export async function getBrowser() {
  if (browserInstance?.ready) return browserInstance;
  if (launchPromise) return launchPromise;

  launchPromise = (async () => {
    try {
      if (!browserInstance || !browserInstance.ready) {
        browserInstance = new DouyinBrowser();
        await browserInstance.start();
      }
      return browserInstance;
    } finally {
      launchPromise = null;
    }
  })();

  return launchPromise;
}

export async function warmupBrowser() {
  try {
    const b = await getBrowser();
    return b?.ready ?? false;
  } catch {
    return false;
  }
}

export async function resetBrowser() {
  launchPromise = null;
  if (browserInstance) {
    const inst = browserInstance;
    browserInstance = null;
    await inst.close();
  }
}

process.on('exit', () => {
  try {
    browserInstance?.child?.kill();
  } catch {}
});
