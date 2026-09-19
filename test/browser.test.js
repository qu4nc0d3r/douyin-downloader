import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFetchExpression,
  buildUserProfileExpression,
  buildUserPostExpression,
  SEC_UID_RE,
  findBrowserExecutable,
  cookieToCdpParams,
  getBrowserLaunchFlags,
  DouyinBrowser,
  DEFAULT_IDLE_TIMEOUT_MS,
} from '../src/browser.js';

test('buildFetchExpression embeds aweme id and detail endpoint', () => {
  const expr = buildFetchExpression('7123456789012345678');
  assert.match(expr, /aweme\/v1\/web\/aweme\/detail/);
  assert.match(expr, /aweme_id=7123456789012345678/);
  assert.match(expr, /credentials: 'include'/);
});

test('buildFetchExpression rejects non-numeric ids', () => {
  assert.throws(() => buildFetchExpression('abc; process.exit(1)'), (err) => err.code === 'NOT_FOUND');
  assert.throws(() => buildFetchExpression(''), (err) => err.code === 'NOT_FOUND');
});

test('cookieToCdpParams keeps only auth cookies and maps to douyin.com', () => {
  const params = cookieToCdpParams('sessionid=abc; ttwid=xyz; UIFID_TEMP=zzz; sid_tt=def; foo=1');
  assert.deepEqual(params, [
    { name: 'sessionid', value: 'abc', domain: '.douyin.com', path: '/', secure: true },
    { name: 'sid_tt', value: 'def', domain: '.douyin.com', path: '/', secure: true },
  ]);
  assert.deepEqual(cookieToCdpParams('ttwid=only; s_v_web_id=v'), []);
  assert.deepEqual(cookieToCdpParams(''), []);
});

test('findBrowserExecutable finds a browser on this machine', { skip: !process.env.RUN_BROWSER_TESTS }, () => {
  const exe = findBrowserExecutable();
  assert.ok(typeof exe === 'string' && exe.length > 0);
});

test('getBrowserLaunchFlags includes resource-saving flags and targets', () => {
  const flags = getBrowserLaunchFlags(9222, '/tmp/test-profile');
  assert.ok(flags.includes('--headless=new'));
  assert.ok(flags.includes('--remote-debugging-port=9222'));
  assert.ok(flags.includes('--user-data-dir=/tmp/test-profile'));
  assert.ok(flags.includes('--blink-settings=imagesEnabled=false'));
  assert.ok(flags.includes('--disable-background-networking'));
  assert.ok(flags.includes('--disable-sync'));
  assert.ok(flags.includes('--disable-translate'));
  assert.ok(flags.includes('--disable-default-apps'));
});

test('DouyinBrowser manages idle timer correctly', () => {
  const b = new DouyinBrowser();
  assert.equal(b.idleTimer, null);

  // When not ready, scheduleIdleTimer does not set timer
  b.scheduleIdleTimer(1000);
  assert.equal(b.idleTimer, null);

  // When ready, scheduleIdleTimer sets timer
  b.ready = true;
  b.scheduleIdleTimer(5000);
  assert.ok(b.idleTimer !== null);

  // clearIdleTimer resets timer
  b.clearIdleTimer();
  assert.equal(b.idleTimer, null);
});

test('DouyinBrowser initializes startPromise, apiQueue and 2min idle timeout', () => {
  const b = new DouyinBrowser();
  assert.equal(b.startPromise, null);
  assert.ok(b.apiQueue instanceof Promise);
  assert.equal(DEFAULT_IDLE_TIMEOUT_MS, 120_000);
});

const TEST_SEC_UID = 'MS4wLjABAAAA_test-sec-uid-1234567890';

test('buildUserPostExpression embeds sec uid, cursor and count', () => {
  const expr = buildUserPostExpression(TEST_SEC_UID, 111, 18);
  assert.match(expr, /aweme\/v1\/web\/aweme\/post/);
  assert.match(expr, /sec_user_id=MS4wLjABAAAA_test-sec-uid-1234567890/);
  assert.match(expr, /max_cursor=111/);
  assert.match(expr, /count=18/);
  assert.match(expr, /credentials: 'include'/);
});

test('buildUserPostExpression clamps invalid cursor and count', () => {
  const expr = buildUserPostExpression(TEST_SEC_UID, -5, 0);
  assert.match(expr, /max_cursor=0/);
  assert.match(expr, /count=18/);
});

test('buildUserProfileExpression targets the other-profile endpoint', () => {
  const expr = buildUserProfileExpression(TEST_SEC_UID);
  assert.match(expr, /aweme\/v1\/web\/user\/profile\/other/);
  assert.match(expr, /sec_user_id=MS4wLjABAAAA_test-sec-uid-1234567890/);
});

test('profile expressions reject invalid sec uids', () => {
  assert.throws(
    () => buildUserPostExpression('abc; process.exit(1)'),
    (err) => err.code === 'NOT_FOUND',
  );
  assert.throws(() => buildUserProfileExpression(''), (err) => err.code === 'NOT_FOUND');
  assert.equal(SEC_UID_RE.test(TEST_SEC_UID), true);
  assert.equal(SEC_UID_RE.test('short'), false);
});

