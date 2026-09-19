import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import express from 'express';
import {
  extractError,
  sanitizeFilename,
  parseSelfProfile,
  extractShareUrls,
  resolveProfileInput,
  parseUserProfile,
  parseUserPostList,
  sanitizeFolderName,
} from './extractor.js';
import { extractMany } from './extractor.js';
import { downloadFile, uniqueDestPath } from './downloader.js';
import { createSettings, defaultDataDir } from './settings.js';
import { resetBrowser, getBrowser, warmupBrowser, SEC_UID_RE } from './browser.js';
import { codeRootDir, getSeaAsset, isPackaged, writableDir } from './paths.js';
import { createSeaAssetMiddleware } from './sea-assets.js';

const MESSAGES = {
  INVALID_LINK: 'Không tìm thấy link Douyin trong nội dung đã dán.',
  NOT_FOUND: 'Không tìm thấy video. Có thể đã bị xóa hoặc ở chế độ riêng tư.',
  IMAGE_POST_UNSUPPORTED: 'Đây là bài đăng album ảnh, bản MVP chỉ hỗ trợ video.',
  PARSE_FAILED: 'Douyin có thể đã thay đổi API. Vui lòng thử lại sau.',
  NETWORK_ERROR: 'Không kết nối được tới Douyin. Kiểm tra mạng và thử lại.',
  BROWSER_NOT_FOUND: 'Không tìm thấy Chrome hoặc Edge. Hãy cài Chrome/Edge rồi thử lại.',
  URL_NOT_ALLOWED: 'URL tải không hợp lệ.',
  DOWNLOAD_FAILED: 'Không tải được file từ CDN Douyin. Vui lòng thử lại.',
  FILE_EXISTS: 'File đã tồn tại trong thư mục downloads.',
  INVALID_COOKIE: 'Cookie không hợp lệ. Hãy dán cookie hoặc đoạn "Copy as cURL" từ douyin.com.',
  NO_COOKIE: 'Chưa lưu cookie. Hãy dán cookie trước khi kiểm tra tài khoản.',
  NOT_LOGGED_IN: 'Cookie không hợp lệ hoặc đã hết hạn. Hãy lấy cookie mới từ douyin.com.',
  INVALID_QUALITY: 'Chất lượng không hợp lệ.',
  TOO_MANY_LINKS: 'Chỉ hỗ trợ tối đa 10 link mỗi lần.',
  INVALID_PATH: 'Đường dẫn không hợp lệ.',
  INVALID_STATUS: 'Trạng thái tải không hợp lệ.',
  PROFILE_NOT_FOUND: 'Không tìm thấy URL kênh Douyin trong nội dung đã dán.',
  INVALID_SUBDIR: 'Thư mục lưu không hợp lệ.',
  INTERNAL: 'Có lỗi xảy ra. Vui lòng thử lại.',
};

const STATUS_BY_CODE = {
  INVALID_LINK: 400,
  NOT_FOUND: 404,
  IMAGE_POST_UNSUPPORTED: 400,
  PARSE_FAILED: 502,
  NETWORK_ERROR: 502,
  BROWSER_NOT_FOUND: 500,
  URL_NOT_ALLOWED: 400,
  DOWNLOAD_FAILED: 502,
  FILE_EXISTS: 409,
  INVALID_COOKIE: 400,
  NO_COOKIE: 400,
  INVALID_QUALITY: 400,
  TOO_MANY_LINKS: 400,
  INVALID_PATH: 400,
  INVALID_STATUS: 400,
  PROFILE_NOT_FOUND: 400,
  INVALID_SUBDIR: 400,
};

function messageFor(err) {
  return MESSAGES[err?.code] || MESSAGES.INTERNAL;
}

function sendError(res, err) {
  const code = err?.code || 'INTERNAL';
  res.status(STATUS_BY_CODE[code] || 500).json({ error: { code, message: messageFor(err) } });
}

function broadcast(job, payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of job.clients) client.write(line);
}

async function defaultProfileFn() {
  const browser = await getBrowser();
  const data = await browser.fetchSelfProfile();
  return parseSelfProfile(data);
}

const PROFILE_PAGE_SIZE = 18;
const PROFILE_PAGE_DELAY_MS = 300;
const PROFILE_MAX_PAGES = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function defaultFetchUserProfileFn(secUid) {
  const browser = await getBrowser();
  return parseUserProfile(await browser.fetchUserProfile(secUid));
}

async function defaultFetchUserPostsFn(secUid, postOptions = {}) {
  const browser = await getBrowser();
  return browser.fetchUserPosts(secUid, postOptions);
}

function toPreview(meta) {
  return {
    awemeId: meta.awemeId,
    title: meta.title,
    author: meta.author,
    cover: meta.cover,
    durationMs: meta.durationMs,
    likeCount: meta.likeCount ?? null,
    qualities: meta.qualities.map((q, index) => ({
      index,
      label: q.label,
      bitrate: q.bitrate,
      codec: q.codec || 'h264',
    })),
  };
}

export function createApp(options = {}) {
  const {
    downloadsDir = path.join(writableDir(), 'downloads'),
    dataDir = defaultDataDir(),
    extractBatchFn = extractMany,
    downloadFn = downloadFile,
    browserResetFn = resetBrowser,
    warmupFn = warmupBrowser,
    profileFn = defaultProfileFn,
    fetchUserProfileFn = defaultFetchUserProfileFn,
    fetchUserPostsFn = defaultFetchUserPostsFn,
    profileMaxVideos = Number(process.env.PROFILE_MAX_VIDEOS) || 200,
    maxConcurrent = Number(process.env.MAX_CONCURRENT_DOWNLOADS) || 2,
  } = options;

  const settings = createSettings(dataDir);

  const app = express();
  app.use(express.json());
  if (isPackaged()) {
    app.use(createSeaAssetMiddleware({ getAsset: getSeaAsset }));
  } else {
    app.use(express.static(path.join(codeRootDir(), 'public')));
    app.use(
      '/vendor/lucide',
      express.static(path.join(codeRootDir(), 'node_modules', 'lucide', 'dist', 'umd')),
    );
  }

  const extractCache = new Map();
  const jobs = new Map();
  const downloadQueue = [];
  let activeJobs = 0;

  async function runJob(job) {
    const { meta, qualityIndex } = job;
    const quality = meta.qualities[qualityIndex];
    job.controller = new AbortController();
    job.status = 'downloading';
    job.startedAt = Date.now();
    broadcast(job, { status: 'downloading', downloaded: job.downloaded || 0, total: job.total });
    try {
      const filename = sanitizeFilename(meta.title, meta.awemeId);
      const destDir = job.destDir || downloadsDir;
      await fsp.mkdir(destDir, { recursive: true });
      if (!job.destPath) {
        job.destPath =
          job.conflictAction === 'overwrite'
            ? path.join(destDir, filename)
            : await uniqueDestPath(destDir, filename);
      }
      const result = await downloadFn(quality.urls, job.destPath, {
        signal: job.controller.signal,
        cookie: settings.getCookie() || undefined,
        refreshUrls: async () => {
          try {
            const results = await extractBatchFn(`https://www.douyin.com/video/${meta.awemeId}`);
            const fresh = results.find((entry) => entry.ok)?.meta;
            if (!fresh) return null;
            cacheMeta(fresh);
            return fresh.qualities[qualityIndex]?.urls || null;
          } catch {
            return null;
          }
        },
        onProgress(p) {
          job.downloaded = p.downloaded;
          job.total = p.total;
          broadcast(job, {
            status: 'downloading',
            downloaded: p.downloaded,
            total: p.total,
          });
        },
      });
      job.status = 'done';
      job.path = result.path;
      broadcast(job, { status: 'done', path: result.path, size: result.size });
    } catch (err) {
      if (err?.code === 'PAUSED' || job.controller?.signal?.aborted) {
        job.status = 'paused';
        broadcast(job, {
          status: 'paused',
          downloaded: job.downloaded,
          total: job.total,
        });
        return;
      }
      job.status = 'error';
      job.error = messageFor(err);
      broadcast(job, { status: 'error', error: job.error });
    } finally {
      job.activePromise = null;
      if (job.status !== 'paused') {
        for (const client of job.clients) client.end();
        job.clients.clear();
        const timer = setTimeout(() => jobs.delete(job.id), 10 * 60 * 1000);
        timer.unref?.();
      }
    }
  }

  function pumpDownloadQueue() {
    while (activeJobs < maxConcurrent && downloadQueue.length > 0) {
      const job = downloadQueue.shift();
      activeJobs++;
      const p = runJob(job).finally(() => {
        activeJobs--;
        pumpDownloadQueue();
      });
      job.activePromise = p;
    }
  }

  function cacheMeta(meta) {
    extractCache.delete(meta.awemeId);
    extractCache.set(meta.awemeId, meta);
    while (extractCache.size > 500) {
      extractCache.delete(extractCache.keys().next().value);
    }
  }

  app.post('/api/extract', async (req, res) => {
    const text = req.body?.text;
    if (!text || typeof text !== 'string') {
      return sendError(res, extractError('INVALID_LINK'));
    }
    try {
      const results = await extractBatchFn(text);
      const items = [];
      const errors = [];
      for (const result of results) {
        if (!result.ok) {
          errors.push({ url: result.url, message: messageFor(result.error) });
          continue;
        }
        cacheMeta(result.meta);
        items.push(toPreview(result.meta));
      }
      if (items.length === 0) {
        const firstError = results.find((r) => !r.ok)?.error;
        return sendError(res, firstError || extractError('NOT_FOUND'));
      }
      res.json({ items, errors });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/profile', async (req, res) => {
    const { text, secUid: requestedSecUid, cursor: requestedCursor } = req.body || {};
    try {
      let secUid = null;
      let profile = null;
      if (requestedSecUid) {
        secUid = String(requestedSecUid);
        if (!SEC_UID_RE.test(secUid)) throw extractError('PROFILE_NOT_FOUND');
      } else {
        if (!text || typeof text !== 'string') throw extractError('PROFILE_NOT_FOUND');
        secUid = await resolveProfileInput(text);
        profile = await fetchUserProfileFn(secUid);
      }

      const cursor = Math.max(0, Number(requestedCursor) || 0);
      const items = [];
      const imagePosts = [];
      const seenIds = new Set();
      let maxCursor = cursor;
      let hasMore = false;
      for (let page = 0; page < PROFILE_MAX_PAGES; page++) {
        const data = await fetchUserPostsFn(secUid, {
          maxCursor,
          count: PROFILE_PAGE_SIZE,
        });
        const parsed = parseUserPostList(data);
        for (const meta of parsed.items) {
          if (seenIds.has(meta.awemeId)) continue;
          seenIds.add(meta.awemeId);
          cacheMeta(meta);
          items.push(toPreview(meta));
        }
        for (const post of parsed.imagePosts) {
          if (seenIds.has(post.awemeId)) continue;
          seenIds.add(post.awemeId);
          imagePosts.push(post);
        }
        const nextCursor = parsed.maxCursor;
        const pageEmpty = parsed.items.length + parsed.imagePosts.length === 0;
        hasMore = parsed.hasMore;
        maxCursor = nextCursor;
        if (
          !hasMore ||
          pageEmpty ||
          nextCursor === cursor ||
          items.length >= profileMaxVideos
        ) {
          break;
        }
        await sleep(PROFILE_PAGE_DELAY_MS);
      }

      res.json({ secUid, profile, items, imagePosts, hasMore, cursor: maxCursor });
    } catch (err) {
      if (err?.code === 'PARSE_FAILED') {
        return res.status(502).json({
          error: {
            code: 'PARSE_FAILED',
            message:
              'Không lấy được danh sách video của kênh. Douyin có thể yêu cầu đăng nhập — hãy thêm cookie ở tab Cookie rồi thử lại.',
          },
        });
      }
      sendError(res, err);
    }
  });

  app.post('/api/links/parse', (req, res) => {
    const text = req.body?.text;
    if (!text || typeof text !== 'string') {
      return sendError(res, extractError('INVALID_LINK'));
    }
    const urls = extractShareUrls(text);
    if (urls.length === 0) return sendError(res, extractError('INVALID_LINK'));
    res.json({ urls });
  });

  app.post('/api/warmup', (req, res) => {
    warmupFn().catch(() => {});
    res.json({ ok: true });
  });

  app.get('/api/cookie', (req, res) => {
    res.json(settings.getStatus());
  });

  app.post('/api/cookie', async (req, res) => {
    try {
      const status = settings.saveCookie(req.body?.cookie);
      await browserResetFn();
      res.json(status);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.delete('/api/cookie', async (req, res) => {
    settings.clearCookie();
    await browserResetFn();
    res.json(settings.getStatus());
  });

  app.get('/api/cookie/account', async (req, res) => {
    if (!settings.getCookie()) {
      return sendError(res, extractError('NO_COOKIE'));
    }
    try {
      const account = await profileFn();
      res.json({ configured: true, loggedIn: !!account, account: account || null });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/download', (req, res) => {
    const { awemeId, qualityIndex = 0, conflictAction, subdir } = req.body || {};
    const meta = extractCache.get(awemeId);
    if (!meta) {
      return sendError(res, extractError('NOT_FOUND', 'No extracted metadata'));
    }
    const quality = meta.qualities[Number(qualityIndex) || 0];
    if (!quality) return sendError(res, extractError('INVALID_QUALITY'));

    const folder = sanitizeFolderName(subdir);
    const destDir = folder ? path.join(downloadsDir, folder) : downloadsDir;
    const rootPath = path.resolve(downloadsDir);
    const resolvedDir = path.resolve(destDir);
    if (!(resolvedDir === rootPath || resolvedDir.startsWith(rootPath + path.sep))) {
      return sendError(res, extractError('INVALID_SUBDIR'));
    }

    const filename = sanitizeFilename(meta.title, meta.awemeId);
    const existingPath = path.join(destDir, filename);
    const conflict = fs.existsSync(existingPath);
    if (conflict && conflictAction !== 'overwrite' && conflictAction !== 'rename') {
      return res.status(409).json({
        error: {
          code: 'FILE_EXISTS',
          message: MESSAGES.FILE_EXISTS,
          fileName: filename,
        },
      });
    }

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      meta,
      qualityIndex: Number(qualityIndex) || 0,
      conflictAction,
      destDir,
      status: 'queued',
      downloaded: 0,
      total: null,
      path: null,
      error: null,
      clients: new Set(),
    };
    jobs.set(jobId, job);
    res.json({ jobId });
    downloadQueue.push(job);
    pumpDownloadQueue();
  });

  app.get('/api/progress/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return sendError(res, extractError('NOT_FOUND'));
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(
      `data: ${JSON.stringify({
        status: job.status,
        downloaded: job.downloaded,
        total: job.total,
        path: job.path,
        error: job.error,
      })}\n\n`,
    );
    if (job.status === 'downloading' || job.status === 'queued' || job.status === 'paused') {
      job.clients.add(res);
      req.on('close', () => job.clients.delete(res));
    } else {
      res.end();
    }
  });

  app.post('/api/download/:jobId/pause', async (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return sendError(res, extractError('NOT_FOUND'));
    if (job.status === 'paused') {
      return res.json({ ok: true, status: 'paused' });
    }
    if (job.status === 'queued') {
      const idx = downloadQueue.indexOf(job);
      if (idx !== -1) {
        downloadQueue.splice(idx, 1);
      }
      job.status = 'paused';
      broadcast(job, {
        status: 'paused',
        downloaded: job.downloaded,
        total: job.total,
      });
      return res.json({ ok: true, status: 'paused' });
    }
    if (job.status === 'downloading') {
      job.controller?.abort();
      if (job.activePromise) {
        await job.activePromise.catch(() => {});
      }
      return res.json({ ok: true, status: 'paused' });
    }
    res.status(400).json({ error: { code: 'INVALID_STATUS', message: messageFor({ code: 'INVALID_STATUS' }) } });
  });

  app.post('/api/download/:jobId/resume', async (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return sendError(res, extractError('NOT_FOUND'));
    if (job.status === 'downloading' || job.status === 'queued') {
      return res.json({ ok: true, status: job.status });
    }
    if (job.activePromise) {
      await job.activePromise.catch(() => {});
    }
    if (job.status !== 'paused') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: messageFor({ code: 'INVALID_STATUS' }) } });
    }
    job.status = 'queued';
    downloadQueue.push(job);
    broadcast(job, {
      status: 'queued',
      downloaded: job.downloaded,
      total: job.total,
    });
    pumpDownloadQueue();
    return res.json({ ok: true, status: 'queued' });
  });

  app.get('/api/open-folder', (req, res) => {
    const resolved = path.resolve(String(req.query.path || ''));
    const root = path.resolve(downloadsDir);
    if (!resolved.startsWith(root + path.sep)) {
      return sendError(res, extractError('INVALID_PATH'));
    }
    if (process.platform === 'win32') {
      execFile('explorer.exe', [`/select,${resolved}`], () => {});
    } else if (process.platform === 'darwin') {
      execFile('open', ['-R', resolved], () => {});
    } else {
      execFile('xdg-open', [path.dirname(resolved)], () => {});
    }
    res.json({ ok: true });
  });

  return app;
}
