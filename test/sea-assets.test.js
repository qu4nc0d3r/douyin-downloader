import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createSeaAssetMiddleware } from '../src/sea-assets.js';

function makeApp(assets) {
  const calls = [];
  const getAsset = (key) => {
    calls.push(key);
    return assets.get(key);
  };
  const app = express();
  app.use(createSeaAssetMiddleware({ getAsset }));
  return { app, calls };
}

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

test('serves embedded index.html at /', async () => {
  const { app } = makeApp(new Map([['web/index.html', '<h1>hi</h1>']]));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(await res.text(), '<h1>hi</h1>');
  });
});

test('serves nested embedded assets with correct content type', async () => {
  const assets = new Map([
    ['web/style.css', 'body{}'],
    ['web/fonts/UTM-Avo.ttf', Buffer.from([0, 1, 2, 3])],
  ]);
  const { app } = makeApp(assets);
  await withServer(app, async (base) => {
    const css = await fetch(`${base}/style.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    assert.equal(await css.text(), 'body{}');

    const font = await fetch(`${base}/fonts/UTM-Avo.ttf`);
    assert.equal(font.status, 200);
    assert.match(font.headers.get('content-type'), /font\/ttf/);
    assert.deepEqual(Buffer.from(await font.arrayBuffer()), Buffer.from([0, 1, 2, 3]));
  });
});

test('maps /vendor/lucide/lucide.min.js to embedded vendor asset', async () => {
  const { app, calls } = makeApp(new Map([['web/vendor/lucide/lucide.min.js', 'window.lucide={}']]));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/vendor/lucide/lucide.min.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /javascript/);
    assert.match(await res.text(), /lucide/);
    assert.ok(calls.includes('web/vendor/lucide/lucide.min.js'));
  });
});

test('falls through for assets that are not embedded', async () => {
  const { app } = makeApp(new Map([['web/index.html', 'x']]));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/missing.css`);
    assert.equal(res.status, 404);
  });
});

test('falls through for non-GET requests', async () => {
  const { app } = makeApp(new Map([['web/style.css', 'body{}']]));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/style.css`, { method: 'POST' });
    assert.equal(res.status, 404);
  });
});

test('rejects path traversal instead of reading outside web root', async () => {
  const { app, calls } = makeApp(new Map([['web/index.html', 'x']]));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/..%2fpackage.json`);
    assert.equal(res.status, 404);
    const raw = await fetch(`${base}/%2e%2e/%2e%2e/package.json`);
    assert.equal(raw.status, 404);
    assert.ok(
      calls.every((key) => !key.includes('..')),
      `getAsset called with traversal key: ${calls.join(', ')}`,
    );
  });
});
