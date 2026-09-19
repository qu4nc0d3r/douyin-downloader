import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractShareUrl,
  extractShareUrls,
  extractAwemeId,
  extractJsonAfterMarker,
  parseRouterData,
  parseAwemeDetail,
  parseSelfProfile,
  buildQualities,
  sanitizeFilename,
  getWorkerConfig,
  fetchWorkerMeta,
  saveWorkerMeta,
  extractSecUid,
  resolveProfileInput,
  parseUserProfile,
  parseUserPostList,
  sanitizeFolderName,
} from '../src/extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'router-data.json'), 'utf8'),
);
const detailFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'aweme-detail.json'), 'utf8'),
);
const profileFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'user-profile.json'), 'utf8'),
);
const postsFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'user-posts.json'), 'utf8'),
);

test('extractShareUrl finds short link in share text', () => {
  const text = '7.43 abc:/ 复制打开抖音，看看【Test Author的作品】 https://v.douyin.com/iRNBho6u/ 01/28';
  assert.equal(extractShareUrl(text), 'https://v.douyin.com/iRNBho6u/');
});

test('extractShareUrl finds full douyin url', () => {
  assert.equal(
    extractShareUrl('xem https://www.douyin.com/video/7123456789012345678 đi'),
    'https://www.douyin.com/video/7123456789012345678',
  );
});

test('extractShareUrl returns null for non-douyin or empty input', () => {
  assert.equal(extractShareUrl('https://example.com/video/123'), null);
  assert.equal(extractShareUrl('không có link'), null);
  assert.equal(extractShareUrl(''), null);
  assert.equal(extractShareUrl(undefined), null);
});

test('extractShareUrls finds all links in multi-video share text', () => {
  const text =
    '4.69 qRx:/ 11/07 :5pm x@S.yT 范马家族，王朝崛起。后续内容更新在@小马云 # 范马家族  https://v.douyin.com/8EzlfTphyko/ 复制此链接，打开Dou音搜索，直接观看视频！ ' +
    '0.76 J@I.IV WMJ:/ 05/01 :6pm 80后老登勇闯加勒比海无人岛，谁知夜里的海底都是巨型犀牛虾！ # YSL七夕限定  https://v.douyin.com/URiEJSTZJSw/ 复制此链接，打开Dou音搜索，直接观看视频！';
  assert.deepEqual(extractShareUrls(text), [
    'https://v.douyin.com/8EzlfTphyko/',
    'https://v.douyin.com/URiEJSTZJSw/',
  ]);
});

test('extractShareUrls dedupes repeated links and ignores non-douyin urls', () => {
  const text =
    'https://example.com/a https://v.douyin.com/abc123/ https://v.douyin.com/abc123/ https://www.douyin.com/video/7123456789012345678';
  assert.deepEqual(extractShareUrls(text), [
    'https://v.douyin.com/abc123/',
    'https://www.douyin.com/video/7123456789012345678',
  ]);
  assert.deepEqual(extractShareUrls('no links here'), []);
});

test('extractAwemeId handles video, share and note forms', () => {
  assert.deepEqual(extractAwemeId('https://www.douyin.com/video/7123456789012345678'), {
    id: '7123456789012345678',
    type: 'video',
  });
  assert.deepEqual(extractAwemeId('https://www.iesdouyin.com/share/video/7123456789012345678/'), {
    id: '7123456789012345678',
    type: 'video',
  });
  assert.deepEqual(extractAwemeId('https://www.douyin.com/note/7123456789012345678'), {
    id: '7123456789012345678',
    type: 'note',
  });
  assert.equal(extractAwemeId('https://v.douyin.com/iRNBho6u/'), null);
});

test('extractJsonAfterMarker handles nested braces and braces inside strings', () => {
  const html = '<script>window._ROUTER_DATA = {"a":{"b":"}{"},"c":[1,2]}; window.other = 1;</script>';
  const json = extractJsonAfterMarker(html, 'window._ROUTER_DATA');
  assert.deepEqual(JSON.parse(json), { a: { b: '}{' }, c: [1, 2] });
});

test('extractJsonAfterMarker throws when marker missing', () => {
  assert.throws(() => extractJsonAfterMarker('<html></html>', 'window._ROUTER_DATA'));
});

test('parseRouterData extracts metadata and qualities from fixture', () => {
  const meta = parseRouterData(fixture);
  assert.equal(meta.awemeId, '7123456789012345678');
  assert.equal(meta.title, 'Test video tiêu đề');
  assert.equal(meta.author, 'Test Author');
  assert.equal(meta.cover, 'https://p3-sign.douyinpic.com/cover.jpeg');
  assert.equal(meta.durationMs, 15000);
  assert.equal(meta.isImagePost, false);
  assert.deepEqual(
    meta.qualities.map((q) => q.label),
    ['1080p', '720p'],
  );
  for (const q of meta.qualities) {
    for (const u of q.urls) assert.ok(!u.includes('playwm'), `playwm left in ${u}`);
  }
});

test('parseSelfProfile extracts account info', () => {
  const profile = {
    user: {
      uid: '1576032167272576',
      nickname: 'Mạc Quân',
      unique_id: 'macquan123',
      signature: 'xin chào',
      avatar_larger: { url_list: ['https://p3-pc-sign.douyinpic.com/avatar.jpeg'] },
      follower_count: 1234,
      following_count: 56,
      aweme_count: 7,
      total_favorited: 89000,
    },
  };
  const account = parseSelfProfile(profile);
  assert.deepEqual(account, {
    uid: '1576032167272576',
    nickname: 'Mạc Quân',
    uniqueId: 'macquan123',
    signature: 'xin chào',
    avatar: 'https://p3-pc-sign.douyinpic.com/avatar.jpeg',
    followerCount: 1234,
    followingCount: 56,
    awemeCount: 7,
    totalFavorited: 89000,
  });
});

test('parseSelfProfile returns null when not logged in', () => {
  assert.equal(parseSelfProfile({ user: null }), null);
  assert.equal(parseSelfProfile({}), null);
  assert.equal(parseSelfProfile(null), null);
});

test('parseSelfProfile tolerates missing optional fields', () => {
  const account = parseSelfProfile({ user: { uid: '1', nickname: 'A' } });
  assert.equal(account.uniqueId, '');
  assert.equal(account.avatar, '');
  assert.equal(account.followerCount, null);
});

test('parseRouterData throws NOT_FOUND for empty item_list', () => {
  const data = { loaderData: { 'video_(id)/page': { videoInfoRes: { item_list: [] } } } };
  assert.throws(() => parseRouterData(data), (err) => err.code === 'NOT_FOUND');
});

test('parseRouterData throws IMAGE_POST_UNSUPPORTED for image posts', () => {
  const data = {
    loaderData: {
      'video_(id)/page': {
        videoInfoRes: { item_list: [{ aweme_id: '1', images: [{}], video: {} }] },
      },
    },
  };
  assert.throws(() => parseRouterData(data), (err) => err.code === 'IMAGE_POST_UNSUPPORTED');
});

test('parseAwemeDetail extracts metadata and qualities from API fixture', () => {
  const meta = parseAwemeDetail(detailFixture);
  assert.equal(meta.awemeId, '7372484719365098803');
  assert.equal(meta.title, 'Test video tiêu đề');
  assert.equal(meta.author, 'Test Author');
  assert.equal(meta.cover, 'https://p3-sign.douyinpic.com/cover.jpeg');
  assert.equal(meta.durationMs, 8010);
  assert.equal(meta.likeCount, 45300);
  assert.equal(meta.isImagePost, false);
  assert.deepEqual(
    meta.qualities.map((q) => q.label),
    ['2160p', '1080p', '720p', '576p'],
  );
  assert.equal(meta.qualities[0].bitrate, 5533124);
  const p1080 = meta.qualities.find((q) => q.label === '1080p');
  assert.equal(p1080.bitrate, 1603814, 'dedupe keeps highest bitrate per label');
  assert.ok(p1080.urls.length >= 2, 'merged fallback urls from duplicate entries');
  for (const q of meta.qualities) {
    for (const u of q.urls) {
      assert.ok(!u.includes('playwm'), `playwm left in ${u}`);
      assert.ok(!u.includes('/mps/logo/'), `watermark url in ${u}`);
    }
  }
});

test('parseAwemeDetail throws NOT_FOUND when payload has no video data', () => {
  assert.throws(() => parseAwemeDetail({ aweme_id: '1' }), (err) => err.code === 'NOT_FOUND');
});

test('parseAwemeDetail throws IMAGE_POST_UNSUPPORTED for image posts', () => {
  assert.throws(
    () => parseAwemeDetail({ aweme_id: '1', images: [{ url_list: [] }], video: {} }),
    (err) => err.code === 'IMAGE_POST_UNSUPPORTED',
  );
});

test('buildQualities without bit_rate returns default ratios sorted high to low', () => {
  const video = {
    play_addr: {
      uri: 'v0200',
      url_list: ['https://www.douyin.com/aweme/v1/playwm/?video_id=v0200&ratio=720p&line=0'],
    },
  };
  const qualities = buildQualities(video);
  assert.deepEqual(
    qualities.map((q) => q.label),
    ['1080p', '720p', '540p', '480p'],
  );
  assert.ok(qualities[0].urls.some((u) => u.includes('ratio=1080p')));
  assert.ok(qualities[0].urls.every((u) => !u.includes('playwm')), 'playwm must be replaced');
});

test('sanitizeFilename strips forbidden chars and appends id', () => {
  assert.equal(sanitizeFilename('a/b:c*d?"e<f>g|h', '123'), 'a b c d e f g h_123.mp4');
  assert.equal(sanitizeFilename('   ...   ', '123'), 'douyin_123.mp4');
  assert.equal(sanitizeFilename('视频 tiêu đề', '123'), '视频 tiêu đề_123.mp4');
  assert.equal(sanitizeFilename('x'.repeat(200), '123').length, 80 + '_123.mp4'.length);
});

test('getWorkerConfig returns null when env not configured', () => {
  const origUrl = process.env.CLOUDFLARE_WORKER_URL;
  try {
    delete process.env.CLOUDFLARE_WORKER_URL;
    assert.equal(getWorkerConfig(), null);
    process.env.CLOUDFLARE_WORKER_URL = '   ';
    assert.equal(getWorkerConfig(), null);
  } finally {
    if (origUrl) process.env.CLOUDFLARE_WORKER_URL = origUrl;
    else delete process.env.CLOUDFLARE_WORKER_URL;
  }
});

test('getWorkerConfig parses URL and secret properly', () => {
  const origUrl = process.env.CLOUDFLARE_WORKER_URL;
  const origSec = process.env.CLOUDFLARE_WORKER_SECRET;
  try {
    process.env.CLOUDFLARE_WORKER_URL = 'https://my-cache.workers.dev///';
    process.env.CLOUDFLARE_WORKER_SECRET = 'my-token';
    assert.deepEqual(getWorkerConfig(), {
      url: 'https://my-cache.workers.dev',
      secret: 'my-token',
    });
  } finally {
    if (origUrl) process.env.CLOUDFLARE_WORKER_URL = origUrl;
    else delete process.env.CLOUDFLARE_WORKER_URL;
    if (origSec) process.env.CLOUDFLARE_WORKER_SECRET = origSec;
    else delete process.env.CLOUDFLARE_WORKER_SECRET;
  }
});

test('fetchWorkerMeta returns null when not configured', async () => {
  const origUrl = process.env.CLOUDFLARE_WORKER_URL;
  try {
    delete process.env.CLOUDFLARE_WORKER_URL;
    const res = await fetchWorkerMeta('7123456789012345678');
    assert.equal(res, null);
  } finally {
    if (origUrl) process.env.CLOUDFLARE_WORKER_URL = origUrl;
    else delete process.env.CLOUDFLARE_WORKER_URL;
  }
});

test('extractSecUid finds profile ids in urls and share text', () => {
  assert.equal(
    extractSecUid('https://www.douyin.com/user/MS4wLjABAAAA_test-sec-uid-1234567890?from_tab_name=main'),
    'MS4wLjABAAAA_test-sec-uid-1234567890',
  );
  assert.equal(
    extractSecUid('xem kênh https://www.douyin.com/user/MS4wLjABAAAA_test-sec-uid-1234567890 nha'),
    'MS4wLjABAAAA_test-sec-uid-1234567890',
  );
  assert.equal(extractSecUid('https://www.douyin.com/video/7123456789012345678'), null);
  assert.equal(extractSecUid('https://v.douyin.com/abc/'), null);
  assert.equal(extractSecUid(''), null);
  assert.equal(extractSecUid(undefined), null);
});

test('resolveProfileInput returns sec uid directly without network', async () => {
  const secUid = await resolveProfileInput(
    'https://www.douyin.com/user/MS4wLjABAAAA_test-sec-uid-1234567890',
  );
  assert.equal(secUid, 'MS4wLjABAAAA_test-sec-uid-1234567890');
});

test('resolveProfileInput rejects text without a profile link', async () => {
  await assert.rejects(
    () => resolveProfileInput('không có gì'),
    (err) => err.code === 'PROFILE_NOT_FOUND',
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    url: 'https://www.douyin.com/video/7123456789012345678',
  });
  try {
    await assert.rejects(
      () => resolveProfileInput('https://www.douyin.com/video/7123456789012345678'),
      (err) => err.code === 'PROFILE_NOT_FOUND',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveProfileInput follows share links to a profile sec uid', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    url: 'https://www.douyin.com/user/MS4wLjABAAAA_test-sec-uid-1234567890',
  });
  try {
    const secUid = await resolveProfileInput('https://v.douyin.com/abc/');
    assert.equal(secUid, 'MS4wLjABAAAA_test-sec-uid-1234567890');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('parseUserProfile extracts channel info from fixture', () => {
  const profile = parseUserProfile(profileFixture);
  assert.deepEqual(profile, {
    secUid: 'MS4wLjABAAAA_test-sec-uid-1234567890',
    nickname: 'Test Channel',
    uniqueId: 'testchannel',
    signature: 'xin chào',
    avatar: 'https://p3-pc-sign.douyinpic.com/avatar.jpeg',
    awemeCount: 4,
    followerCount: 1234,
  });
  assert.equal(parseUserProfile({ user: null }), null);
  assert.equal(parseUserProfile({}), null);
});

test('parseUserPostList separates videos and image posts', () => {
  const parsed = parseUserPostList(postsFixture.page1);
  assert.deepEqual(
    parsed.items.map((item) => item.title),
    ['Video ghim', 'Video thứ hai'],
  );
  assert.deepEqual(parsed.imagePosts, [
    {
      awemeId: '7380000000000000002',
      title: 'Bài đăng ảnh',
      cover: 'https://p3-sign.douyinpic.com/cover-2.jpeg',
    },
  ]);
  assert.equal(parsed.hasMore, true);
  assert.equal(parsed.maxCursor, 111);

  const first = parsed.items[0];
  assert.equal(first.awemeId, '7380000000000000001');
  assert.equal(first.author, 'Test Channel');
  assert.equal(first.durationMs, 5000);
  assert.equal(first.likeCount, 1200000);
  assert.deepEqual(
    first.qualities.map((q) => q.label),
    ['720p'],
  );
  assert.equal(first.qualities[0].bitrate, 1368885);
  for (const quality of first.qualities) {
    for (const url of quality.urls) {
      assert.ok(!url.includes('playwm'), `playwm left in ${url}`);
    }
  }
});

test('parseUserPostList tolerates empty or malformed payloads', () => {
  const empty = parseUserPostList({ aweme_list: [], has_more: 0, max_cursor: 0 });
  assert.deepEqual(empty, { items: [], imagePosts: [], hasMore: false, maxCursor: 0 });
  const malformed = parseUserPostList(null);
  assert.deepEqual(malformed, { items: [], imagePosts: [], hasMore: false, maxCursor: 0 });
});

test('sanitizeFolderName strips separators, traversal and forbidden chars', () => {
  assert.equal(sanitizeFolderName('Test: Channel'), 'Test Channel');
  assert.equal(sanitizeFolderName('..\\..\\evil'), 'evil');
  assert.equal(sanitizeFolderName('a/b'), 'a b');
  assert.equal(sanitizeFolderName('   ...   '), '');
  assert.equal(sanitizeFolderName(''), '');
  assert.equal(sanitizeFolderName(undefined), '');
  assert.equal(sanitizeFolderName('x'.repeat(120)).length, 60);
});

