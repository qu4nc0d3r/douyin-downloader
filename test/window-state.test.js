import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  MIN_HEIGHT,
  MIN_WIDTH,
  computeRestoredState,
  createWindowStateStore,
  defaultBounds,
} from '../electron/window-state.js';

const primary = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
const secondary = { workArea: { x: 1920, y: 0, width: 1280, height: 1024 } };

test('defaultBounds centers the window in the primary work area', () => {
  const bounds = defaultBounds([primary], 1280, 860);
  assert.deepEqual(bounds, { x: 320, y: 90, width: 1280, height: 860 });
});

test('defaultBounds shrinks windows larger than the work area', () => {
  const small = { workArea: { x: 0, y: 0, width: 1000, height: 700 } };
  const bounds = defaultBounds([small], 1280, 860);
  assert.equal(bounds.width, 1000);
  assert.equal(bounds.height, 700);
  assert.equal(bounds.x, 0);
  assert.equal(bounds.y, 0);
});

test('computeRestoredState keeps saved bounds visible on any display', () => {
  const saved = { x: 2000, y: 100, width: 1200, height: 800, maximized: true };
  const state = computeRestoredState(saved, [primary, secondary]);
  assert.deepEqual(state.bounds, { x: 2000, y: 100, width: 1200, height: 800 });
  assert.equal(state.maximized, true);
});

test('computeRestoredState falls back when saved bounds are off-screen', () => {
  const saved = { x: -5000, y: -5000, width: 1200, height: 800, maximized: true };
  const state = computeRestoredState(saved, [primary]);
  assert.deepEqual(state.bounds, defaultBounds([primary], 1280, 860));
  assert.equal(state.maximized, false);
});

test('computeRestoredState clamps tiny sizes to the minimums', () => {
  const state = computeRestoredState({ x: 100, y: 100, width: 200, height: 100 }, [primary]);
  assert.equal(state.bounds.width, MIN_WIDTH);
  assert.equal(state.bounds.height, MIN_HEIGHT);
  assert.equal(state.maximized, false);
});

test('computeRestoredState ignores malformed saved state', () => {
  assert.deepEqual(computeRestoredState(null, [primary]).bounds, defaultBounds([primary], 1280, 860));
  const state = computeRestoredState({ x: 'a', y: 2, width: 1, height: 1 }, [primary]);
  assert.ok(state.bounds.width >= MIN_WIDTH);
  assert.ok(state.bounds.height >= MIN_HEIGHT);
});

test('window state store round-trips through disk', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-wstate-'));
  const store = createWindowStateStore(path.join(dir, 'nested', 'window-state.json'));
  assert.equal(store.load(), null);
  const state = { x: 10, y: 20, width: 1000, height: 700, maximized: false };
  store.save(state);
  assert.deepEqual(store.load(), state);
});
