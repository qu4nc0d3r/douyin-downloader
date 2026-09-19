import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extract } from '../src/extractor.js';
import { downloadFile } from '../src/downloader.js';
import { resetBrowser } from '../src/browser.js';

const enabled = process.env.RUN_NETWORK_TESTS === '1' && !!process.env.TEST_DOUYIN_URL;

after(async () => {
  await resetBrowser();
});

test('extract and download a real douyin video', { skip: !enabled }, async () => {
  const meta = await extract(process.env.TEST_DOUYIN_URL);
  assert.ok(meta.awemeId);
  assert.ok(meta.qualities.length > 0);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-int-'));
  const dest = path.join(dir, 'out.mp4');
  const result = await downloadFile(meta.qualities[0].urls, dest);
  assert.ok(result.size > 10000, `file too small: ${result.size}`);
  const head = await fsp.readFile(dest);
  assert.ok(head.subarray(4, 8).toString('latin1') === 'ftyp', 'not an mp4');
  await fsp.rm(dir, { recursive: true, force: true });
});
