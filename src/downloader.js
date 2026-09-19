import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { probeRange, downloadSegmented, parseContentRange } from './segmented.js';

const DOWNLOAD_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const ALLOWED_SUFFIXES = [
  'douyin.com',
  'iesdouyin.com',
  'snssdk.com',
  'douyinpic.com',
  'byteimg.com',
  'douyinvod.com',
  'byteicdn.com',
  'ibytedtos.com',
  'volccdn.com',
  'zjcdn.com',
  'pstatp.com',
];

const SEGMENT_MIN_SIZE = Number(process.env.SEGMENT_MIN_SIZE) || 80 * 1024 * 1024;
const SEGMENTS = Number(process.env.SEGMENTS) || 8;
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 16 * 1024 * 1024;
const STALL_TIMEOUT_MS = Number(process.env.STALL_TIMEOUT_MS) || 30000;
const DOWNLOAD_RETRIES = Number(process.env.DOWNLOAD_RETRIES) || 2;

function downloadError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headerSafeCookie(cookie) {
  return String(cookie || '')
    .replace(/[\r\n\x00-\x1f\x7f]+/g, ' ')
    .trim();
}

export function assertAllowedUrl(rawUrl, allowedSuffixes = ALLOWED_SUFFIXES) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw downloadError('URL_NOT_ALLOWED', `Invalid URL: ${rawUrl}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw downloadError('URL_NOT_ALLOWED', `Protocol not allowed: ${parsed.protocol}`);
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = allowedSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  if (!allowed) throw downloadError('URL_NOT_ALLOWED', `Host not allowed: ${host}`);
  return parsed;
}

export async function uniqueDestPath(dir, filename) {
  await fsp.mkdir(dir, { recursive: true });
  const ext = path.extname(filename);
  const base = ext ? filename.slice(0, -ext.length) : filename;
  let candidate = path.join(dir, filename);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter})${ext}`);
    counter++;
  }
  return candidate;
}

async function downloadSingle(urls, destPath, options) {
  const { headers, onProgress, stallTimeoutMs, maxRetries, refreshUrls, signal } = options;
  const partPath = `${destPath}.part`;
  let candidates = urls.slice();
  let refreshed = false;
  let lastError = null;
  let failures = 0;

  if (signal?.aborted) {
    throw downloadError('PAUSED', 'Tải tạm dừng');
  }

  const attemptDownload = async (url) => {
    let existing = 0;
    try {
      existing = (await fsp.stat(partPath)).size;
    } catch {
      existing = 0;
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    let stallTimer = setTimeout(() => controller.abort(), stallTimeoutMs);
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { ...headers, ...(existing > 0 ? { range: `bytes=${existing}-` } : {}) },
      });

      let resumeFrom = existing;
      if (existing > 0) {
        if (res.status === 200) {
          resumeFrom = 0;
        } else if (res.status === 206) {
          const range = parseContentRange(res.headers.get('content-range'));
          if (!range || range.start !== existing) resumeFrom = 0;
        }
      }

      if (!res.ok || !res.body) {
        clearTimeout(stallTimer);
        await res.body?.cancel().catch(() => {});
        throw downloadError('DOWNLOAD_FAILED', `HTTP ${res.status} for ${url}`);
      }

      const contentLength = Number(res.headers.get('content-length')) || 0;
      const total = contentLength ? contentLength + resumeFrom : null;
      let downloaded = resumeFrom;

      const fileHandle = await fsp.open(partPath, resumeFrom > 0 ? 'a' : 'w');
      try {
        const reader = res.body.getReader();
        while (true) {
          if (signal?.aborted) {
            await reader.cancel().catch(() => {});
            throw downloadError('PAUSED', 'Tải tạm dừng');
          }
          const { value, done } = await reader.read();
          if (done) break;
          await fileHandle.write(value);
          downloaded += value.length;
          clearTimeout(stallTimer);
          stallTimer = setTimeout(() => controller.abort(), stallTimeoutMs);
          if (onProgress) onProgress({ downloaded, total });
        }
        return downloaded;
      } finally {
        await fileHandle.close().catch(() => {});
      }
    } finally {
      clearTimeout(stallTimer);
      signal?.removeEventListener('abort', onAbort);
    }
  };

  while (true) {
    if (signal?.aborted) {
      throw downloadError('PAUSED', 'Tải tạm dừng');
    }
    const url = candidates[failures % candidates.length];
    try {
      await attemptDownload(url);
      const stat = await fsp.stat(partPath);
      if (stat.size === 0) throw downloadError('DOWNLOAD_FAILED', 'Downloaded file is empty');
      await fsp.rename(partPath, destPath);
      return { path: destPath, size: stat.size };
    } catch (err) {
      if (signal?.aborted || err?.code === 'PAUSED') {
        throw downloadError('PAUSED', 'Tải tạm dừng');
      }
      lastError =
        err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 'ABORT_ERR'
          ? downloadError('DOWNLOAD_FAILED', 'Download stalled (no data received)')
          : err;
      failures++;
      const forbidden = /HTTP 40[13]/.test(lastError.message || '');
      if ((forbidden || failures > maxRetries) && refreshUrls && !refreshed) {
        refreshed = true;
        const fresh = await refreshUrls().catch(() => null);
        if (Array.isArray(fresh) && fresh.length > 0) {
          candidates = fresh.slice();
          failures = 0;
        }
      }
      if (failures > candidates.length * (maxRetries + 1)) break;
      await sleep(Math.min(1000 * failures, 3000));
    }
  }
  throw lastError?.code ? lastError : downloadError('DOWNLOAD_FAILED', 'All candidate URLs failed');
}

export async function downloadFile(urls, destPath, options = {}) {
  const {
    onProgress,
    allowedSuffixes,
    cookie,
    refreshUrls,
    signal,
    segmentMinSize = SEGMENT_MIN_SIZE,
    segments = SEGMENTS,
    chunkSize = CHUNK_SIZE,
    stallTimeoutMs = STALL_TIMEOUT_MS,
    maxRetries = DOWNLOAD_RETRIES,
  } = options;

  if (signal?.aborted) {
    throw downloadError('PAUSED', 'Tải tạm dừng');
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    throw downloadError('DOWNLOAD_FAILED', 'No candidate URLs');
  }

  const safeCookie = headerSafeCookie(cookie);
  const allowedUrls = [];
  let firstNotAllowed = null;
  for (const raw of urls) {
    try {
      allowedUrls.push(assertAllowedUrl(raw, allowedSuffixes).toString());
    } catch (err) {
      firstNotAllowed = firstNotAllowed || err;
    }
  }
  if (allowedUrls.length === 0) {
    throw firstNotAllowed || downloadError('URL_NOT_ALLOWED', 'No allowed URLs');
  }

  const headers = {
    'user-agent': DOWNLOAD_UA,
    referer: 'https://www.douyin.com/',
    ...(safeCookie ? { cookie: safeCookie } : {}),
  };

  if (segmentMinSize > 0) {
    const probe = await probeRange(allowedUrls[0], headers);
    if (probe && probe.total >= segmentMinSize) {
      try {
        return await downloadSegmented(allowedUrls, destPath, {
          total: probe.total,
          headers,
          onProgress,
          segments,
          chunkSize,
          stallTimeoutMs,
          maxRetries,
          refreshUrls,
          signal,
        });
      } catch (err) {
        if (err?.code === 'PAUSED' || signal?.aborted) {
          throw downloadError('PAUSED', 'Tải tạm dừng');
        }
        await fsp.rm(`${destPath}.part`, { force: true }).catch(() => {});
        await fsp.rm(`${destPath}.part.json`, { force: true }).catch(() => {});
      }
    }
  }

  return downloadSingle(allowedUrls, destPath, {
    headers,
    onProgress,
    stallTimeoutMs,
    maxRetries,
    refreshUrls,
    signal,
  });
}
