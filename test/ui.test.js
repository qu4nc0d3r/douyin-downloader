import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

test('index.html contains view toggle controls with Lucide icons', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="viewListBtn"/, 'should have viewListBtn');
  assert.match(html, /id="viewGridBtn"/, 'should have viewGridBtn');
  assert.match(html, /data-lucide="layout-list"/, 'should have layout-list icon');
  assert.match(html, /data-lucide="layout-grid"/, 'should have layout-grid icon');
  assert.match(html, /class="view-toggle"/, 'should have view-toggle container');
});

test('style.css defines styles for view-toggle and #items.view-grid', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.view-toggle\s*\{/, 'should have .view-toggle styles');
  assert.match(css, /\.view-toggle-btn\s*\{/, 'should have .view-toggle-btn styles');
  assert.match(css, /\.view-toggle-btn\.active\s*\{/, 'should have active button styles');
  assert.match(css, /#items\.view-grid,\s*#profileItems\.view-grid\s*\{/, 'should have container grid styles for both lists');
  assert.match(css, /#items\.view-grid \.item,\s*#profileItems\.view-grid \.item\s*\{/, 'should have item grid card styles for both lists');
  assert.match(css, /#items\.view-grid \.item-cover,\s*#profileItems\.view-grid \.item-cover\s*\{/, 'should have item cover grid styles for both lists');
});

test('app.js handles view mode toggling and persistence', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /viewListBtn:\s*document\.getElementById\('viewListBtn'\)/, 'should register viewListBtn in els');
  assert.match(js, /viewGridBtn:\s*document\.getElementById\('viewGridBtn'\)/, 'should register viewGridBtn in els');
  assert.match(js, /VIEW_MODE_KEY\s*=/, 'should define VIEW_MODE_KEY');
  assert.match(js, /function setViewMode/, 'should define setViewMode');
  assert.match(js, /function initViewMode/, 'should define initViewMode');
  assert.match(js, /initViewMode\(\)/, 'should call initViewMode on startup');
});

test('index.html contains video selection controls in extract tab', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="extractCheckAll"/, 'should have extractCheckAll checkbox');
  assert.match(html, /id="extractCheckAllLabel"/, 'should have extractCheckAllLabel');
  assert.match(html, /id="downloadSelectedBtn"/, 'should have downloadSelectedBtn');
  assert.match(html, /class="item-check"/, 'should have item-check in itemTemplate');
  assert.match(html, /class="item-check-wrap"/, 'should have item-check-wrap in itemTemplate');
});

test('style.css defines styles for video selection in extract tab', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.extract-selectall\s*\{/, 'should have .extract-selectall styles');
  assert.match(css, /\.item-check-wrap\s*\{/, 'should have .item-check-wrap styles');
  assert.match(css, /\.item-check\s*\{/, 'should have .item-check styles');
  assert.match(css, /\.item\[data-selected="false"\]\s*\{/, 'should have data-selected styling');
});

test('app.js handles video selection logic and downloadSelectedBtn', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /extractCheckAll:\s*document\.getElementById\('extractCheckAll'\)/, 'should register extractCheckAll in els');
  assert.match(js, /downloadSelectedBtn:\s*document\.getElementById\('downloadSelectedBtn'\)/, 'should register downloadSelectedBtn in els');
  assert.match(js, /function updateExtractSelection/, 'should define updateExtractSelection');
  assert.match(js, /els\.downloadSelectedBtn\?\.addEventListener/, 'should have downloadSelectedBtn click handler');
  assert.match(js, /els\.extractCheckAll\?\.addEventListener/, 'should have extractCheckAll change handler');
});

test('index.html uses a titlebar and sidebar with three nav pages', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /class="titlebar"/, 'should have titlebar');
  assert.match(html, /class="sidebar"/, 'should have sidebar');
  assert.match(html, /id="tabExtract"[^>]*class="nav-btn/, 'tabExtract should be a sidebar nav button');
  assert.match(html, /id="tabQueue"[^>]*class="nav-btn/, 'tabQueue should be a sidebar nav button');
  assert.match(html, /id="navCookie"[^>]*class="nav-btn/, 'navCookie should be a sidebar nav button');
  assert.match(html, /id="cookieStatus"[\s\S]*?account|id="cookieStatus"/, 'should keep cookieStatus badge');
  assert.match(html, /id="inputCard"/, 'should keep inputCard view');
  assert.match(html, /id="listSection"/, 'should keep listSection view');
  assert.match(html, /id="queueSection"/, 'should keep queueSection view');
  assert.match(html, /id="cookiePanel"/, 'cookie panel should be a page view');
  assert.doesNotMatch(html, /id="cookieToggle"/, 'cookieToggle should be removed');
  assert.match(html, /class="sidebar-footer"/, 'sidebar should have a footer anchor');
});

test('style.css defines desktop shell layout styles', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.titlebar\s*\{/, 'should style .titlebar');
  assert.match(css, /-webkit-app-region:\s*drag/, 'titlebar should be a drag region');
  assert.match(css, /\.sidebar\s*\{/, 'should style .sidebar');
  assert.match(css, /\.nav-btn\s*\{/, 'should style .nav-btn');
  assert.match(css, /\.nav-btn\.active\s*\{/, 'should style active nav button');
  assert.match(css, /\.app-shell\s*\{/, 'should style .app-shell');
  assert.match(css, /html\.is-electron/, 'should have electron-specific layout rules');
  assert.match(css, /\.sidebar-footer\s*\{/, 'should style the sidebar footer');
  assert.match(css, /html\.is-electron\s+\.sidebar\s*\{[^}]*align-self:\s*stretch/, 'electron sidebar should stretch full height');
  assert.match(css, /:focus-visible/, 'should define visible keyboard focus styles');
});

test('app.js wires desktop navigation, shortcuts and electron detection', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /navCookie:\s*document\.getElementById\('navCookie'\)/, 'should register navCookie in els');
  assert.match(js, /inputCard:\s*document\.getElementById\('inputCard'\)/, 'should register inputCard in els');
  assert.match(js, /setTab\('cookie'\)/, 'should allow switching to cookie tab');
  assert.match(js, /is-electron/, 'should add is-electron class for shell styling');
  assert.match(js, /'1':\s*'extract'|1:\s*'extract'/, 'should map Ctrl+1 to extract tab');
  assert.doesNotMatch(js, /els\.cookieToggle/, 'should not reference removed cookieToggle');
});

test('index.html contains donate button and modal', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /class="side-btn donate-btn"/, 'sidebar should have donate button');
  assert.match(html, /id="donateModal"/, 'should have donate modal');
  assert.match(html, /id="donateQr"/, 'donate modal should have QR image');
  assert.match(html, /id="donateCopy"/, 'donate modal should have copy button');
  assert.match(html, /id="donateClose"/, 'donate modal should have close button');
  assert.doesNotMatch(html, /donate-account|donateAccount/, 'should not display the account number');
});

test('app.js opens vietqr donate modal and copies the momo account', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(
    js,
    /DONATE_QR_URL\s*=\s*'https:\/\/img\.vietqr\.io\/image\/MOMO-0856593899-compact\.png'/,
    'should define the vietqr momo QR url without account text',
  );
  assert.match(js, /function openDonateModal/, 'should define openDonateModal');
  assert.match(js, /function closeDonateModal/, 'should define closeDonateModal');
  assert.match(js, /els\.donateQr\.src\s*=\s*DONATE_QR_URL/, 'should set QR src lazily');
  assert.match(js, /navigator\.clipboard\.writeText\(DONATE_ACCOUNT\)/, 'copy button should copy the momo number');
  assert.match(js, /closeDonateModal\(\)/, 'Esc should be able to close the donate modal');
});

test('style.css defines donate button and qr styles', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.side-btn\s*\{/, 'should style the sidebar action buttons');
  assert.match(css, /\.donate-qr\s*\{/, 'should style the QR image');
});

test('button-styled links are not underlined', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.btn\s*\{[^}]*text-decoration:\s*none/, 'anchor buttons should drop the default underline');
});

test('sidebar offers joining the zalo group with a QR modal', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="zaloBtn"/, 'should have a zalo group button in the sidebar');
  assert.match(html, /id="zaloModal"/, 'should have a zalo modal');
  assert.match(html, /https:\/\/zalo\.me\/g\/sq0cjgbxtheqvuyaubcn/, 'should link to the zalo group');
  assert.match(html, /src="\/zalo-qr\.png"/, 'should show the group QR image');
  assert.ok(fs.existsSync(path.join(publicDir, 'zalo-qr.png')), 'QR image should exist in public');
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /function openZaloModal/, 'should define openZaloModal');
  assert.match(js, /function closeZaloModal/, 'should define closeZaloModal');
  assert.match(js, /navigator\.clipboard\.writeText\(ZALO_GROUP_URL\)/, 'should copy the group link');
  assert.match(js, /closeZaloModal\(\)/, 'Esc should be able to close the zalo modal');
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.sidebar-actions\s*\{/, 'should stack the sidebar action buttons');
  assert.match(css, /\.zalo-link\s*\{/, 'should style the group link line');
});

test('index.html contains legal notice modal with vietnam disclaimer', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="legalModal"/, 'should have legal modal');
  assert.match(html, /id="legalAccept"/, 'legal modal should have accept button');
  assert.match(html, /pháp luật Việt Nam/, 'should mention Vietnamese law');
  assert.match(html, /class="legal-list"/, 'should structure the terms as a list');
  assert.match(html, /bản quyền/i, 'should mention copyright');
  assert.match(html, /mục đích thương mại/, 'should mention commercial use');
  assert.match(html, /xâm phạm quyền riêng tư/, 'should mention privacy violations');
});

test('legal modal is structured as a scannable commitment sheet', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /class="legal-head"/, 'should have a header block');
  assert.match(html, /class="legal-item-icon"/, 'each term should carry its own icon');
  assert.match(html, /class="legal-actions"/, 'should have a footer action area');
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.legal-head\s*\{/, 'should style the legal header');
  assert.match(css, /\.legal-item-icon\s*\{/, 'should style the per-term icons');
  assert.match(css, /\.legal-actions\s*\{/, 'should style the footer action area');
});

test('app.js shows the legal notice once and stores acceptance', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /douyin-legal-accepted/, 'should define a storage key');
  assert.match(js, /function initLegalNotice/, 'should define initLegalNotice');
  assert.match(js, /initLegalNotice\(\)/, 'should call initLegalNotice on startup');
});

test('donate modal shows a loading state until the QR image loads', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="donateQrLoading"/, 'should have QR loading indicator');
  assert.match(html, /id="donateQrError"/, 'should have QR error message');
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /els\.donateQr\.addEventListener\('load'/, 'should hide loading when QR loads');
  assert.match(js, /els\.donateQr\.addEventListener\('error'/, 'should show error when QR fails');
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.donate-qr-loading\s*\{/, 'should style the QR loading state');
  assert.match(css, /\.donate-qr-error\s*\{/, 'should style the QR error state');
});

test('index.html adds a profile channel tab with its own section', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="tabProfile"[^>]*class="nav-btn/, 'tabProfile should be a sidebar nav button');
  assert.match(html, /id="profileSection"/, 'should have profileSection view');
  assert.match(html, /id="profileInput"/, 'should have profileInput textarea');
  assert.match(html, /id="profilePasteBtn"/, 'should have paste button');
  assert.match(html, /id="profileFetchBtn"/, 'should have fetch button');
  assert.match(html, /id="profileFetchIdleIcon"/, 'should have fetch idle icon');
  assert.match(html, /id="profileFetchLoadingIcon"/, 'should have fetch loading icon');
  assert.match(html, /id="profileCard"/, 'should have channel info card');
  assert.match(html, /id="profileAvatar"/, 'should have channel avatar');
  assert.match(html, /id="profileName"/, 'should have channel name');
  assert.match(html, /id="profileStats"/, 'should have channel stats');
  assert.match(html, /id="profileCheckAll"/, 'should have select-all checkbox');
  assert.match(html, /id="profileSummary"/, 'should have summary line');
  assert.match(html, /id="profileDownloadSelected"/, 'should have download selected button');
  assert.match(html, /id="profileDownloadAll"/, 'should have download all button');
  assert.match(html, /id="profileItems"/, 'should have profile items container');
  assert.match(html, /id="profileLoadMore"/, 'should have load-more button');
  assert.match(html, /id="imageItemTemplate"/, 'should have image post template');
  assert.match(html, /Ảnh - không hỗ trợ/, 'image posts should be labelled unsupported');
  assert.match(html, /Ctrl\+1·2·3·4/, 'sidebar shortcut hint should mention four tabs');
});

test('style.css styles the profile card and unsupported image rows', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /\.profile-card\s*\{/, 'should style the channel card');
  assert.match(css, /\.profile-avatar\s*\{/, 'should style the channel avatar');
  assert.match(css, /\.profile-card-text\s*\{/, 'should style the channel text block');
  assert.match(css, /\.item-unsupported\s*\{/, 'should style unsupported image rows');
  assert.match(css, /\.item-unsupported-badge\s*\{/, 'should style the unsupported badge');
});

test('app.js wires the profile tab and bulk download flow', () => {
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /tabProfile:\s*document\.getElementById\('tabProfile'\)/, 'should register tabProfile in els');
  assert.match(js, /profileSection:\s*document\.getElementById\('profileSection'\)/, 'should register profileSection in els');
  assert.match(js, /profileInput:\s*document\.getElementById\('profileInput'\)/, 'should register profileInput in els');
  assert.match(js, /profileItems:\s*document\.getElementById\('profileItems'\)/, 'should register profileItems in els');
  assert.match(js, /imageItemTemplate:\s*document\.getElementById\('imageItemTemplate'\)/, 'should register imageItemTemplate in els');
  assert.match(js, /const TABS = \['extract', 'profile', 'queue', 'cookie'\]/, 'TABS should include profile');
  assert.match(js, /'2':\s*'profile'/, 'Ctrl+2 should open the profile tab');
  assert.match(js, /function fetchProfile/, 'should define fetchProfile');
  assert.match(js, /function renderImagePost/, 'should define renderImagePost');
  assert.match(js, /function updateProfileSelection/, 'should define updateProfileSelection');
  assert.match(js, /function downloadProfileBatch/, 'should define downloadProfileBatch');
  assert.match(js, /const PROFILE_CONCURRENCY = 3/, 'bulk downloads should use a worker pool of 3');
  assert.match(js, /subdir: profileState\.nickname/, 'profile downloads should pass the channel subdir');
  assert.match(js, /function requestDownload[\s\S]*?item\.subdir/, 'requestDownload should forward item.subdir');
  assert.match(js, /function renderItem\(preview, index, opts = \{\}\)/, 'renderItem should accept opts');
  assert.match(js, /setTab\('profile'\)/, 'should allow switching to profile tab');
});

test('item card shows like count with a thumbs-up icon', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /class="item-likes/, 'itemTemplate should have a likes row');
  assert.match(html, /data-lucide="thumbs-up"/, 'likes row should use the thumbs-up icon');
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /likes:\s*node\.querySelector\('\.item-likes'\)/, 'renderItem should register the likes row');
  assert.match(js, /formatCount\(preview\.likeCount\)/, 'renderItem should format the like count');
});

test('adds a compact view mode for video lists in both tabs', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="viewCompactBtn"/, 'extract tab should have a compact toggle');
  assert.match(html, /id="profileViewCompactBtn"/, 'profile tab should have a compact toggle');
  assert.match(html, /id="viewCompactBtn"[^>]*data-view="compact"|data-view="compact"[^>]*id="viewCompactBtn"/, 'compact button should carry data-view');
  assert.match(html, /data-lucide="rows-3"/, 'compact toggle should use the rows-3 icon');
  assert.match(html, /id="profileViewListBtn"/, 'profile tab should have a list toggle');
  assert.match(html, /id="profileViewGridBtn"/, 'profile tab should have a grid toggle');

  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /#items\.view-compact \.item-main/, 'should style the compact item layout');
  assert.match(css, /#profileItems\.view-compact/, 'compact mode should cover the profile list');
  assert.match(
    css,
    /#items\.view-compact \.meta h2[\s\S]*?text-overflow:\s*ellipsis/,
    'compact title should be one line with ellipsis',
  );

  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /viewCompactBtn:\s*document\.getElementById\('viewCompactBtn'\)/, 'should register viewCompactBtn in els');
  assert.match(js, /profileViewCompactBtn:\s*document\.getElementById\('profileViewCompactBtn'\)/, 'should register profileViewCompactBtn in els');
  assert.match(js, /VIEW_MODES = \['list', 'grid', 'compact'\]/, 'should define supported view modes');
  assert.match(js, /setViewMode\('compact'\)/, 'should wire the compact toggle');
  assert.match(js, /dataset\.view === currentViewMode/, 'should sync active state via data-view');
});

test('adds pause-all and resume-all controls to every download tab', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="pauseAllBtn"/, 'extract tab should have pause-all');
  assert.match(html, /id="resumeAllBtn"/, 'extract tab should have resume-all');
  assert.match(html, /id="profilePauseAllBtn"/, 'profile tab should have pause-all');
  assert.match(html, /id="profileResumeAllBtn"/, 'profile tab should have resume-all');

  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /pauseAllBtn:\s*document\.getElementById\('pauseAllBtn'\)/, 'should register pauseAllBtn in els');
  assert.match(js, /profilePauseAllBtn:\s*document\.getElementById\('profilePauseAllBtn'\)/, 'should register profilePauseAllBtn in els');
  assert.match(js, /function updateExtractPauseButtons/, 'should define updateExtractPauseButtons');
  assert.match(js, /function updateProfilePauseButtons/, 'should define updateProfilePauseButtons');
  assert.match(js, /function pauseAllExtract/, 'should define pauseAllExtract');
  assert.match(js, /function resumeAllExtract/, 'should define resumeAllExtract');
  assert.match(js, /function pauseAllProfile/, 'should define pauseAllProfile');
  assert.match(js, /function resumeAllProfile/, 'should define resumeAllProfile');
  assert.match(js, /pausedAll: false/, 'profile state should track pausedAll');
  assert.match(js, /if \(profileState\.pausedAll\) break;/, 'profile workers should stop when paused');
  assert.match(js, /let queuePausedAll = false/, 'queue should track pausedAll');
  assert.match(js, /if \(queuePausedAll\) break;/, 'queue workers should stop when paused');
  assert.match(js, /queuePausedAll = true/, 'queue pause-all should set the flag');
  assert.match(js, /onStateChange/, 'renderItem should support onStateChange updates');
});

test('profile list header stays hidden until the channel list is loaded', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="profileListHead" class="list-head hidden"/, 'profile list head should start hidden');
  assert.match(html, /id="profileLoadMoreRow" class="row actions hidden"/, 'load-more row should start hidden');
  const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.match(js, /profileListHead:\s*document\.getElementById\('profileListHead'\)/, 'should register profileListHead in els');
  assert.match(
    js,
    /els\.profileListHead\?\.classList\.toggle\('hidden', profileItems\.length === 0\)/,
    'profile list head should hide when the list is empty',
  );
  assert.match(
    js,
    /els\.profileLoadMoreRow\?\.classList\.toggle\('hidden', profileItems\.length === 0\)/,
    'load-more row should hide when the list is empty',
  );
});

test('grid view mode also lays out the profile channel list', () => {
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  assert.match(css, /#items\.view-grid,\s*#profileItems\.view-grid\s*\{/, 'grid container should cover the profile list');
  assert.match(css, /#items\.view-grid \.item-main,\s*#profileItems\.view-grid \.item-main\s*\{/, 'grid item-main should cover the profile list');
  assert.match(css, /#items\.view-grid \.meta h2,\s*#profileItems\.view-grid \.meta h2\s*\{/, 'grid title clamp should cover the profile list');
  assert.match(css, /#items\.view-grid \.actions \.btn,\s*#profileItems\.view-grid \.actions \.btn\s*\{/, 'grid action buttons should cover the profile list');
  assert.match(
    css,
    /#items\.view-grid,\s*#profileItems\.view-grid\s*\{\s*grid-template-columns:\s*1fr;/,
    'narrow-screen single column grid should cover the profile list',
  );
});

