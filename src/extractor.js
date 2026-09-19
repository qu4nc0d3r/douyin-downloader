import { extractError } from './errors.js';
import { getBrowser } from './browser.js';

export { extractError };

const SHARE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const URL_RE = /https?:\/\/[^\s"'<>\u4e00-\u9fff，。！？、；：（）【】《》]+/g;
const DOUYIN_HOST_RE = /(^|\.)(douyin\.com|iesdouyin\.com)$/i;
const AWEME_ID_RE = /(?:share\/)?(video|note)\/(\d{15,20})/;

export function extractShareUrls(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(URL_RE) || [];
  const seen = new Set();
  const urls = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[),.;!?，。！？]+$/u, '');
    let parsed;
    try {
      parsed = new URL(cleaned);
    } catch {
      continue;
    }
    if (!DOUYIN_HOST_RE.test(parsed.hostname)) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    urls.push(cleaned);
  }
  return urls;
}

export function extractShareUrl(text) {
  return extractShareUrls(text)[0] || null;
}

export function extractAwemeId(url) {
  const match = AWEME_ID_RE.exec(String(url || ''));
  if (!match) return null;
  return { id: match[2], type: match[1] };
}

export function extractJsonAfterMarker(html, marker) {
  const start = html.indexOf(marker);
  if (start === -1) throw new Error(`Marker not found: ${marker}`);
  const braceStart = html.indexOf('{', start + marker.length);
  if (braceStart === -1) throw new Error(`Marker not found: ${marker}`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(braceStart, i + 1);
    }
  }
  throw new Error('Unbalanced JSON in page');
}

const DEFAULT_RATIOS = ['1080p', '720p', '540p', '480p'];

function normalizeGearName(name) {
  const match = /(\d{3,4})/.exec(String(name || ''));
  return match ? `${match[1]}p` : String(name || 'unknown');
}

function playUrlFromUri(uri, ratio) {
  return `https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(uri)}&ratio=${ratio}&line=0`;
}

function normalizePlayUrl(url, ratio) {
  if (!url) return null;
  let out = url.replace(/playwm/g, 'play');
  if (ratio && out.includes('ratio=')) out = out.replace(/ratio=[^&]*/, `ratio=${ratio}`);
  return out;
}

function qualityUrls(playAddr, ratio) {
  const urls = [];
  const direct = normalizePlayUrl(playAddr?.url_list?.[0], ratio);
  if (direct) urls.push(direct);
  if (playAddr?.uri) urls.push(playUrlFromUri(playAddr.uri, ratio));
  return urls;
}

function entryHeight(entry) {
  const height = entry?.play_addr?.height;
  if (Number.isFinite(height) && height > 0) return height;
  const match = /(\d{3,4})/.exec(String(entry?.gear_name ?? ''));
  return match ? Number(match[1]) : null;
}

export function isH265Entry(entry) {
  if (entry?.is_h265 === 1) return true;
  const gear = String(entry?.gear_name || '').toLowerCase();
  return gear.includes('bvc1') || gear.includes('h265') || gear.includes('hevc');
}

export function buildQualities(video) {
  const source = video || {};
  const bitRates = Array.isArray(source.bit_rate) ? source.bit_rate.slice() : [];
  bitRates.sort((a, b) => (b?.bit_rate ?? 0) - (a?.bit_rate ?? 0));
  const groups = new Map();
  for (const entry of bitRates) {
    const height = entryHeight(entry);
    const label = height ? `${height}p` : normalizeGearName(entry?.gear_name ?? entry?.quality_type);
    const isHevc = isH265Entry(entry);
    const entryUrls = [];
    for (const raw of entry?.play_addr?.url_list || []) {
      const normalized = normalizePlayUrl(raw);
      if (normalized && !entryUrls.includes(normalized)) entryUrls.push(normalized);
    }
    if (entry?.play_addr?.uri) {
      entryUrls.push(playUrlFromUri(entry.play_addr.uri, label));
    }
    if (entryUrls.length === 0) continue;
    const existing = groups.get(label);
    if (!existing) {
      groups.set(label, {
        label,
        height: height ?? 0,
        bitrate: entry?.bit_rate ?? 0,
        codec: isHevc ? 'h265' : 'h264',
        h264Urls: isHevc ? [] : entryUrls.slice(),
        h265Urls: isHevc ? entryUrls.slice() : [],
        urls: entryUrls.slice(),
      });
    } else {
      if (!isHevc) {
        for (const url of entryUrls) {
          if (!existing.h264Urls.includes(url)) existing.h264Urls.push(url);
        }
        existing.codec = 'h264';
      } else {
        for (const url of entryUrls) {
          if (!existing.h265Urls.includes(url)) existing.h265Urls.push(url);
        }
      }
      if ((entry?.bit_rate ?? 0) > existing.bitrate) {
        existing.bitrate = entry.bit_rate;
      }
    }
  }

  for (const group of groups.values()) {
    if (group.h264Urls?.length > 0) {
      group.urls = [...group.h264Urls, ...group.h265Urls].slice(0, 8);
    } else {
      group.urls = group.h265Urls.slice(0, 8);
    }
    delete group.h264Urls;
    delete group.h265Urls;
  }

  const result = [...groups.values()].sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);
  if (result.length > 0) {
    for (const quality of result) delete quality.height;
    return result;
  }
  for (const ratio of DEFAULT_RATIOS) {
    const urls = qualityUrls(source.play_addr, ratio);
    if (urls.length === 0) continue;
    result.push({ label: ratio, bitrate: 0, codec: 'h264', urls });
  }
  return result;
}

export function parseRouterData(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      throw extractError('PARSE_FAILED', `Invalid page JSON: ${err.message}`);
    }
  }
  const loaderData = data?.loaderData || {};
  const pageKey = Object.keys(loaderData).find(
    (key) => key.endsWith('/page') && (key.startsWith('video') || key.startsWith('note')),
  );
  const itemList = loaderData[pageKey]?.videoInfoRes?.item_list;
  if (!pageKey || !Array.isArray(itemList) || itemList.length === 0) {
    throw extractError('NOT_FOUND', 'Video not found in share page');
  }
  const item = itemList[0];
  if (Array.isArray(item.images) && item.images.length > 0) {
    throw extractError('IMAGE_POST_UNSUPPORTED', 'Image posts are not supported');
  }
  const video = item.video || {};
  return {
    awemeId: String(item.aweme_id || ''),
    type: 'video',
    title: String(item.desc || '').trim(),
    author: String(item.author?.nickname || ''),
    cover: video.cover?.url_list?.[0] || video.origin_cover?.url_list?.[0] || '',
    durationMs: video.duration ?? null,
    likeCount: item.statistics?.digg_count ?? null,
    isImagePost: false,
    qualities: buildQualities(video),
  };
}

export function parseAwemeDetail(detail) {
  if (!detail || typeof detail !== 'object') {
    throw extractError('NOT_FOUND', 'Empty aweme detail');
  }
  if (Array.isArray(detail.images) && detail.images.length > 0) {
    throw extractError('IMAGE_POST_UNSUPPORTED', 'Image posts are not supported');
  }
  const video = detail.video || {};
  const qualities = buildQualities(video);
  if (qualities.length === 0) {
    throw extractError('NOT_FOUND', 'Video has no playable streams');
  }
  return {
    awemeId: String(detail.aweme_id || ''),
    type: 'video',
    title: String(detail.desc || '').trim(),
    author: String(detail.author?.nickname || ''),
    cover: video.cover?.url_list?.[0] || video.origin_cover?.url_list?.[0] || '',
    durationMs: video.duration ?? null,
    likeCount: detail.statistics?.digg_count ?? null,
    isImagePost: false,
    qualities,
  };
}

export function parseSelfProfile(data) {
  const user = data?.user;
  if (!user) return null;
  return {
    uid: String(user.uid || ''),
    nickname: String(user.nickname || ''),
    uniqueId: String(user.unique_id || user.short_id || ''),
    signature: String(user.signature || ''),
    avatar: user.avatar_larger?.url_list?.[0] || user.avatar_thumb?.url_list?.[0] || '',
    followerCount: user.follower_count ?? null,
    followingCount: user.following_count ?? null,
    awemeCount: user.aweme_count ?? null,
    totalFavorited: user.total_favorited ?? null,
  };
}

const USER_ID_RE = /\/user\/([A-Za-z0-9_-]{20,128})/;

export function extractSecUid(text) {
  if (typeof text !== 'string') return null;
  const match = USER_ID_RE.exec(text);
  return match ? match[1] : null;
}

export function parseUserProfile(data) {
  const user = data?.user;
  if (!user) return null;
  return {
    secUid: String(user.sec_uid || ''),
    nickname: String(user.nickname || ''),
    uniqueId: String(user.unique_id || user.short_id || ''),
    signature: String(user.signature || ''),
    avatar: user.avatar_larger?.url_list?.[0] || user.avatar_thumb?.url_list?.[0] || '',
    awemeCount: user.aweme_count ?? null,
    followerCount: user.follower_count ?? null,
  };
}

function parseUserPostItem(entry) {
  const awemeId = String(entry?.aweme_id || '');
  if (!awemeId) return null;
  if (Array.isArray(entry?.images) && entry.images.length > 0) {
    return {
      kind: 'image',
      post: {
        awemeId,
        title: String(entry.desc || '').trim(),
        cover:
          entry.video?.cover?.url_list?.[0] || entry.images?.[0]?.url_list?.[0] || '',
      },
    };
  }
  const video = entry.video || {};
  const qualities = buildQualities(video);
  if (qualities.length === 0) return null;
  return {
    kind: 'video',
    meta: {
      awemeId,
      type: 'video',
      title: String(entry.desc || '').trim(),
      author: String(entry.author?.nickname || ''),
      cover: video.cover?.url_list?.[0] || video.origin_cover?.url_list?.[0] || '',
      durationMs: video.duration ?? null,
      likeCount: entry.statistics?.digg_count ?? null,
      isImagePost: false,
      qualities,
    },
  };
}

export function parseUserPostList(data) {
  const list = Array.isArray(data?.aweme_list) ? data.aweme_list : [];
  const items = [];
  const imagePosts = [];
  for (const entry of list) {
    const parsed = parseUserPostItem(entry);
    if (!parsed) continue;
    if (parsed.kind === 'image') imagePosts.push(parsed.post);
    else items.push(parsed.meta);
  }
  return {
    items,
    imagePosts,
    hasMore: !!data?.has_more,
    maxCursor: Number(data?.max_cursor) || 0,
  };
}

export function sanitizeFolderName(name) {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\.\./g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim()
    .slice(0, 60)
    .trim();
  return cleaned || '';
}

export function sanitizeFilename(title, awemeId) {
  const name = String(title || '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim()
    .slice(0, 80)
    .trim();
  if (!name) return `douyin_${awemeId}.mp4`;
  return `${name}_${awemeId}.mp4`;
}

export function getWorkerConfig() {
  const url = process.env.CLOUDFLARE_WORKER_URL?.trim();
  if (!url) return null;
  const secret = process.env.CLOUDFLARE_WORKER_SECRET?.trim() || null;
  return { url: url.replace(/\/+$/, ''), secret };
}

export async function fetchWorkerMeta(awemeId) {
  const config = getWorkerConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/meta/${awemeId}`, {
      signal: AbortSignal.timeout(3000),
      headers: {
        accept: 'application/json',
        ...(config.secret ? { 'x-worker-secret': config.secret } : {}),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.found && data.meta?.qualities?.length > 0) {
      return data.meta;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveWorkerMeta(awemeId, meta) {
  const config = getWorkerConfig();
  if (!config || !meta) return;
  try {
    await fetch(`${config.url}/meta/${awemeId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers: {
        'content-type': 'application/json',
        ...(config.secret ? { 'x-worker-secret': config.secret } : {}),
      },
      body: JSON.stringify({ meta, ttl: 3600 }),
    });
  } catch {
    // Non-critical background save
  }
}

export async function resolveShareUrl(shareUrl) {
  let parsed;
  try {
    parsed = new URL(shareUrl);
  } catch {
    throw extractError('INVALID_LINK', `Not a valid URL: ${shareUrl}`);
  }
  if (!DOUYIN_HOST_RE.test(parsed.hostname)) {
    throw extractError('INVALID_LINK', `Not a Douyin URL: ${shareUrl}`);
  }
  const direct = extractAwemeId(shareUrl);
  if (direct) return { finalUrl: shareUrl, ...direct };

  // Try Cloudflare Worker resolver if configured
  const config = getWorkerConfig();
  if (config) {
    try {
      const res = await fetch(`${config.url}/resolve?url=${encodeURIComponent(shareUrl)}`, {
        signal: AbortSignal.timeout(4000),
        headers: {
          accept: 'application/json',
          ...(config.secret ? { 'x-worker-secret': config.secret } : {}),
        },
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.ok && body.id) {
          return {
            finalUrl: body.finalUrl || shareUrl,
            id: body.id,
            type: body.type || 'video',
            cachedMeta: body.cachedMeta || null,
          };
        }
      }
    } catch {}
  }

  let res;
  try {
    res = await fetch(shareUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': SHARE_UA, referer: 'https://www.douyin.com/' },
    });
  } catch (err) {
    throw extractError('NETWORK_ERROR', err.message);
  }
  const resolved = extractAwemeId(res.url);
  if (!resolved) throw extractError('NOT_FOUND', `Cannot resolve aweme id from ${res.url}`);
  return { finalUrl: res.url, ...resolved };
}

export async function resolveProfileInput(text) {
  const direct = extractSecUid(text);
  if (direct) return direct;
  const shareUrl = extractShareUrls(text)[0];
  if (!shareUrl) {
    throw extractError('PROFILE_NOT_FOUND', 'No profile URL in input');
  }
  let res;
  try {
    res = await fetch(shareUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': SHARE_UA, referer: 'https://www.douyin.com/' },
    });
  } catch (err) {
    throw extractError('NETWORK_ERROR', err.message);
  }
  const secUid = extractSecUid(res.url);
  if (!secUid) throw extractError('PROFILE_NOT_FOUND', `Cannot resolve profile from ${res.url}`);
  return secUid;
}

export async function fetchSharePage(awemeId) {
  let res;
  try {
    res = await fetch(`https://www.iesdouyin.com/share/video/${awemeId}/`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': SHARE_UA, referer: 'https://www.iesdouyin.com/' },
    });
  } catch (err) {
    throw extractError('NETWORK_ERROR', err.message);
  }
  if (!res.ok) throw extractError('NOT_FOUND', `Share page HTTP ${res.status}`);
  return res.text();
}

async function extractOne(shareUrl) {
  const { id, type, cachedMeta } = await resolveShareUrl(shareUrl);

  // 1. Cloudflare Worker KV Cache Fast-path
  const cached = cachedMeta || (await fetchWorkerMeta(id));
  if (cached) {
    return { ...cached, awemeId: cached.awemeId || id, type };
  }

  // 2. Local Chrome Headless
  const browser = await getBrowser();
  const detail = await browser.fetchAwemeDetail(id);
  const meta = parseAwemeDetail(detail);
  const result = { ...meta, awemeId: meta.awemeId || id, type };

  saveWorkerMeta(id, result).catch(() => {});

  return result;
}

export const MAX_LINKS = 10;

export async function extract(inputText) {
  const shareUrl = extractShareUrl(inputText);
  if (!shareUrl) throw extractError('INVALID_LINK', 'No Douyin link in input');
  return extractOne(shareUrl);
}

export async function extractMany(inputText, options = {}) {
  const { maxLinks = MAX_LINKS } = options;
  const urls = extractShareUrls(inputText);
  if (urls.length === 0) throw extractError('INVALID_LINK', 'No Douyin link in input');
  if (urls.length > maxLinks) {
    throw extractError('TOO_MANY_LINKS', `Too many links: ${urls.length} > ${maxLinks}`);
  }
  const results = [];
  const seenIds = new Set();
  for (const url of urls) {
    try {
      const meta = await extractOne(url);
      if (seenIds.has(meta.awemeId)) continue;
      seenIds.add(meta.awemeId);
      results.push({ ok: true, url, meta });
    } catch (error) {
      results.push({ ok: false, url, error });
    }
  }
  return results;
}
