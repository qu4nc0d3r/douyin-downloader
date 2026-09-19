/**
 * Douyin Edge Cache & Resolver - Cloudflare Worker
 *
 * Tính năng:
 * 1. GET /resolve?url=... -> Theo dõi chuyển hướng (Redirect 302) và bóc tách awemeId siêu nhanh ở Edge
 * 2. GET /meta/:id -> Lấy metadata video đã được lưu trong Cloudflare KV (Cache Hit trong 20ms)
 * 3. POST /meta/:id -> Lưu metadata video vào Cloudflare KV với TTL (mặc định 1 giờ)
 * 4. GET /thumb?url=... -> Reverse Proxy ảnh bìa Douyin, loại bỏ Referer và cache trên Cloudflare CDN
 */

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, X-Worker-Secret',
};

const SHARE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const AWEME_ID_RE = /(?:share\/)?(video|note)\/(\d{15,20})/;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function parseAwemeId(url) {
  const match = AWEME_ID_RE.exec(String(url || ''));
  if (!match) return null;
  return { id: match[2], type: match[1] };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health check & Trang thông tin
    if (path === '/' || path === '/health') {
      return json({
        status: 'ok',
        service: 'douyin-edge-cache',
        hasKv: !!env.DOUYIN_CACHE,
        time: new Date().toISOString(),
      });
    }

    // 2. GET /resolve?url=... -> Giải mã link rút gọn (v.douyin.com) & tra cứu Cache KV siêu tốc
    if (path === '/resolve' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return json({ ok: false, error: 'Thiếu tham số url' }, 400);
      }

      const direct = parseAwemeId(targetUrl);
      if (direct) {
        let cachedMeta = null;
        if (env.DOUYIN_CACHE) {
          try {
            cachedMeta = await env.DOUYIN_CACHE.get(`meta:${direct.id}`, { type: 'json' });
          } catch {}
        }
        return json({
          ok: true,
          finalUrl: targetUrl,
          ...direct,
          ...(cachedMeta ? { cachedMeta } : {}),
        });
      }

      try {
        const res = await fetch(targetUrl, {
          redirect: 'follow',
          headers: {
            'user-agent': SHARE_UA,
            referer: 'https://www.douyin.com/',
          },
        });

        const parsed = parseAwemeId(res.url);
        if (!parsed) {
          return json({ ok: false, error: 'Không tìm thấy ID video từ đường dẫn' }, 404);
        }

        let cachedMeta = null;
        if (env.DOUYIN_CACHE) {
          try {
            cachedMeta = await env.DOUYIN_CACHE.get(`meta:${parsed.id}`, { type: 'json' });
          } catch {}
        }

        return json({
          ok: true,
          finalUrl: res.url,
          id: parsed.id,
          type: parsed.type,
          ...(cachedMeta ? { cachedMeta } : {}),
        });
      } catch (err) {
        return json({ ok: false, error: `Lỗi kết nối tới Douyin: ${err.message}` }, 502);
      }
    }

    // 3. GET /meta/:id -> Lấy metadata từ Cloudflare KV
    const metaMatch = /^\/meta\/(\d{15,20})$/.exec(path);
    if (metaMatch && request.method === 'GET') {
      const awemeId = metaMatch[1];
      if (!env.DOUYIN_CACHE) {
        return json({ found: false, error: 'Chưa cấu hình KV namespace DOUYIN_CACHE' }, 503);
      }

      try {
        const cached = await env.DOUYIN_CACHE.get(`meta:${awemeId}`, { type: 'json' });
        if (!cached) {
          return json({ found: false, id: awemeId });
        }
        return json(
          { found: true, id: awemeId, meta: cached },
          200,
          { 'cache-control': 'public, max-age=60' }
        );
      } catch (err) {
        return json({ found: false, error: err.message }, 500);
      }
    }

    // 4. POST /meta/:id -> Lưu metadata vào Cloudflare KV
    if (metaMatch && request.method === 'POST') {
      const awemeId = metaMatch[1];
      if (!env.DOUYIN_CACHE) {
        return json({ ok: false, error: 'Chưa cấu hình KV namespace DOUYIN_CACHE' }, 503);
      }

      // Kiểm tra bảo mật nếu có đặt secret token
      if (env.AUTH_SECRET) {
        const secret = request.headers.get('x-worker-secret');
        if (secret !== env.AUTH_SECRET) {
          return json({ ok: false, error: 'Không có quyền truy cập (Unauthorized)' }, 401);
        }
      }

      try {
        const body = await request.json();
        const meta = body?.meta || body;
        if (!meta || !meta.awemeId) {
          return json({ ok: false, error: 'Dữ liệu metadata không hợp lệ' }, 400);
        }

        // Mặc định lưu trong 3600 giây (1 giờ), tối đa 24 giờ
        const ttl = Number(body?.ttl) || 3600;
        const validTtl = Math.max(300, Math.min(ttl, 86400));

        await env.DOUYIN_CACHE.put(`meta:${awemeId}`, JSON.stringify(meta), {
          expirationTtl: validTtl,
        });

        return json({ ok: true, id: awemeId, ttl: validTtl });
      } catch (err) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    // 5. GET /thumb?url=... -> Proxy ảnh bìa không bị chặn Referer
    if (path === '/thumb' && request.method === 'GET') {
      const imageUrl = url.searchParams.get('url');
      if (!imageUrl) return new Response('Thiếu url', { status: 400 });

      try {
        const imgRes = await fetch(imageUrl, {
          headers: {
            'user-agent': SHARE_UA,
            referer: 'https://www.douyin.com/',
          },
          cf: { cacheTtl: 86400, cacheEverything: true },
        });

        const headers = new Headers(imgRes.headers);
        headers.set('access-control-allow-origin', '*');
        headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');

        return new Response(imgRes.body, {
          status: imgRes.status,
          headers,
        });
      } catch (err) {
        return new Response(`Lỗi tải ảnh: ${err.message}`, { status: 502 });
      }
    }

    return json({ error: 'Endpoint không tồn tại' }, 404);
  },
};
