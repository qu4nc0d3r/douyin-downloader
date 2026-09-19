import fs from 'node:fs';
import path from 'node:path';

export const MIN_WIDTH = 940;
export const MIN_HEIGHT = 640;
export const DEFAULT_WIDTH = 1280;
export const DEFAULT_HEIGHT = 860;

const VISIBLE_MARGIN_X = 60;
const VISIBLE_MARGIN_Y = 40;

export function defaultBounds(displays, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  const { workArea } = displays[0];
  const w = Math.min(width, workArea.width);
  const h = Math.min(height, workArea.height);
  return {
    x: Math.round(workArea.x + (workArea.width - w) / 2),
    y: Math.round(workArea.y + (workArea.height - h) / 2),
    width: w,
    height: h,
  };
}

function isVisibleOn(bounds, displays) {
  return displays.some(({ workArea }) => {
    const overlapX =
      Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x);
    const overlapY =
      Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y);
    return overlapX >= VISIBLE_MARGIN_X && overlapY >= VISIBLE_MARGIN_Y;
  });
}

export function computeRestoredState(saved, displays, options = {}) {
  const defaultWidth = options.defaultWidth ?? DEFAULT_WIDTH;
  const defaultHeight = options.defaultHeight ?? DEFAULT_HEIGHT;
  const fallback = { bounds: defaultBounds(displays, defaultWidth, defaultHeight), maximized: false };
  if (!saved || !Array.isArray(displays) || displays.length === 0) return fallback;

  const { x, y, width, height } = saved;
  if (![x, y, width, height].every((value) => Number.isFinite(value))) return fallback;

  const bounds = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(MIN_WIDTH, Math.round(width)),
    height: Math.max(MIN_HEIGHT, Math.round(height)),
  };
  if (!isVisibleOn(bounds, displays)) return fallback;
  return { bounds, maximized: Boolean(saved.maximized) };
}

export function createWindowStateStore(file) {
  return {
    load() {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
      } catch {}
    },
  };
}
