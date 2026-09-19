import path from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
};

export function assetKeyFor(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  if (decoded.split('/').includes('..')) return null;
  const normalized = decoded === '/' ? '/index.html' : decoded;
  if (!normalized.startsWith('/')) return null;
  return `web${normalized}`;
}

export function createSeaAssetMiddleware({ getAsset }) {
  return function seaAssetMiddleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const key = assetKeyFor(req.path);
    if (!key) return next();
    let data;
    try {
      data = getAsset(key);
    } catch {
      return next();
    }
    if (data == null) return next();
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    res.setHeader('Content-Type', CONTENT_TYPES[path.extname(key).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(body);
  };
}
