import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertAllowedUrl, uniqueDestPath, downloadFile } from '../src/downloader.js';

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function startRangeServer(payload) {
  return startServer((req, res) => {
    const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
    if (!match) {
      res.writeHead(200, { 'content-length': String(payload.length), 'accept-ranges': 'bytes' });
      res.end(payload);
      return;
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : payload.length - 1;
    const slice = payload.subarray(start, end + 1);
    res.writeHead(206, {
      'content-range': `bytes ${start}-${end}/${payload.length}`,
      'content-length': String(slice.length),
      'accept-ranges': 'bytes',
    });
    res.end(slice);
  });
}

function tmpDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'dy-test-'));
}

test('assertAllowedUrl accepts douyin CDN hosts', () => {
  assert.ok(assertAllowedUrl('https://aweme.snssdk.com/aweme/v1/play/?video_id=x'));
  assert.ok(assertAllowedUrl('https://v3-web.douyinvod.com/abc'));
  assert.ok(assertAllowedUrl('https://p3-sign.douyinpic.com/cover.jpeg'));
});

test('assertAllowedUrl rejects other hosts and protocols', () => {
  assert.throws(() => assertAllowedUrl('http://localhost:8080/x'), (e) => e.code === 'URL_NOT_ALLOWED');
  assert.throws(() => assertAllowedUrl('https://evil.com/x'), (e) => e.code === 'URL_NOT_ALLOWED');
  assert.throws(() => assertAllowedUrl('file:///etc/passwd'), (e) => e.code === 'URL_NOT_ALLOWED');
  assert.throws(() => assertAllowedUrl('not a url'), (e) => e.code === 'URL_NOT_ALLOWED');
});

test('uniqueDestPath adds suffix on collision', async () => {
  const dir = await tmpDir();
  await fsp.writeFile(path.join(dir, 'video_1.mp4'), 'x');
  const result = await uniqueDestPath(dir, 'video_1.mp4');
  assert.equal(path.basename(result), 'video_1 (1).mp4');
});

test('downloadFile streams file, reports progress, removes .part', async () => {
  const payload = Buffer.alloc(64 * 1024, 7);
  const server = await startServer((req, res) => {
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  const port = server.address().port;
  const dir = await tmpDir();
  const dest = path.join(dir, 'out.mp4');
  const progress = [];
  const result = await downloadFile([`http://127.0.0.1:${port}/video.mp4`], dest, {
    onProgress: (p) => progress.push(p),
    allowedSuffixes: ['127.0.0.1'],
  });
  assert.equal(result.size, payload.length);
  assert.ok(fs.existsSync(dest));
  assert.ok(progress.length > 0);
  assert.equal(progress.at(-1).downloaded, payload.length);
  assert.equal(progress.at(-1).total, payload.length);
  assert.ok(!fs.existsSync(dest + '.part'));
  server.closeAllConnections?.();
  server.close();
});

test('downloadFile falls back to next url when first fails', async () => {
  const payload = Buffer.from('ok');
  const server = await startServer((req, res) => {
    if (req.url === '/bad') {
      res.writeHead(403);
      res.end('no');
      return;
    }
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  const port = server.address().port;
  const dir = await tmpDir();
  const dest = path.join(dir, 'out.mp4');
  const result = await downloadFile(
    [`http://127.0.0.1:${port}/bad`, `http://127.0.0.1:${port}/good`],
    dest,
    { allowedSuffixes: ['127.0.0.1'], maxRetries: 0 },
  );
  assert.equal(result.size, payload.length);
  assert.equal(await fsp.readFile(dest, 'utf8'), 'ok');
  assert.ok(!fs.existsSync(dest + '.part'));
  server.closeAllConnections?.();
  server.close();
});

test('downloadFile overwrites existing destination file', async () => {
  const payload = Buffer.from('new-content');
  const server = await startServer((req, res) => {
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  const port = server.address().port;
  const dir = await tmpDir();
  const dest = path.join(dir, 'out.mp4');
  await fsp.writeFile(dest, 'old-content');
  const result = await downloadFile([`http://127.0.0.1:${port}/x`], dest, {
    allowedSuffixes: ['127.0.0.1'],
  });
  assert.equal(result.size, payload.length);
  assert.equal(await fsp.readFile(dest, 'utf8'), 'new-content');
  assert.ok(!fs.existsSync(dest + '.part'));
  server.closeAllConnections?.();
  server.close();
});

test('downloadFile sanitizes cookie header with control characters', async () => {
  let seenCookie = 'unset';
  const payload = Buffer.from('ok');
  const server = await startServer((req, res) => {
    seenCookie = req.headers.cookie;
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  try {
    const port = server.address().port;
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.mp4');
    const result = await downloadFile([`http://127.0.0.1:${port}/x`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      cookie: 'a=1\nb=2; c=3',
    });
    assert.equal(result.size, payload.length);
    assert.equal(seenCookie, 'a=1 b=2; c=3');
    assert.ok(!seenCookie.includes('\n'));
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile uses segmented path for large range-capable files', async () => {
  const payload = Buffer.alloc(400 * 1024);
  for (let i = 0; i < payload.length; i++) payload[i] = i % 233;
  const server = await startRangeServer(payload);
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    const result = await downloadFile([`http://127.0.0.1:${server.address().port}/v`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      segmentMinSize: 100 * 1024,
      segments: 4,
      chunkSize: 64 * 1024,
      maxRetries: 0,
    });
    assert.equal(result.size, payload.length);
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
    assert.ok(!fs.existsSync(dest + '.part.json'));
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile falls back to single stream when Range is unsupported', async () => {
  const payload = Buffer.alloc(300 * 1024, 9);
  const server = await startServer((req, res) => {
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    const result = await downloadFile([`http://127.0.0.1:${server.address().port}/x`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      segmentMinSize: 1000,
      maxRetries: 0,
    });
    assert.equal(result.size, payload.length);
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile resumes partial download via Range', async () => {
  const payload = Buffer.alloc(200 * 1024);
  for (let i = 0; i < payload.length; i++) payload[i] = i % 173;
  const server = await startRangeServer(payload);
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    await fsp.writeFile(dest + '.part', payload.subarray(0, 100 * 1024));
    const progress = [];
    const result = await downloadFile([`http://127.0.0.1:${server.address().port}/v`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      segmentMinSize: 0,
      onProgress: (p) => progress.push(p),
      maxRetries: 0,
    });
    assert.equal(result.size, payload.length);
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
    assert.equal(progress.at(-1).downloaded, payload.length);
    assert.equal(progress.at(-1).total, payload.length);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile aborts stalled connection and moves to next url', async () => {
  const good = Buffer.from('ok-data');
  const server = await startServer((req, res) => {
    if (req.url === '/stall') {
      res.writeHead(200, { 'content-length': '1000' });
      return;
    }
    res.writeHead(200, { 'content-length': String(good.length) });
    res.end(good);
  });
  try {
    const port = server.address().port;
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    const result = await downloadFile(
      [`http://127.0.0.1:${port}/stall`, `http://127.0.0.1:${port}/good`],
      dest,
      { allowedSuffixes: ['127.0.0.1'], stallTimeoutMs: 300, maxRetries: 0, segmentMinSize: 0 },
    );
    assert.equal(result.size, good.length);
    assert.equal(await fsp.readFile(dest, 'utf8'), 'ok-data');
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile refreshes urls when all candidates are forbidden', async () => {
  const payload = Buffer.from('fresh-url-data');
  const server = await startServer((req, res) => {
    if (req.url === '/forbidden') {
      res.writeHead(403);
      res.end('no');
      return;
    }
    res.writeHead(200, { 'content-length': String(payload.length) });
    res.end(payload);
  });
  try {
    const port = server.address().port;
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    let refreshCalls = 0;
    const result = await downloadFile([`http://127.0.0.1:${port}/forbidden`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      segmentMinSize: 0,
      maxRetries: 0,
      refreshUrls: async () => {
        refreshCalls++;
        return [`http://127.0.0.1:${port}/ok`];
      },
    });
    assert.equal(result.size, payload.length);
    assert.equal(await fsp.readFile(dest, 'utf8'), 'fresh-url-data');
    assert.equal(refreshCalls, 1);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadFile throws DOWNLOAD_FAILED when every url fails', async () => {
  const server = await startServer((req, res) => {
    res.writeHead(500);
    res.end();
  });
  const port = server.address().port;
  const dir = await tmpDir();
  await assert.rejects(
    downloadFile([`http://127.0.0.1:${port}/x`], path.join(dir, 'out.mp4'), {
      allowedSuffixes: ['127.0.0.1'],
      maxRetries: 0,
    }),
    (e) => e.code === 'DOWNLOAD_FAILED',
  );
  server.closeAllConnections?.();
  server.close();
});

test('downloadFile aborts on signal and preserves .part file for resume', async () => {
  const payload = Buffer.alloc(100 * 1024, 'a');
  let serverTimer = null;
  const server = await startServer((req, res) => {
    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      const start = Number(match[1]);
      const slice = payload.subarray(start);
      res.writeHead(206, {
        'content-range': `bytes ${start}-${payload.length - 1}/${payload.length}`,
        'content-length': String(slice.length),
        'accept-ranges': 'bytes',
      });
      res.end(slice);
      return;
    }
    res.writeHead(200, {
      'content-length': String(payload.length),
      'accept-ranges': 'bytes',
    });
    res.write(payload.subarray(0, 40 * 1024));
    serverTimer = setTimeout(() => {
      res.end(payload.subarray(40 * 1024));
    }, 200);
  });

  const port = server.address().port;
  const dir = await tmpDir();
  const dest = path.join(dir, 'paused.mp4');
  const controller = new AbortController();

  try {
    await assert.rejects(
      downloadFile([`http://127.0.0.1:${port}/video`], dest, {
        allowedSuffixes: ['127.0.0.1'],
        segmentMinSize: 0,
        signal: controller.signal,
        onProgress: (p) => {
          if (p.downloaded >= 40 * 1024) {
            controller.abort();
          }
        },
      }),
      (err) => err.code === 'PAUSED',
    );

    // .part file must still exist after pause
    assert.ok(fs.existsSync(`${dest}.part`));
    assert.ok(!fs.existsSync(dest));
    const partialSize = (await fsp.stat(`${dest}.part`)).size;
    assert.equal(partialSize, 40 * 1024);

    // Resuming without abort signal completes the download
    const result = await downloadFile([`http://127.0.0.1:${port}/video`], dest, {
      allowedSuffixes: ['127.0.0.1'],
      segmentMinSize: 0,
    });
    assert.equal(result.size, payload.length);
    assert.ok(fs.existsSync(dest));
    assert.ok(!fs.existsSync(`${dest}.part`));
  } finally {
    clearTimeout(serverTimer);
    server.closeAllConnections?.();
    server.close();
  }
});
