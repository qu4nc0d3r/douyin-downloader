import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { sanitizeFilename } from '../src/extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsFixture = JSON.parse(
  await fsp.readFile(path.join(__dirname, 'fixtures', 'user-posts.json'), 'utf8'),
);
const profileFixture = JSON.parse(
  await fsp.readFile(path.join(__dirname, 'fixtures', 'user-profile.json'), 'utf8'),
);

const fakeMeta = {
  awemeId: '1234567890123456789',
  title: 'My Video',
  author: 'Author',
  cover: 'https://p3-sign.douyinpic.com/c.jpeg',
  durationMs: 1000,
  likeCount: 45300,
  qualities: [{ label: '1080p', bitrate: 0, urls: ['https://aweme.snssdk.com/aweme/v1/play/?video_id=x'] }],
};

const fakeMeta2 = {
  ...fakeMeta,
  awemeId: '9876543210987654321',
  title: 'Second Video',
};

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

async function tmpDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'dy-app-'));
}

function postJson(base, url, body) {
  return fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function firstSseEvent(url) {
  const controller = new AbortController();
  const res = await fetch(url, { signal: controller.signal });
  const reader = res.body.getReader();
  const { value } = await reader.read();
  controller.abort();
  const text = new TextDecoder().decode(value);
  const line = text.split('\n').find((entry) => entry.startsWith('data: '));
  return JSON.parse(line.slice(6));
}

test('POST /api/extract returns items with indexed qualities', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/extract', { text: 'https://v.douyin.com/abc/' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].awemeId, fakeMeta.awemeId);
    assert.equal(body.items[0].title, 'My Video');
    assert.equal(body.items[0].likeCount, 45300);
    assert.deepEqual(body.items[0].qualities, [{ index: 0, label: '1080p', bitrate: 0, codec: 'h264' }]);
    assert.deepEqual(body.errors, []);
  });
});

test('POST /api/extract returns multiple items and partial errors', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => [
      { ok: true, meta: fakeMeta },
      { ok: false, url: 'https://v.douyin.com/bad/', error: Object.assign(new Error('x'), { code: 'NOT_FOUND' }) },
      { ok: true, meta: fakeMeta2 },
    ],
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/extract', { text: 'two links' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(
      body.items.map((i) => i.title),
      ['My Video', 'Second Video'],
    );
    assert.equal(body.errors.length, 1);
    assert.match(body.errors[0].message, /Không tìm thấy video/);
  });
});

test('POST /api/extract maps error codes to Vietnamese message when all fail', async () => {
  const err = new Error('nope');
  err.code = 'PARSE_FAILED';
  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => [{ ok: false, url: 'x', error: err }],
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/extract', { text: 'x' });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error.code, 'PARSE_FAILED');
    assert.match(body.error.message, /Douyin/);
  });
});

test('POST /api/download starts job and SSE reports done', async () => {
  const downloadsDir = await tmpDir();
  const app = createApp({
    downloadsDir,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest, opts) => {
      opts.onProgress({ downloaded: 5, total: 10 });
      opts.onProgress({ downloaded: 10, total: 10 });
      await fsp.writeFile(dest, 'data');
      return { path: dest, size: 4 };
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'https://v.douyin.com/abc/' });
    const dl = await postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0 });
    assert.equal(dl.status, 200);
    const { jobId } = await dl.json();
    assert.ok(jobId);
    const res = await fetch(`${base}/api/progress/${jobId}`);
    const text = await res.text();
    assert.ok(text.includes('"status":"done"'));
    assert.ok(text.includes('My Video'));
  });
});

test('POST /api/download returns 404 when video was not extracted', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/download', { awemeId: '999', qualityIndex: 0 });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});

test('cookie routes save, report status without leaking value, and clear', async () => {
  const downloadsDir = await tmpDir();
  const dataDir = await tmpDir();
  let resets = 0;
  const app = createApp({
    downloadsDir,
    dataDir,
    browserResetFn: async () => {
      resets++;
    },
  });
  await withServer(app, async (base) => {
    let res = await fetch(`${base}/api/cookie`);
    assert.deepEqual(await res.json(), { configured: false, cookieCount: 0, updatedAt: null });

    res = await postJson(base, '/api/cookie', {
      cookie: "curl 'https://x' -H 'cookie: a=1; b=2'",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.configured, true);
    assert.equal(body.cookieCount, 2);
    assert.ok(!JSON.stringify(body).includes('a=1'), 'response must not leak cookie values');

    res = await fetch(`${base}/api/cookie`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    const cleared = await res.json();
    assert.equal(cleared.configured, false);
    assert.equal(resets, 2, 'browser resets on save and clear');
  });
});

test('cookie route rejects invalid input with INVALID_COOKIE', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    dataDir: await tmpDir(),
    browserResetFn: async () => {},
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/cookie', { cookie: 'not a cookie' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'INVALID_COOKIE');
  });
});

test('GET /api/cookie/account returns 400 when no cookie configured', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    dataDir: await tmpDir(),
    browserResetFn: async () => {},
    profileFn: async () => ({ uid: '1' }),
  });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/cookie/account`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'NO_COOKIE');
  });
});

test('GET /api/cookie/account returns account when logged in', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    dataDir: await tmpDir(),
    browserResetFn: async () => {},
    profileFn: async () => ({
      uid: '1576032167272576',
      nickname: 'Mạc Quân',
      uniqueId: 'macquan123',
      signature: '',
      avatar: 'https://p3-pc-sign.douyinpic.com/a.jpeg',
      followerCount: 10,
      followingCount: 2,
      awemeCount: 3,
      totalFavorited: 40,
    }),
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/cookie', { cookie: 'sessionid=dummy' });
    const res = await fetch(`${base}/api/cookie/account`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.loggedIn, true);
    assert.equal(body.account.nickname, 'Mạc Quân');
    assert.equal(body.account.uniqueId, 'macquan123');
  });
});

test('GET /api/cookie/account reports loggedIn false for invalid session', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    dataDir: await tmpDir(),
    browserResetFn: async () => {},
    profileFn: async () => null,
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/cookie', { cookie: 'sessionid=expired' });
    const res = await fetch(`${base}/api/cookie/account`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.loggedIn, false);
    assert.equal(body.account, null);
  });
});

test('GET /api/cookie/account maps profile failure to PARSE_FAILED', async () => {
  const err = new Error('blocked');
  err.code = 'PARSE_FAILED';
  const app = createApp({
    downloadsDir: await tmpDir(),
    dataDir: await tmpDir(),
    browserResetFn: async () => {},
    profileFn: async () => {
      throw err;
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/cookie', { cookie: 'sessionid=x' });
    const res = await fetch(`${base}/api/cookie/account`);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.code, 'PARSE_FAILED');
  });
});

test('download queue limits concurrency and reports queued status', async () => {
  const downloadsDir = await tmpDir();
  const started = [];
  const resolvers = [];
  const app = createApp({
    downloadsDir,
    maxConcurrent: 2,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: (urls, dest, opts) =>
      new Promise((resolve) => {
        started.push(dest);
        resolvers.push(() => {
          opts.onProgress({ downloaded: 10, total: 10 });
          resolve({ path: dest, size: 10 });
        });
      }),
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    const responses = await Promise.all([
      postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0, conflictAction: 'rename' }),
      postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0, conflictAction: 'rename' }),
      postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0, conflictAction: 'rename' }),
    ]);
    const jobIds = await Promise.all(responses.map((r) => r.json().then((b) => b.jobId)));
    await sleep(100);
    assert.equal(started.length, 2, 'only maxConcurrent jobs run at once');
    const thirdState = await firstSseEvent(`${base}/api/progress/${jobIds[2]}`);
    assert.equal(thirdState.status, 'queued');

    resolvers[0]();
    resolvers[1]();
    await sleep(150);
    assert.equal(started.length, 3, 'queued job starts after a slot frees');
    resolvers[2]();
    await sleep(150);
    const finalState = await firstSseEvent(`${base}/api/progress/${jobIds[2]}`);
    assert.equal(finalState.status, 'done');
  });
});

test('app provides refreshUrls that re-extracts fresh quality urls', async () => {
  const freshMeta = {
    ...fakeMeta,
    qualities: [{ label: '1080p', bitrate: 0, urls: ['https://aweme.snssdk.com/fresh'] }],
  };
  let extractCalls = 0;
  let capturedRefresh = null;
  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => {
      extractCalls++;
      return [{ ok: true, meta: extractCalls === 1 ? fakeMeta : freshMeta }];
    },
    downloadFn: async (urls, dest, opts) => {
      capturedRefresh = opts.refreshUrls;
      await fsp.writeFile(dest, 'x');
      return { path: dest, size: 1 };
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    await postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0 });
    await sleep(100);
    assert.equal(typeof capturedRefresh, 'function');
    const fresh = await capturedRefresh();
    assert.deepEqual(fresh, ['https://aweme.snssdk.com/fresh']);
    assert.equal(extractCalls, 2);
  });
});

test('POST /api/links/parse returns deduped urls without extraction', async () => {
  const app = createApp({ downloadsDir: await tmpDir() });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/links/parse', {
      text:
        'x https://v.douyin.com/abc/ y https://v.douyin.com/abc/ ' +
        'z https://www.douyin.com/video/7123456789012345678 https://example.com/nope',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.urls, [
      'https://v.douyin.com/abc/',
      'https://www.douyin.com/video/7123456789012345678',
    ]);
  });
});

test('POST /api/links/parse rejects text without douyin links', async () => {
  const app = createApp({ downloadsDir: await tmpDir() });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/links/parse', { text: 'không có gì' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'INVALID_LINK');
  });
});

test('GET /api/open-folder rejects paths outside downloads dir', async () => {
  const app = createApp({ downloadsDir: await tmpDir() });
  await withServer(app, async (base) => {
    const res = await fetch(
      `${base}/api/open-folder?path=${encodeURIComponent('C:\\Windows\\System32')}`,
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'INVALID_PATH');
  });
});

test('POST /api/download returns 409 FILE_EXISTS when destination exists', async () => {
  const downloadsDir = await tmpDir();
  const filename = sanitizeFilename(fakeMeta.title, fakeMeta.awemeId);
  await fsp.writeFile(path.join(downloadsDir, filename), 'old');
  const app = createApp({
    downloadsDir,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async () => ({ path: 'x', size: 0 }),
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    const res = await postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0 });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'FILE_EXISTS');
    assert.equal(body.error.fileName, filename);
  });
});

test('POST /api/download overwrite replaces the existing file', async () => {
  const downloadsDir = await tmpDir();
  const filename = sanitizeFilename(fakeMeta.title, fakeMeta.awemeId);
  const existing = path.join(downloadsDir, filename);
  await fsp.writeFile(existing, 'old');
  let seenDest = null;
  const app = createApp({
    downloadsDir,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest) => {
      seenDest = dest;
      await fsp.writeFile(dest, 'new');
      return { path: dest, size: 3 };
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    const dl = await postJson(base, '/api/download', {
      awemeId: fakeMeta.awemeId,
      qualityIndex: 0,
      conflictAction: 'overwrite',
    });
    assert.equal(dl.status, 200);
    const { jobId } = await dl.json();
    const text = await (await fetch(`${base}/api/progress/${jobId}`)).text();
    assert.ok(text.includes('"status":"done"'));
    assert.equal(seenDest, existing);
    assert.equal(await fsp.readFile(existing, 'utf8'), 'new');
  });
});

test('POST /api/download rename creates a suffixed file', async () => {
  const downloadsDir = await tmpDir();
  const filename = sanitizeFilename(fakeMeta.title, fakeMeta.awemeId);
  await fsp.writeFile(path.join(downloadsDir, filename), 'old');
  let seenDest = null;
  const app = createApp({
    downloadsDir,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest) => {
      seenDest = dest;
      await fsp.writeFile(dest, 'new');
      return { path: dest, size: 3 };
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    const dl = await postJson(base, '/api/download', {
      awemeId: fakeMeta.awemeId,
      qualityIndex: 0,
      conflictAction: 'rename',
    });
    assert.equal(dl.status, 200);
    const { jobId } = await dl.json();
    const text = await (await fetch(`${base}/api/progress/${jobId}`)).text();
    assert.ok(text.includes('"status":"done"'));
    assert.equal(path.basename(seenDest), 'My Video_1234567890123456789 (1).mp4');
  });
});

test('POST /api/warmup calls warmupFn and returns ok', async () => {
  let called = false;
  const app = createApp({
    warmupFn: async () => {
      called = true;
      return true;
    },
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/warmup', {});
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, { ok: true });
    assert.equal(called, true);
  });
});

test('POST /api/download/:jobId/pause and /resume pauses and resumes download', async () => {
  let pauseResolve;
  const pausePromise = new Promise((r) => {
    pauseResolve = r;
  });
  let attempt = 0;

  const app = createApp({
    downloadsDir: await tmpDir(),
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest, options) => {
      attempt++;
      if (attempt === 1) {
        options.onProgress?.({ downloaded: 100, total: 1000 });
        pauseResolve();
        await new Promise((_, reject) => {
          if (options.signal?.aborted) {
            const err = new Error('PAUSED');
            err.code = 'PAUSED';
            reject(err);
            return;
          }
          options.signal?.addEventListener('abort', () => {
            const err = new Error('PAUSED');
            err.code = 'PAUSED';
            reject(err);
          });
        });
      }
      options.onProgress?.({ downloaded: 1000, total: 1000 });
      await fsp.writeFile(dest, 'done');
      return { path: dest, size: 1000 };
    },
  });

  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'https://v.douyin.com/abc/' });
    const dl = await postJson(base, '/api/download', {
      awemeId: fakeMeta.awemeId,
      qualityIndex: 0,
    });
    assert.equal(dl.status, 200);
    const { jobId } = await dl.json();

    await pausePromise;

    const pauseRes = await postJson(base, `/api/download/${jobId}/pause`, {});
    assert.equal(pauseRes.status, 200);
    const pauseBody = await pauseRes.json();
    assert.equal(pauseBody.status, 'paused');

    const resumeRes = await postJson(base, `/api/download/${jobId}/resume`, {});
    assert.equal(resumeRes.status, 200);
    const resumeBody = await resumeRes.json();
    assert.equal(resumeBody.status, 'queued');

    const text = await (await fetch(`${base}/api/progress/${jobId}`)).text();
    assert.ok(text.includes('"status":"done"'));
    assert.equal(attempt, 2);
  });
});

test('POST /api/download/:jobId/pause pauses queued job before it starts', async () => {
  let releaseFirst;
  const firstBlock = new Promise((r) => {
    releaseFirst = r;
  });

  const app = createApp({
    downloadsDir: await tmpDir(),
    maxConcurrent: 1,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest) => {
      await firstBlock;
      await fsp.writeFile(dest, 'ok');
      return { path: dest, size: 2 };
    },
  });

  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });
    const dl1 = await postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0 });
    const { jobId: id1 } = await dl1.json();

    const dl2 = await postJson(base, '/api/download', { awemeId: fakeMeta.awemeId, qualityIndex: 0 });
    const { jobId: id2 } = await dl2.json();

    const pauseRes = await postJson(base, `/api/download/${id2}/pause`, {});
    assert.equal(pauseRes.status, 200);
    assert.deepEqual(await pauseRes.json(), { ok: true, status: 'paused' });

    releaseFirst();
    const text1 = await (await fetch(`${base}/api/progress/${id1}`)).text();
    assert.ok(text1.includes('"status":"done"'));

    const event2 = await firstSseEvent(`${base}/api/progress/${id2}`);
    assert.equal(event2.status, 'paused');
  });
});

const TEST_SEC_UID = 'MS4wLjABAAAA_test-sec-uid-1234567890';

function fakeProfile() {
  return {
    secUid: TEST_SEC_UID,
    nickname: 'Test Channel',
    uniqueId: 'testchannel',
    signature: 'xin chào',
    avatar: 'https://p3-pc-sign.douyinpic.com/avatar.jpeg',
    awemeCount: 4,
    followerCount: 1234,
  };
}

test('POST /api/profile returns profile, videos, image posts and caches metas', async () => {
  const downloadsDir = await tmpDir();
  let listCalls = 0;
  const app = createApp({
    downloadsDir,
    fetchUserProfileFn: async () => fakeProfile(),
    fetchUserPostsFn: async (secUid, { maxCursor }) => {
      listCalls++;
      assert.equal(secUid, TEST_SEC_UID);
      return maxCursor === 0 ? postsFixture.page1 : postsFixture.page2;
    },
    downloadFn: async (urls, dest) => {
      await fsp.writeFile(dest, 'data');
      return { path: dest, size: 4 };
    },
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/profile', {
      text: `https://www.douyin.com/user/${TEST_SEC_UID}`,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.secUid, TEST_SEC_UID);
    assert.equal(body.profile.nickname, 'Test Channel');
    assert.deepEqual(
      body.items.map((item) => item.title),
      ['Video ghim', 'Video thứ hai', 'Video thứ ba'],
    );
    assert.equal(body.items.length, 3, 'pinned duplicate across pages is deduped');
    assert.equal(body.items[0].likeCount, 1200000);
    assert.deepEqual(body.items[0].qualities, [
      { index: 0, label: '720p', bitrate: 1368885, codec: 'h264' },
    ]);
    assert.deepEqual(body.imagePosts, [
      {
        awemeId: '7380000000000000002',
        title: 'Bài đăng ảnh',
        cover: 'https://p3-sign.douyinpic.com/cover-2.jpeg',
      },
    ]);
    assert.equal(body.hasMore, false);
    assert.equal(body.cursor, 222);
    assert.equal(listCalls, 2, 'paginates until has_more is false');

    const dl = await postJson(base, '/api/download', {
      awemeId: '7380000000000000001',
      qualityIndex: 0,
      subdir: 'Test Channel',
    });
    assert.equal(dl.status, 200, 'profile metas are downloadable after listing');
    const { jobId } = await dl.json();
    const text = await (await fetch(`${base}/api/progress/${jobId}`)).text();
    assert.ok(text.includes('"status":"done"'));
  });
});

test('POST /api/profile stops at profileMaxVideos and load-more uses secUid', async () => {
  let profileCalls = 0;
  let listCalls = 0;
  const makePage = (page) => ({
    aweme_list: [
      {
        aweme_id: `73900000000000000${page}0`,
        desc: `V${page}-0`,
        author: { nickname: 'K' },
        video: {
          duration: 1000,
          cover: { url_list: ['https://p3-sign.douyinpic.com/c.jpeg'] },
          play_addr: { uri: `v${page}a`, url_list: [`https://v5-dy.zjcdn.com/v${page}a/?ratio=720p`] },
          bit_rate: [
            {
              gear_name: 'normal_720_0',
              bit_rate: 1000,
              is_h265: 0,
              play_addr: {
                uri: `v${page}a`,
                width: 1280,
                height: 720,
                url_list: [`https://v5-dy.zjcdn.com/v${page}a/?ratio=720p`],
              },
            },
          ],
        },
      },
      {
        aweme_id: `73900000000000000${page}1`,
        desc: `V${page}-1`,
        author: { nickname: 'K' },
        video: {
          duration: 1000,
          cover: { url_list: ['https://p3-sign.douyinpic.com/c.jpeg'] },
          play_addr: { uri: `v${page}b`, url_list: [`https://v5-dy.zjcdn.com/v${page}b/?ratio=720p`] },
          bit_rate: [
            {
              gear_name: 'normal_720_0',
              bit_rate: 1000,
              is_h265: 0,
              play_addr: {
                uri: `v${page}b`,
                width: 1280,
                height: 720,
                url_list: [`https://v5-dy.zjcdn.com/v${page}b/?ratio=720p`],
              },
            },
          ],
        },
      },
    ],
    has_more: 1,
    max_cursor: page,
  });
  const app = createApp({
    downloadsDir: await tmpDir(),
    profileMaxVideos: 2,
    fetchUserProfileFn: async () => {
      profileCalls++;
      return fakeProfile();
    },
    fetchUserPostsFn: async (secUid, { maxCursor }) => {
      listCalls++;
      return makePage(maxCursor + 1);
    },
  });
  await withServer(app, async (base) => {
    const first = await postJson(base, '/api/profile', { text: `https://www.douyin.com/user/${TEST_SEC_UID}` });
    const firstBody = await first.json();
    assert.equal(firstBody.items.length, 2);
    assert.equal(firstBody.hasMore, true, 'cap leaves more pages pending');
    assert.equal(firstBody.cursor, 1);

    const more = await postJson(base, '/api/profile', {
      secUid: TEST_SEC_UID,
      cursor: firstBody.cursor,
    });
    assert.equal(more.status, 200);
    const moreBody = await more.json();
    assert.equal(moreBody.profile, null, 'load-more skips profile fetch');
    assert.deepEqual(
      moreBody.items.map((item) => item.title),
      ['V2-0', 'V2-1'],
    );
    assert.equal(profileCalls, 1);
    assert.equal(listCalls, 2, 'one page per request under a two-video cap');
  });
});

test('POST /api/profile rejects text without a channel link', async () => {
  const app = createApp({ downloadsDir: await tmpDir() });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/profile', { text: 'không có link' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'PROFILE_NOT_FOUND');
  });
});

test('POST /api/profile maps PARSE_FAILED to a cookie hint', async () => {
  const app = createApp({
    downloadsDir: await tmpDir(),
    fetchUserProfileFn: async () => fakeProfile(),
    fetchUserPostsFn: async () => {
      const err = new Error('blocked');
      err.code = 'PARSE_FAILED';
      throw err;
    },
  });
  await withServer(app, async (base) => {
    const res = await postJson(base, '/api/profile', {
      text: `https://www.douyin.com/user/${TEST_SEC_UID}`,
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error.code, 'PARSE_FAILED');
    assert.match(body.error.message, /Cookie/);
  });
});

test('POST /api/download saves into subdir folder and sanitizes traversal', async () => {
  const downloadsDir = await tmpDir();
  let seenDest = null;
  const app = createApp({
    downloadsDir,
    extractBatchFn: async () => [{ ok: true, meta: fakeMeta }],
    downloadFn: async (urls, dest) => {
      seenDest = dest;
      await fsp.writeFile(dest, 'x');
      return { path: dest, size: 1 };
    },
  });
  await withServer(app, async (base) => {
    await postJson(base, '/api/extract', { text: 'x' });

    const dl = await postJson(base, '/api/download', {
      awemeId: fakeMeta.awemeId,
      qualityIndex: 0,
      subdir: 'Test: Channel',
    });
    assert.equal(dl.status, 200);
    const { jobId } = await dl.json();
    await (await fetch(`${base}/api/progress/${jobId}`)).text();
    assert.ok(
      seenDest.startsWith(path.join(downloadsDir, 'Test Channel') + path.sep),
      `expected channel subfolder, got ${seenDest}`,
    );

    const dl2 = await postJson(base, '/api/download', {
      awemeId: fakeMeta.awemeId,
      qualityIndex: 0,
      subdir: '..\\..\\evil',
    });
    assert.equal(dl2.status, 200);
    const { jobId: jobId2 } = await dl2.json();
    await (await fetch(`${base}/api/progress/${jobId2}`)).text();
    assert.ok(
      seenDest.startsWith(path.join(downloadsDir, 'evil') + path.sep),
      `traversal must stay inside downloads, got ${seenDest}`,
    );
    assert.ok(!seenDest.split(path.sep).includes('..'), 'no .. segment in final path');
  });
});

