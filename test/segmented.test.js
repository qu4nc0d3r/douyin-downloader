import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseContentRange, probeRange, downloadSegmented } from '../src/segmented.js';

function startRangeServer(payload, { supportRange = true } = {}) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (!supportRange || !req.headers.range) {
        res.writeHead(200, {
          'content-length': String(payload.length),
          'accept-ranges': supportRange ? 'bytes' : 'none',
        });
        res.end(payload);
        return;
      }
      const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range);
      if (!match) {
        res.writeHead(200, { 'content-length': String(payload.length) });
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
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function tmpDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'dy-seg-'));
}

test('parseContentRange parses and rejects malformed headers', () => {
  assert.deepEqual(parseContentRange('bytes 0-99/1000'), { start: 0, end: 99, total: 1000 });
  assert.deepEqual(parseContentRange('bytes 10-19/*'), { start: 10, end: 19, total: null });
  assert.equal(parseContentRange('bytes 0-99'), null);
  assert.equal(parseContentRange(undefined), null);
});

test('probeRange returns total for range-capable server and null otherwise', async () => {
  const payload = Buffer.alloc(2048, 5);
  const rangeServer = await startRangeServer(payload);
  const plainServer = await startRangeServer(payload, { supportRange: false });
  try {
    const ranged = await probeRange(`http://127.0.0.1:${rangeServer.address().port}/x`, {});
    assert.equal(ranged.total, payload.length);
    const plain = await probeRange(`http://127.0.0.1:${plainServer.address().port}/x`, {});
    assert.equal(plain, null);
  } finally {
    rangeServer.closeAllConnections?.();
    rangeServer.close();
    plainServer.closeAllConnections?.();
    plainServer.close();
  }
});

test('downloadSegmented downloads full file across chunks and cleans up', async () => {
  const payload = Buffer.alloc(1024 * 1024 + 123, 7);
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251;
  const server = await startRangeServer(payload);
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    const progress = [];
    await downloadSegmented([`http://127.0.0.1:${server.address().port}/v`], dest, {
      total: payload.length,
      chunkSize: 128 * 1024,
      segments: 4,
      onProgress: (p) => progress.push(p),
    });
    assert.ok(fs.existsSync(dest));
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
    assert.ok(!fs.existsSync(dest + '.part'), 'part removed');
    assert.ok(!fs.existsSync(dest + '.part.json'), 'sidecar removed');
    assert.equal(progress.at(-1).downloaded, payload.length);
    assert.ok(progress.length > 1, 'multiple progress updates');
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadSegmented resumes from part file and sidecar', async () => {
  const payload = Buffer.alloc(512 * 1024);
  for (let i = 0; i < payload.length; i++) payload[i] = i % 199;
  const server = await startRangeServer(payload);
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    const part = dest + '.part';
    const half = payload.length / 2;
    await fsp.writeFile(part, payload.subarray(0, half));
    await fsp.writeFile(
      dest + '.part.json',
      JSON.stringify({ total: payload.length, done: [[0, half - 1]] }),
    );
    const progress = [];
    await downloadSegmented([`http://127.0.0.1:${server.address().port}/v`], dest, {
      total: payload.length,
      chunkSize: 128 * 1024,
      segments: 2,
      onProgress: (p) => progress.push(p),
    });
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
    assert.ok(!fs.existsSync(dest + '.part.json'));
    assert.ok(progress.length >= 1);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('downloadSegmented refreshes urls when all candidates are forbidden', async () => {
  const payload = Buffer.alloc(256 * 1024, 3);
  const server = await new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url === '/forbidden') {
        res.writeHead(403);
        res.end('no');
        return;
      }
      const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range);
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
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const port = server.address().port;
  try {
    const dir = await tmpDir();
    const dest = path.join(dir, 'out.bin');
    let refreshCalls = 0;
    const result = await downloadSegmented([`http://127.0.0.1:${port}/forbidden`], dest, {
      total: payload.length,
      chunkSize: 128 * 1024,
      segments: 2,
      refreshUrls: async () => {
        refreshCalls++;
        return [`http://127.0.0.1:${port}/ok`];
      },
    });
    assert.equal(result.size, payload.length);
    assert.equal(refreshCalls, 1);
    assert.equal((await fsp.readFile(dest)).equals(payload), true);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});
