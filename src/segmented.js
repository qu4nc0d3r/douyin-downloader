import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { extractError } from './errors.js';

const RETRYABLE_STATUS = new Set([403, 401, 408, 429, 500, 502, 503, 504]);

export function parseContentRange(header) {
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/.exec(String(header || '').trim());
  if (!match) return null;
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: match[3] === '*' ? null : Number(match[3]),
  };
}

export async function probeRange(url, headers = {}, timeoutMs = 15000) {
  try {
    const res = await fetch(url, {
      headers: { ...headers, range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 206) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const range = parseContentRange(res.headers.get('content-range'));
    await res.body?.cancel().catch(() => {});
    if (!range || !range.total) return null;
    return range;
  } catch {
    return null;
  }
}

export function planChunks(total, chunkSize) {
  const chunks = [];
  for (let start = 0; start < total; start += chunkSize) {
    chunks.push([start, Math.min(start + chunkSize, total) - 1]);
  }
  return chunks;
}

export function mergeDoneRanges(done) {
  const sorted = done.slice().sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

function isDone(doneRanges, start, end) {
  return doneRanges.some(([s, e]) => start >= s && end <= e);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadResumeState(destPath, total) {
  try {
    const raw = await fsp.readFile(`${destPath}.part.json`, 'utf8');
    const state = JSON.parse(raw);
    if (state?.total !== total || !Array.isArray(state.done)) return [];
    await fsp.access(`${destPath}.part`);
    return mergeDoneRanges(state.done);
  } catch {
    return [];
  }
}

async function saveResumeState(destPath, total, doneRanges) {
  const data = JSON.stringify({ total, done: mergeDoneRanges(doneRanges) });
  await fsp.writeFile(`${destPath}.part.json`, data, 'utf8').catch(() => {});
}

function downloadError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

export async function downloadSegmented(urls, destPath, options = {}) {
  const {
    total,
    headers = {},
    onProgress,
    chunkSize = 16 * 1024 * 1024,
    segments = 8,
    stallTimeoutMs = 30000,
    maxRetries = 2,
    refreshUrls,
    signal,
  } = options;

  if (signal?.aborted) {
    throw downloadError('PAUSED', 'Tải tạm dừng');
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw downloadError('DOWNLOAD_FAILED', 'Segmented download requires a known total size');
  }

  const partPath = `${destPath}.part`;
  const doneRanges = await loadResumeState(destPath, total);
  let downloaded = doneRanges.reduce((sum, [start, end]) => sum + (end - start + 1), 0);

  const handle = await fsp.open(partPath, fs.existsSync(partPath) ? 'r+' : 'w+');
  try {
    await handle.truncate(total);

    let candidates = urls.slice();
    let refreshed = false;

    const reportProgress = (delta) => {
      downloaded += delta;
      if (onProgress) onProgress({ downloaded, total });
    };

    const chunks = planChunks(total, chunkSize).filter(([start, end]) => !isDone(doneRanges, start, end));

    const state = { done: doneRanges.slice() };
    let queueIndex = 0;
    let lastError = null;

    const downloadChunk = async ([start, end]) => {
      let offset = start;
      let failures = 0;
      while (offset <= end) {
        if (signal?.aborted) {
          throw downloadError('PAUSED', 'Tải tạm dừng');
        }
        const url = candidates[failures % candidates.length];
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal?.addEventListener('abort', onAbort);
        let stallTimer = setTimeout(() => controller.abort(), stallTimeoutMs);
        try {
          const res = await fetch(url, {
            headers: { ...headers, range: `bytes=${offset}-${end}` },
            redirect: 'follow',
            signal: controller.signal,
          });
          if (res.status !== 206) {
            await res.body?.cancel().catch(() => {});
            throw downloadError('DOWNLOAD_FAILED', `HTTP ${res.status} for segment`);
          }
          const reader = res.body.getReader();
          while (true) {
            if (signal?.aborted) {
              await reader.cancel().catch(() => {});
              throw downloadError('PAUSED', 'Tải tạm dừng');
            }
            const { value, done } = await reader.read();
            if (done) break;
            await handle.write(value, 0, value.length, offset);
            offset += value.length;
            reportProgress(value.length);
            clearTimeout(stallTimer);
            stallTimer = setTimeout(() => controller.abort(), stallTimeoutMs);
          }
        } catch (err) {
          if (signal?.aborted || err?.code === 'PAUSED') {
            throw downloadError('PAUSED', 'Tải tạm dừng');
          }
          lastError = err;
          failures++;
          const forbidden = /HTTP 40[13]/.test(err.message || '');
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
        } finally {
          clearTimeout(stallTimer);
          signal?.removeEventListener('abort', onAbort);
        }
      }
      if (signal?.aborted) {
        throw downloadError('PAUSED', 'Tải tạm dừng');
      }
      if (offset <= end) {
        throw lastError || downloadError('DOWNLOAD_FAILED', 'Segment failed');
      }
      state.done.push([start, end]);
      await saveResumeState(destPath, total, state.done);
    };

    const worker = async () => {
      while (queueIndex < chunks.length) {
        if (signal?.aborted) {
          throw downloadError('PAUSED', 'Tải tạm dừng');
        }
        const chunk = chunks[queueIndex++];
        await downloadChunk(chunk);
      }
    };

    const workerCount = Math.max(1, Math.min(segments, chunks.length));
    try {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    } catch (err) {
      if (signal?.aborted || err?.code === 'PAUSED') {
        throw downloadError('PAUSED', 'Tải tạm dừng');
      }
      throw err.code ? err : downloadError('DOWNLOAD_FAILED', err.message);
    }

    await handle.close();
    await fsp.rename(partPath, destPath);
    await fsp.rm(`${destPath}.part.json`, { force: true }).catch(() => {});
    return { path: destPath, size: total };
  } catch (err) {
    await handle.close().catch(() => {});
    if (signal?.aborted || err?.code === 'PAUSED') {
      throw downloadError('PAUSED', 'Tải tạm dừng');
    }
    throw err.code ? err : extractError('DOWNLOAD_FAILED', err.message);
  }
}
