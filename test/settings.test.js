import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseCookieInput, splitCookiePairs, createSettings } from '../src/settings.js';

test('parseCookieInput accepts raw cookie string and normalizes', () => {
  assert.equal(parseCookieInput('a=1; b=2'), 'a=1; b=2');
  assert.equal(parseCookieInput('  a=1 ;;  b=2 ; '), 'a=1; b=2');
  assert.equal(parseCookieInput('sessionid=abc=def'), 'sessionid=abc=def');
});

test('parseCookieInput extracts cookie from bash cURL', () => {
  const curl =
    "curl 'https://www.douyin.com/aweme/v1/web/aweme/detail/?x=1' -H 'cookie: sessionid=abc; ttwid=xyz' -H 'user-agent: blah'";
  assert.equal(parseCookieInput(curl), 'sessionid=abc; ttwid=xyz');
});

test('parseCookieInput extracts cookie from windows cmd cURL', () => {
  const curl = 'curl "https://www.douyin.com/" -H "Cookie: sessionid=abc; ttwid=xyz"';
  assert.equal(parseCookieInput(curl), 'sessionid=abc; ttwid=xyz');
});

test('parseCookieInput accepts JSON cookie export', () => {
  const json = JSON.stringify([
    { name: 'sessionid', value: 'abc' },
    { name: 'ttwid', value: 'xyz' },
  ]);
  assert.equal(parseCookieInput(json), 'sessionid=abc; ttwid=xyz');
});

test('parseCookieInput throws INVALID_COOKIE for junk or empty input', () => {
  assert.throws(() => parseCookieInput('hello world'), (e) => e.code === 'INVALID_COOKIE');
  assert.throws(() => parseCookieInput(''), (e) => e.code === 'INVALID_COOKIE');
  assert.throws(() => parseCookieInput(undefined), (e) => e.code === 'INVALID_COOKIE');
});

test('parseCookieInput accepts Netscape cookie export from Get cookies.txt LOCALLY', () => {
  const netscape =
    '# Netscape HTTP Cookie File\n' +
    '# https://curl.haxx.se/rfc/cookie_spec.html\n' +
    '# This is a generated file! Do not edit.\n' +
    '\n' +
    '.douyin.com\tTRUE\t/\tTRUE\t1824287247\tenter_pc_once\t1\n' +
    '.douyin.com\tTRUE\t/\tTRUE\t1793338878\tsid_tt\ta3d4f233\n' +
    '#HttpOnly_www.douyin.com\tFALSE\t/\tTRUE\t1792319247\tweb_sign_token\tabc.def.ghi\n' +
    '\n';
  assert.equal(
    parseCookieInput(netscape),
    'enter_pc_once=1; sid_tt=a3d4f233; web_sign_token=abc.def.ghi',
  );
});

test('parseCookieInput accepts extension JSON export (chrome.cookies fields)', () => {
  const json = JSON.stringify([
    {
      domain: '.douyin.com',
      expirationDate: 1824287247,
      hostOnly: false,
      httpOnly: true,
      name: 'enter_pc_once',
      path: '/',
      sameSite: 'no_restriction',
      secure: true,
      session: false,
      storeId: '0',
      value: '1',
    },
    {
      domain: 'www.douyin.com',
      expirationDate: 1792319247,
      hostOnly: true,
      httpOnly: false,
      name: 'web_sign_token',
      path: '/',
      sameSite: 'lax',
      secure: true,
      session: false,
      storeId: '0',
      value: 'abc.def.ghi',
    },
  ]);
  assert.equal(parseCookieInput(json), 'enter_pc_once=1; web_sign_token=abc.def.ghi');
});

test('parseCookieInput accepts extension header-string format with trailing semicolon', () => {
  assert.equal(parseCookieInput('sessionid=abc; sid_tt=def;'), 'sessionid=abc; sid_tt=def');
});

test('parseCookieInput strips control characters from names and values', () => {
  assert.equal(parseCookieInput('a=1\n2; b=ok'), 'a=12; b=ok');
  assert.equal(parseCookieInput('x\t=1; y=2'), 'x=1; y=2');
});

test('splitCookiePairs returns name/value pairs', () => {
  assert.deepEqual(splitCookiePairs('a=1; b=2=3'), [
    { name: 'a', value: '1' },
    { name: 'b', value: '2=3' },
  ]);
});

test('settings save, load, clear roundtrip', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-settings-'));
  const settings = createSettings(dir);
  assert.deepEqual(settings.getStatus(), { configured: false, cookieCount: 0, updatedAt: null });
  assert.equal(settings.getCookie(), null);

  const status = settings.saveCookie('a=1; b=2');
  assert.equal(status.configured, true);
  assert.equal(status.cookieCount, 2);
  assert.ok(status.updatedAt);
  assert.equal(settings.getCookie(), 'a=1; b=2');

  const cleared = settings.clearCookie();
  assert.deepEqual(cleared, { configured: false, cookieCount: 0, updatedAt: null });
  assert.equal(settings.getCookie(), null);
});

test('settings saveCookie rejects invalid input', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-settings-'));
  const settings = createSettings(dir);
  assert.throws(() => settings.saveCookie('nope'), (e) => e.code === 'INVALID_COOKIE');
});

test('settings repairs legacy Netscape cookie stored on disk', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-settings-'));
  await fsp.writeFile(
    path.join(dir, 'cookie.json'),
    JSON.stringify({
      cookie: '.douyin.com\tTRUE\t/\tTRUE\t1824287247\tsessionid\tabc',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  );
  const settings = createSettings(dir);
  assert.equal(settings.getCookie(), 'sessionid=abc');
  const status = settings.getStatus();
  assert.equal(status.configured, true);
  assert.equal(status.cookieCount, 1);
  const rewritten = JSON.parse(await fsp.readFile(path.join(dir, 'cookie.json'), 'utf8'));
  assert.equal(rewritten.cookie, 'sessionid=abc', 'legacy cookie is repaired on disk');
});

test('settings ignores unrepairable stored cookie', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dy-settings-'));
  await fsp.writeFile(
    path.join(dir, 'cookie.json'),
    JSON.stringify({ cookie: 'garbage without pairs', updatedAt: 'x' }),
  );
  const settings = createSettings(dir);
  assert.equal(settings.getCookie(), null);
  assert.equal(settings.getStatus().configured, false);
});
