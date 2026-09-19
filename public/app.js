const els = {
  input: document.getElementById('input'),
  pasteBtn: document.getElementById('pasteBtn'),
  extractBtn: document.getElementById('extractBtn'),
  extractBtnText: document.getElementById('extractBtnText'),
  extractIdleIcon: document.getElementById('extractIdleIcon'),
  extractLoadingIcon: document.getElementById('extractLoadingIcon'),
  error: document.getElementById('error'),
  errorText: document.getElementById('errorText'),
  errorClose: document.getElementById('errorClose'),
  inputCard: document.getElementById('inputCard'),
  listSection: document.getElementById('listSection'),
  listSummary: document.getElementById('listSummary'),
  extractCheckAllLabel: document.getElementById('extractCheckAllLabel'),
  extractCheckAll: document.getElementById('extractCheckAll'),
  downloadSelectedBtn: document.getElementById('downloadSelectedBtn'),
  downloadSelectedIdleIcon: document.getElementById('downloadSelectedIdleIcon'),
  downloadSelectedLoadingIcon: document.getElementById('downloadSelectedLoadingIcon'),
  downloadSelectedText: document.getElementById('downloadSelectedText'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
  downloadAllIdleIcon: document.getElementById('downloadAllIdleIcon'),
  downloadAllLoadingIcon: document.getElementById('downloadAllLoadingIcon'),
  downloadAllText: document.getElementById('downloadAllText'),
  pauseAllBtn: document.getElementById('pauseAllBtn'),
  resumeAllBtn: document.getElementById('resumeAllBtn'),
  items: document.getElementById('items'),
  viewListBtn: document.getElementById('viewListBtn'),
  viewGridBtn: document.getElementById('viewGridBtn'),
  viewCompactBtn: document.getElementById('viewCompactBtn'),
  itemTemplate: document.getElementById('itemTemplate'),
  conflictModal: document.getElementById('conflictModal'),
  conflictText: document.getElementById('conflictText'),
  conflictRename: document.getElementById('conflictRename'),
  conflictOverwrite: document.getElementById('conflictOverwrite'),
  conflictCancel: document.getElementById('conflictCancel'),
  conflictApplyAll: document.getElementById('conflictApplyAll'),
  cookiePanel: document.getElementById('cookiePanel'),
  cookieStatus: document.getElementById('cookieStatus'),
  cookieDetail: document.getElementById('cookieDetail'),
  cookieInput: document.getElementById('cookieInput'),
  cookieSave: document.getElementById('cookieSave'),
  cookieSaveText: document.getElementById('cookieSaveText'),
  cookieSaveIdleIcon: document.getElementById('cookieSaveIdleIcon'),
  cookieSaveLoadingIcon: document.getElementById('cookieSaveLoadingIcon'),
  cookieClear: document.getElementById('cookieClear'),
  cookieCheck: document.getElementById('cookieCheck'),
  accountModal: document.getElementById('accountModal'),
  accountLoading: document.getElementById('accountLoading'),
  accountError: document.getElementById('accountError'),
  accountErrorText: document.getElementById('accountErrorText'),
  accountBody: document.getElementById('accountBody'),
  accountAvatar: document.getElementById('accountAvatar'),
  accountNickname: document.getElementById('accountNickname'),
  accountUniqueId: document.getElementById('accountUniqueId'),
  accountSignature: document.getElementById('accountSignature'),
  accountFollowers: document.getElementById('accountFollowers'),
  accountFollowing: document.getElementById('accountFollowing'),
  accountAwemes: document.getElementById('accountAwemes'),
  accountLikes: document.getElementById('accountLikes'),
  accountUid: document.getElementById('accountUid'),
  accountClose: document.getElementById('accountClose'),
  accountErrorClose: document.getElementById('accountErrorClose'),
  donateBtn: document.getElementById('donateBtn'),
  donateModal: document.getElementById('donateModal'),
  donateQr: document.getElementById('donateQr'),
  donateQrLoading: document.getElementById('donateQrLoading'),
  donateQrError: document.getElementById('donateQrError'),
  donateCopy: document.getElementById('donateCopy'),
  donateCopyText: document.getElementById('donateCopyText'),
  donateClose: document.getElementById('donateClose'),
  donateCloseBtn: document.getElementById('donateCloseBtn'),
  zaloBtn: document.getElementById('zaloBtn'),
  zaloModal: document.getElementById('zaloModal'),
  zaloQr: document.getElementById('zaloQr'),
  zaloCopy: document.getElementById('zaloCopy'),
  zaloCopyText: document.getElementById('zaloCopyText'),
  zaloClose: document.getElementById('zaloClose'),
  legalModal: document.getElementById('legalModal'),
  legalAccept: document.getElementById('legalAccept'),
  queueAddBtn: document.getElementById('queueAddBtn'),
  queueSection: document.getElementById('queueSection'),
  queueCount: document.getElementById('queueCount'),
  queueSummary: document.getElementById('queueSummary'),
  queueList: document.getElementById('queueList'),
  queueItemTemplate: document.getElementById('queueItemTemplate'),
  queueCheckAll: document.getElementById('queueCheckAll'),
  queueCheckAllLabel: document.getElementById('queueCheckAllLabel'),
  queueHeadActions: document.getElementById('queueHeadActions'),
  queueEmpty: document.getElementById('queueEmpty'),
  queueDownloadSelected: document.getElementById('queueDownloadSelected'),
  queueDownloadAll: document.getElementById('queueDownloadAll'),
  queuePauseAll: document.getElementById('queuePauseAll'),
  queueResumeAll: document.getElementById('queueResumeAll'),
  queueRemoveSelected: document.getElementById('queueRemoveSelected'),
  queueDlIdleIcon: document.getElementById('queueDlIdleIcon'),
  queueDlLoadingIcon: document.getElementById('queueDlLoadingIcon'),
  queueDlText: document.getElementById('queueDlText'),
  tabExtract: document.getElementById('tabExtract'),
  tabQueue: document.getElementById('tabQueue'),
  tabQueueBadge: document.getElementById('tabQueueBadge'),
  navCookie: document.getElementById('navCookie'),
  inputHint: document.getElementById('inputHint'),
  tabProfile: document.getElementById('tabProfile'),
  profileSection: document.getElementById('profileSection'),
  profileInput: document.getElementById('profileInput'),
  profilePasteBtn: document.getElementById('profilePasteBtn'),
  profileFetchBtn: document.getElementById('profileFetchBtn'),
  profileFetchBtnText: document.getElementById('profileFetchBtnText'),
  profileCard: document.getElementById('profileCard'),
  profileAvatar: document.getElementById('profileAvatar'),
  profileName: document.getElementById('profileName'),
  profileStats: document.getElementById('profileStats'),
  profileCheckAll: document.getElementById('profileCheckAll'),
  profileCheckAllLabel: document.getElementById('profileCheckAllLabel'),
  profileSummary: document.getElementById('profileSummary'),
  profileDownloadSelected: document.getElementById('profileDownloadSelected'),
  profileDownloadSelectedText: document.getElementById('profileDownloadSelectedText'),
  profileDownloadAll: document.getElementById('profileDownloadAll'),
  profileItems: document.getElementById('profileItems'),
  profileLoadMore: document.getElementById('profileLoadMore'),
  profileListHead: document.getElementById('profileListHead'),
  profileLoadMoreRow: document.getElementById('profileLoadMoreRow'),
  imageItemTemplate: document.getElementById('imageItemTemplate'),
  profileViewListBtn: document.getElementById('profileViewListBtn'),
  profileViewGridBtn: document.getElementById('profileViewGridBtn'),
  profileViewCompactBtn: document.getElementById('profileViewCompactBtn'),
  profilePauseAllBtn: document.getElementById('profilePauseAllBtn'),
  profileResumeAllBtn: document.getElementById('profileResumeAllBtn'),
};

if (navigator.userAgent.includes('Electron')) {
  document.documentElement.classList.add('is-electron');
  if (navigator.userAgent.includes('Windows')) {
    document.documentElement.classList.add('is-win');
  }
}

const items = [];
let copyResetTimers = new WeakMap();

const VIEW_MODE_KEY = 'douyin-view-mode-v1';
const VIEW_MODES = ['list', 'grid', 'compact'];
let currentViewMode = 'list';

function setViewMode(mode) {
  currentViewMode = VIEW_MODES.includes(mode) ? mode : 'list';
  for (const container of [els.items, els.profileItems]) {
    if (!container) continue;
    for (const viewMode of VIEW_MODES) {
      container.classList.toggle(`view-${viewMode}`, currentViewMode === viewMode);
    }
  }
  for (const btn of document.querySelectorAll('.view-toggle-btn')) {
    const active = btn.dataset.view === currentViewMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  try {
    localStorage.setItem(VIEW_MODE_KEY, currentViewMode);
  } catch {}
}

function initViewMode() {
  let savedMode = 'list';
  try {
    savedMode = localStorage.getItem(VIEW_MODE_KEY) || 'list';
  } catch {}
  setViewMode(savedMode);
}

function renderIcons(root = document) {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ icons: window.lucide.icons, root });
  }
}

function showError(message) {
  els.errorText.textContent = message;
  els.error.classList.remove('hidden');
}

function clearError() {
  els.error.classList.add('hidden');
}

function setLoading(prefix, loading) {
  const idle = document.getElementById(`${prefix}IdleIcon`);
  const spinner = document.getElementById(`${prefix}LoadingIcon`);
  idle?.classList.toggle('hidden', loading);
  spinner?.classList.toggle('hidden', !loading);
}

function formatDuration(ms) {
  if (!ms) return '';
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return `${minutes}:${seconds}`;
}

function formatBytes(value) {
  if (value == null) return '?';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function baseName(filePath) {
  const parts = String(filePath).split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error?.message || 'Có lỗi xảy ra');
    error.code = data?.error?.code;
    error.fileName = data?.error?.fileName;
    throw error;
  }
  return data;
}

const conflictQueue = [];
let conflictBatchChoice = null;

function askConflict(fileName) {
  if (conflictBatchChoice) {
    return Promise.resolve(conflictBatchChoice);
  }
  return new Promise((resolve) => {
    conflictQueue.push({ fileName, resolve });
    if (conflictQueue.length === 1) {
      showNextConflict();
    }
  });
}

function showNextConflict() {
  if (conflictQueue.length === 0) {
    els.conflictModal.classList.add('hidden');
    return;
  }
  const current = conflictQueue[0];
  els.conflictText.textContent = `"${current.fileName}" đã có trong thư mục downloads. Bạn muốn ghi đè file cũ hay tạo tên mới?`;
  if (els.conflictApplyAll) {
    els.conflictApplyAll.checked = false;
  }
  els.conflictModal.classList.remove('hidden');
  els.conflictRename.focus();
}

function closeConflict(choice) {
  if (conflictQueue.length === 0) {
    els.conflictModal.classList.add('hidden');
    return;
  }
  const applyAll = !!els.conflictApplyAll?.checked;
  if (applyAll) {
    conflictBatchChoice = choice;
    const remaining = conflictQueue.slice();
    conflictQueue.length = 0;
    els.conflictModal.classList.add('hidden');
    for (const item of remaining) {
      item.resolve(choice);
    }
  } else {
    const current = conflictQueue.shift();
    if (conflictQueue.length === 0) {
      els.conflictModal.classList.add('hidden');
    } else {
      showNextConflict();
    }
    current.resolve(choice);
  }
}

els.conflictRename.addEventListener('click', () => closeConflict('rename'));
els.conflictOverwrite.addEventListener('click', () => closeConflict('overwrite'));
els.conflictCancel.addEventListener('click', () => closeConflict('cancel'));
els.conflictModal.addEventListener('click', (event) => {
  if (event.target === els.conflictModal) closeConflict('cancel');
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
    const tabKeys = { '1': 'extract', '2': 'profile', '3': 'queue', '4': 'cookie' };
    if (tabKeys[event.key]) {
      event.preventDefault();
      setTab(tabKeys[event.key]);
      return;
    }
  }
  if (event.key !== 'Escape') return;
  if (conflictQueue.length > 0) closeConflict('cancel');
  else if (!els.accountModal.classList.contains('hidden')) closeAccountModal();
  else if (!els.zaloModal.classList.contains('hidden')) closeZaloModal();
  else if (!els.donateModal.classList.contains('hidden')) closeDonateModal();
});

function showItemError(item, message) {
  item.errorText.textContent = message;
  item.error.classList.remove('hidden');
}

function setItemBusy(item, busy) {
  item.dlIdle.classList.toggle('hidden', busy);
  item.dlLoading.classList.toggle('hidden', !busy);
  item.downloadBtn.disabled = busy;
  item.dlText.textContent = busy ? 'Đang tải...' : 'Tải video';
}

function watchJob(jobId, handlers = {}) {
  return new Promise((resolve) => {
    const source = new EventSource(`/api/progress/${jobId}`);
    handlers.onSource?.(source);
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      source.close();
      handlers.onSource?.(null);
      resolve(result);
    };
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'queued') {
        handlers.onQueued?.(data);
      } else if (data.status === 'downloading') {
        handlers.onProgress?.(data);
      } else if (data.status === 'paused') {
        handlers.onPaused?.(data);
        if (handlers.resolveOnPause && !resolved) {
          resolved = true;
          resolve({ ok: false, paused: true });
        }
      } else if (data.status === 'done') {
        handlers.onDone?.(data);
        finish({ ok: true });
      } else if (data.status === 'error') {
        handlers.onError?.(data.error);
        finish({ ok: false });
      }
    };
    source.onerror = () => {
      if (!resolved) finish({ ok: false, disconnected: true });
    };
  });
}

function requestDownload(item, conflictAction) {
  return postJson('/api/download', {
    awemeId: item.preview.awemeId,
    qualityIndex: Number(item.quality.value),
    ...(item.subdir ? { subdir: item.subdir } : {}),
    ...(conflictAction ? { conflictAction } : {}),
  });
}

function downloadItem(item) {
  if (item.busy) return item.busy;
  item.busy = (async () => {
    if (item.eventSource) {
      item.eventSource.close();
      item.eventSource = null;
    }
    item.error.classList.add('hidden');
    item.result.classList.add('hidden');
    item.progress.classList.remove('hidden');
    item.progressBar.style.width = '0%';
    item.progressText.textContent = 'Bắt đầu tải...';
    setItemBusy(item, true);
    try {
      let started;
      try {
        started = await requestDownload(item);
      } catch (err) {
        if (err.code !== 'FILE_EXISTS') throw err;
        item.progressText.textContent = 'Đang chờ bạn chọn cách xử lý file trùng...';
        const choice = await askConflict(err.fileName || item.preview.title);
        if (choice === 'cancel') {
          item.progress.classList.add('hidden');
          return { ok: false, cancelled: true };
        }
        item.progressText.textContent = 'Bắt đầu tải...';
        started = await requestDownload(item, choice);
      }
      item.jobId = started.jobId;
      item.isPaused = false;
      item.pauseBtn.classList.remove('hidden');
      item.pauseText.textContent = 'Tạm dừng';
      item.pauseIcon.innerHTML = '<i data-lucide="pause"></i>';
      renderIcons(item.pauseIcon);

      return await watchJob(started.jobId, {
        onSource: (source) => {
          item.eventSource = source;
        },
        onQueued: () => {
          item.progressText.textContent = 'Đang chờ trong hàng đợi...';
          item.onStateChange?.();
        },
        onProgress: (data) => {
          item.isPaused = false;
          item.pauseText.textContent = 'Tạm dừng';
          item.pauseIcon.innerHTML = '<i data-lucide="pause"></i>';
          renderIcons(item.pauseIcon);
          if (data.total) {
            const percent = Math.round((data.downloaded / data.total) * 100);
            item.progressBar.style.width = `${percent}%`;
            item.progressText.textContent = `${percent}% · ${formatBytes(data.downloaded)} / ${formatBytes(data.total)}`;
          } else {
            item.progressText.textContent = `Đã tải ${formatBytes(data.downloaded)}`;
          }
          item.onStateChange?.();
        },
        onPaused: (data) => {
          item.isPaused = true;
          item.pauseText.textContent = 'Tiếp tục';
          item.pauseIcon.innerHTML = '<i data-lucide="play"></i>';
          renderIcons(item.pauseIcon);
          if (data.total) {
            const percent = Math.round((data.downloaded / data.total) * 100);
            item.progressText.textContent = `Đã tạm dừng (${percent}% · ${formatBytes(data.downloaded)} / ${formatBytes(data.total)})`;
          } else {
            item.progressText.textContent = `Đã tạm dừng (${formatBytes(data.downloaded)})`;
          }
          item.onStateChange?.();
        },
        onDone: (data) => {
          item.progress.classList.add('hidden');
          item.resultName.textContent = baseName(data.path);
          item.resultPath.textContent = data.path;
          item.result.classList.remove('hidden');
          item.done = true;
          item.pauseBtn.classList.add('hidden');
          if (item.check) item.check.disabled = true;
          onSelection();
          item.onStateChange?.();
        },
        onError: (message) => {
          item.progress.classList.add('hidden');
          item.pauseBtn.classList.add('hidden');
          showItemError(item, message);
          item.onStateChange?.();
        },
      });
    } catch (err) {
      item.progress.classList.add('hidden');
      item.pauseBtn.classList.add('hidden');
      showItemError(item, err.message);
      return { ok: false };
    } finally {
      setItemBusy(item, false);
      item.busy = null;
      if (item.done || !item.isPaused) {
        item.pauseBtn.classList.add('hidden');
      }
    }
  })();
  return item.busy;
}

function updateExtractSelection(failedCount = 0) {
  const total = items.length;
  const selectable = items.filter((item) => !item.done);
  const selected = items.filter((item) => item.selected && !item.done);

  if (els.extractCheckAll) {
    els.extractCheckAll.checked = selectable.length > 0 && selected.length === selectable.length;
    els.extractCheckAll.indeterminate = selected.length > 0 && selected.length < selectable.length;
    els.extractCheckAll.disabled = selectable.length === 0;
  }
  if (els.extractCheckAllLabel) {
    els.extractCheckAllLabel.classList.toggle('hidden', total < 2);
  }
  if (els.downloadSelectedBtn) {
    els.downloadSelectedBtn.classList.toggle('hidden', total < 2);
    els.downloadSelectedBtn.disabled = selected.length === 0;
    if (els.downloadSelectedText) {
      els.downloadSelectedText.textContent = selected.length > 0
        ? `Tải mục đã chọn (${selected.length})`
        : 'Tải mục đã chọn';
    }
  }
  if (els.downloadAllBtn) {
    els.downloadAllBtn.classList.toggle('hidden', total < 2);
  }
  if (els.listSummary) {
    const parts = [`Đã nhận diện ${total} video`];
    if (total >= 2) {
      parts.push(`Đã chọn ${selected.length}`);
    }
    const doneCount = items.filter((item) => item.done).length;
    if (doneCount > 0) {
      parts.push(`Đã tải ${doneCount}`);
    }
    if (failedCount) {
      parts.push(`${failedCount} link lỗi`);
    }
    els.listSummary.textContent = parts.join(' · ');
  }
}

function updateExtractPauseButtons() {
  const active = items.some((item) => item.jobId && !item.done && !item.isPaused);
  const paused = items.some((item) => item.jobId && item.isPaused && !item.done);
  els.pauseAllBtn?.classList.toggle('hidden', !active);
  els.resumeAllBtn?.classList.toggle('hidden', !paused);
}

function pauseAllExtract() {
  for (const item of items) {
    if (item.jobId && !item.done && !item.isPaused) {
      postJson(`/api/download/${item.jobId}/pause`).catch(() => {});
    }
  }
}

function resumeAllExtract() {
  for (const item of items) {
    if (item.jobId && item.isPaused && !item.done) {
      postJson(`/api/download/${item.jobId}/resume`).catch(() => {});
    }
  }
}

function renderItem(preview, index, opts = {}) {
  const container = opts.container || els.items;
  const list = opts.list || items;
  const onSelection = opts.onSelection || updateExtractSelection;
  const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
  const item = {
    preview,
    subdir: opts.subdir || null,
    root: node,
    check: node.querySelector('.item-check'),
    selected: true,
    cover: node.querySelector('.item-cover'),
    title: node.querySelector('.item-title'),
    author: node.querySelector('.item-author'),
    duration: node.querySelector('.item-duration'),
    likes: node.querySelector('.item-likes'),
    quality: node.querySelector('.item-quality'),
    downloadBtn: node.querySelector('.item-download'),
    dlIdle: node.querySelector('.item-dl-idle'),
    dlLoading: node.querySelector('.item-dl-loading'),
    dlText: node.querySelector('.item-dl-text'),
    pauseBtn: node.querySelector('.item-pause'),
    pauseIcon: node.querySelector('.item-pause-icon'),
    pauseText: node.querySelector('.item-pause-text'),
    progress: node.querySelector('.item-progress'),
    progressBar: node.querySelector('.item-progress .progress-bar'),
    progressText: node.querySelector('.item-progress-text'),
    result: node.querySelector('.item-result'),
    resultName: node.querySelector('.item-result-name'),
    resultPath: node.querySelector('.item-result-path'),
    error: node.querySelector('.item-error'),
    errorText: node.querySelector('.item-error-text'),
    openBtn: node.querySelector('.item-open'),
    copyBtn: node.querySelector('.item-copy'),
    copyIdle: node.querySelector('.item-copy-idle'),
    copyDone: node.querySelector('.item-copy-done'),
    copyText: node.querySelector('.item-copy-text'),
    eventSource: null,
    busy: null,
    done: false,
    jobId: null,
    isPaused: false,
    onStateChange: opts.onStateChange || null,
  };

  if (item.check) {
    item.check.checked = true;
    item.root.dataset.selected = 'true';
    item.check.addEventListener('change', () => {
      item.selected = item.check.checked;
      item.root.dataset.selected = String(item.selected);
      onSelection();
    });
  }

  item.cover.style.display = preview.cover ? '' : 'none';
  if (preview.cover) item.cover.src = preview.cover;
  item.title.textContent = preview.title || '(không có tiêu đề)';
  item.author.classList.toggle('hidden', !preview.author);
  item.author.querySelector('span').textContent = preview.author || '';
  item.duration.classList.toggle('hidden', !preview.durationMs);
  item.duration.querySelector('span').textContent = preview.durationMs
    ? formatDuration(preview.durationMs)
    : '';
  const hasLikes = Number(preview.likeCount) > 0;
  if (item.likes) {
    item.likes.classList.toggle('hidden', !hasLikes);
    item.likes.querySelector('span').textContent = hasLikes
      ? `${formatCount(preview.likeCount)} lượt thích`
      : '';
  }
  const defaultQuality = getBestQualityIndex(preview);
  for (const q of preview.qualities) {
    const option = document.createElement('option');
    option.value = String(q.index);
    const mbps = q.bitrate ? ` · ${(q.bitrate / 1e6).toFixed(1)} Mbps` : '';
    const codecTag = q.codec === 'h265' ? ' (HEVC - Cần codec)' : ' (Tương thích cao)';
    option.textContent = `${q.label}${codecTag}${mbps}`;
    if (q.index === defaultQuality) {
      option.selected = true;
    }
    item.quality.appendChild(option);
  }

  item.downloadBtn.addEventListener('click', () => downloadItem(item));
  item.pauseBtn.addEventListener('click', async () => {
    if (!item.jobId) return;
    item.pauseBtn.disabled = true;
    try {
      if (item.isPaused) {
        await postJson(`/api/download/${item.jobId}/resume`);
        item.isPaused = false;
        item.pauseText.textContent = 'Tạm dừng';
        item.pauseIcon.innerHTML = '<i data-lucide="pause"></i>';
        renderIcons(item.pauseIcon);
        item.progressText.textContent = 'Đang tiếp tục tải...';
      } else {
        await postJson(`/api/download/${item.jobId}/pause`);
        item.isPaused = true;
        item.pauseText.textContent = 'Tiếp tục';
        item.pauseIcon.innerHTML = '<i data-lucide="play"></i>';
        renderIcons(item.pauseIcon);
        item.progressText.textContent = 'Đang tạm dừng...';
      }
    } catch (err) {
      showItemError(item, err.message);
    } finally {
      item.pauseBtn.disabled = false;
      item.onStateChange?.();
    }
  });
  item.openBtn.addEventListener('click', async () => {
    const target = item.resultPath.textContent;
    if (!target) return;
    try {
      await fetch(`/api/open-folder?path=${encodeURIComponent(target)}`);
    } catch {
      showItemError(item, 'Không mở được thư mục.');
    }
  });
  item.copyBtn.addEventListener('click', async () => {
    const target = item.resultPath.textContent;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      item.copyIdle.classList.add('hidden');
      item.copyDone.classList.remove('hidden');
      item.copyText.textContent = 'Đã copy';
      clearTimeout(copyResetTimers.get(item.copyBtn));
      copyResetTimers.set(
        item.copyBtn,
        setTimeout(() => {
          item.copyIdle.classList.remove('hidden');
          item.copyDone.classList.add('hidden');
          item.copyText.textContent = 'Copy đường dẫn';
        }, 1500),
      );
    } catch {
      showItemError(item, 'Không copy được đường dẫn.');
    }
  });

  container.appendChild(node);
  renderIcons(node);
  list.push(item);
  return item;
}

async function extract() {
  clearError();
  for (const item of items) item.eventSource?.close();
  items.length = 0;
  els.items.innerHTML = '';
  els.listSection.classList.add('hidden');
  const text = els.input.value.trim();
  if (!text) return showError('Vui lòng dán link hoặc text share Douyin.');
  els.extractBtn.disabled = true;
  els.pasteBtn.disabled = true;
  els.extractBtnText.textContent = 'Đang lấy thông tin...';
  setLoading('extract', true);
  try {
    const data = await postJson('/api/extract', { text });
    for (const preview of data.items) {
      renderItem(preview, items.length, { onStateChange: updateExtractPauseButtons });
    }
    const failedCount = data.errors?.length || 0;
    updateExtractSelection(failedCount);
    els.listSection.classList.remove('hidden');
    if (failedCount) {
      showError(data.errors.map((e) => e.message).join(' '));
    }
  } catch (err) {
    showError(err.message);
  } finally {
    els.extractBtn.disabled = false;
    els.pasteBtn.disabled = false;
    els.extractBtnText.textContent = 'Lấy thông tin';
    setLoading('extract', false);
  }
}

els.extractBtn.addEventListener('click', extract);

let warmedUp = false;
function triggerWarmup() {
  if (warmedUp) return;
  warmedUp = true;
  postJson('/api/warmup', {}).catch(() => {});
}

els.input.addEventListener('focus', triggerWarmup);
els.input.addEventListener('input', triggerWarmup);
setTimeout(triggerWarmup, 1000);

els.pasteBtn.addEventListener('click', async () => {
  triggerWarmup();
  clearError();
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return showError('Clipboard đang trống.');
    els.input.value = text;
    els.input.focus();
  } catch {
    showError('Không đọc được clipboard. Hãy dán bằng Ctrl+V.');
  }
});

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (currentTab === 'queue') els.queueAddBtn.click();
    else extract();
  }
});

/* ===== Tab Tải kênh (profile) ===== */
const profileItems = [];
const profileImagePosts = [];
const profileState = {
  secUid: null,
  cursor: 0,
  hasMore: false,
  nickname: '',
  loading: false,
  processing: false,
  pausedAll: false,
  seenIds: new Set(),
};
const PROFILE_CONCURRENCY = 3;

function renderProfileCard(profile) {
  els.profileCard.classList.remove('hidden');
  els.profileAvatar.style.display = profile.avatar ? '' : 'none';
  if (profile.avatar) els.profileAvatar.src = profile.avatar;
  els.profileName.textContent = profile.nickname || '(kênh)';
  const parts = [];
  if (profile.awemeCount != null) parts.push(`${formatCount(profile.awemeCount)} video`);
  if (profile.followerCount != null) parts.push(`${formatCount(profile.followerCount)} follower`);
  els.profileStats.textContent = parts.join(' · ');
}

function renderImagePost(post) {
  const node = els.imageItemTemplate.content.firstElementChild.cloneNode(true);
  const cover = node.querySelector('.item-cover');
  cover.style.display = post.cover ? '' : 'none';
  if (post.cover) cover.src = post.cover;
  node.querySelector('.item-title').textContent = post.title || '(bài đăng ảnh)';
  const author = node.querySelector('.item-author');
  author.classList.add('hidden');
  els.profileItems.appendChild(node);
  renderIcons(node);
}

function updateProfileSelection() {
  const total = profileItems.length;
  els.profileListHead?.classList.toggle('hidden', profileItems.length === 0);
  els.profileLoadMoreRow?.classList.toggle('hidden', profileItems.length === 0);
  const selectable = profileItems.filter((item) => !item.done);
  const selected = selectable.filter((item) => item.selected);
  if (els.profileCheckAll) {
    els.profileCheckAll.checked = selectable.length > 0 && selected.length === selectable.length;
    els.profileCheckAll.indeterminate = selected.length > 0 && selected.length < selectable.length;
    els.profileCheckAll.disabled = selectable.length === 0;
  }
  els.profileCheckAllLabel?.classList.toggle('hidden', total < 2);
  els.profileDownloadSelected?.classList.toggle('hidden', total < 2);
  els.profileDownloadAll?.classList.toggle('hidden', total < 2);
  if (els.profileDownloadSelected) {
    els.profileDownloadSelected.disabled = profileState.processing || selected.length === 0;
  }
  if (els.profileDownloadAll) {
    els.profileDownloadAll.disabled = profileState.processing || selectable.length === 0;
  }
  if (els.profileDownloadSelectedText && !profileState.processing) {
    els.profileDownloadSelectedText.textContent =
      selected.length > 0 ? `Tải mục đã chọn (${selected.length})` : 'Tải mục đã chọn';
  }
  renderProfileSummary();
}

function renderProfileSummary() {
  if (!els.profileSummary) return;
  const total = profileItems.length;
  const skipped = profileImagePosts.length;
  const doneCount = profileItems.filter((item) => item.done).length;
  const parts = [`Đã lấy ${total} video`];
  if (skipped > 0) parts.push(`bỏ qua ${skipped} bài ảnh`);
  if (doneCount > 0) parts.push(`đã tải ${doneCount}`);
  els.profileSummary.textContent = parts.join(' · ');
  if (els.profileLoadMore) {
    els.profileLoadMore.classList.toggle('hidden', !profileState.hasMore);
    els.profileLoadMore.disabled = profileState.loading || profileState.processing;
  }
}

function updateProfilePauseButtons() {
  const active = profileItems.some((item) => item.jobId && !item.done && !item.isPaused);
  const paused = profileItems.some((item) => item.jobId && item.isPaused && !item.done);
  els.profilePauseAllBtn?.classList.toggle('hidden', !active);
  els.profileResumeAllBtn?.classList.toggle('hidden', !paused);
}

function pauseAllProfile() {
  profileState.pausedAll = true;
  for (const item of profileItems) {
    if (item.jobId && !item.done && !item.isPaused) {
      postJson(`/api/download/${item.jobId}/pause`).catch(() => {});
    }
  }
}

function resumeAllProfile() {
  profileState.pausedAll = false;
  for (const item of profileItems) {
    if (item.jobId && item.isPaused && !item.done) {
      postJson(`/api/download/${item.jobId}/resume`).catch(() => {});
    }
  }
}

async function fetchProfile({ more = false } = {}) {
  if (profileState.loading) return;
  const text = els.profileInput.value.trim();
  if (!more && !text) return showError('Vui lòng dán URL kênh Douyin.');
  if (more && (!profileState.hasMore || !profileState.secUid)) return;
  clearError();
  profileState.loading = true;
  els.profileFetchBtn.disabled = true;
  setLoading('profileFetch', true);
  els.profileFetchBtnText.textContent = more ? 'Đang lấy thêm...' : 'Đang lấy danh sách...';
  if (!more) {
    for (const item of profileItems) item.eventSource?.close();
    profileItems.length = 0;
    profileImagePosts.length = 0;
    profileState.seenIds.clear();
    profileState.secUid = null;
    profileState.cursor = 0;
    profileState.hasMore = false;
    profileState.nickname = '';
    els.profileItems.innerHTML = '';
    els.profileCard.classList.add('hidden');
    updateProfileSelection();
  }
  try {
    const body = more ? { secUid: profileState.secUid, cursor: profileState.cursor } : { text };
    const data = await postJson('/api/profile', body);
    profileState.secUid = data.secUid || profileState.secUid;
    if (data.profile) {
      profileState.nickname = data.profile.nickname || '';
      renderProfileCard(data.profile);
    }
    for (const preview of data.items || []) {
      if (profileState.seenIds.has(preview.awemeId)) continue;
      profileState.seenIds.add(preview.awemeId);
      renderItem(preview, profileItems.length, {
        container: els.profileItems,
        list: profileItems,
        onSelection: updateProfileSelection,
        onStateChange: updateProfilePauseButtons,
        subdir: profileState.nickname,
      });
    }
    for (const post of data.imagePosts || []) {
      if (profileState.seenIds.has(post.awemeId)) continue;
      profileState.seenIds.add(post.awemeId);
      profileImagePosts.push(post);
      renderImagePost(post);
    }
    profileState.cursor = data.cursor || 0;
    profileState.hasMore = !!data.hasMore;
    if (!more && !profileItems.length && !profileImagePosts.length) {
      showError('Kênh này chưa có video nào.');
    }
  } catch (err) {
    showError(err.message);
  } finally {
    profileState.loading = false;
    els.profileFetchBtn.disabled = false;
    setLoading('profileFetch', false);
    els.profileFetchBtnText.textContent = 'Lấy danh sách';
    updateProfileSelection();
  }
}

async function downloadProfileBatch(selectedOnly) {
  if (profileState.processing) return;
  const targets = profileItems.filter((item) => !item.done && (!selectedOnly || item.selected));
  if (targets.length === 0) {
    return showError('Chưa chọn video nào để tải.');
  }
  clearError();
  conflictBatchChoice = null;
  conflictQueue.length = 0;
  profileState.processing = true;
  els.profileDownloadSelected.disabled = true;
  els.profileDownloadAll.disabled = true;
  els.profileDownloadSelectedText.textContent = `Đang tải (${targets.length})...`;
  setLoading('profileDownloadSelected', true);
  try {
    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        if (profileState.pausedAll) break;
        const item = targets[cursor++];
        await downloadItem(item);
        updateProfileSelection();
      }
    }
    const workerCount = Math.min(targets.length, PROFILE_CONCURRENCY);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  } finally {
    conflictBatchChoice = null;
    profileState.processing = false;
    setLoading('profileDownloadSelected', false);
    updateProfileSelection();
  }
}

els.profileFetchBtn?.addEventListener('click', () => fetchProfile());
els.profileLoadMore?.addEventListener('click', () => fetchProfile({ more: true }));
els.profileDownloadSelected?.addEventListener('click', () => downloadProfileBatch(true));
els.profileDownloadAll?.addEventListener('click', () => downloadProfileBatch(false));
els.profilePauseAllBtn?.addEventListener('click', pauseAllProfile);
els.profileResumeAllBtn?.addEventListener('click', resumeAllProfile);
els.profilePasteBtn?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return showError('Clipboard đang trống.');
    els.profileInput.value = text;
    els.profileInput.focus();
  } catch {
    showError('Không đọc được clipboard. Hãy dán bằng Ctrl+V.');
  }
});
els.profileInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    fetchProfile();
  }
});
els.profileCheckAll?.addEventListener('change', () => {
  const checked = els.profileCheckAll.checked;
  for (const item of profileItems) {
    if (item.done) continue;
    item.selected = checked;
    if (item.check) item.check.checked = checked;
    item.root.dataset.selected = String(checked);
  }
  updateProfileSelection();
});

els.errorClose.addEventListener('click', clearError);

function renderCookieStatus(status) {
  els.cookieStatus.textContent = status.configured ? 'Đã lưu' : 'Chưa dùng';
  els.cookieStatus.classList.toggle('on', status.configured);
  if (els.cookieDetail) {
    els.cookieDetail.textContent = status.configured ? `Đang dùng · ${status.cookieCount} cookie` : '';
    els.cookieDetail.classList.toggle('hidden', !status.configured);
  }
  els.cookieClear.classList.toggle('hidden', !status.configured);
  els.cookieCheck.classList.toggle('hidden', !status.configured);
}

function formatCount(value) {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function closeAccountModal() {
  els.accountModal.classList.add('hidden');
}

function renderAccount(account) {
  els.accountAvatar.style.display = account.avatar ? '' : 'none';
  if (account.avatar) els.accountAvatar.src = account.avatar;
  els.accountNickname.textContent = account.nickname || '(không có tên)';
  els.accountUniqueId.textContent = account.uniqueId ? `@${account.uniqueId}` : '';
  els.accountSignature.textContent = account.signature || '';
  els.accountSignature.classList.toggle('hidden', !account.signature);
  els.accountFollowers.textContent = formatCount(account.followerCount);
  els.accountFollowing.textContent = formatCount(account.followingCount);
  els.accountAwemes.textContent = formatCount(account.awemeCount);
  els.accountLikes.textContent = formatCount(account.totalFavorited);
  els.accountUid.textContent = account.uid || '-';
}

async function checkAccount() {
  els.accountModal.classList.remove('hidden');
  els.accountLoading.classList.remove('hidden');
  els.accountError.classList.add('hidden');
  els.accountBody.classList.add('hidden');
  try {
    const res = await fetch('/api/cookie/account');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Có lỗi xảy ra');
    if (!data.loggedIn) {
      els.accountErrorText.textContent =
        'Cookie không hợp lệ hoặc đã hết hạn. Hãy lấy cookie mới từ douyin.com và lưu lại.';
      els.accountError.classList.remove('hidden');
    } else {
      renderAccount(data.account);
      els.accountBody.classList.remove('hidden');
    }
  } catch (err) {
    els.accountErrorText.textContent = err.message;
    els.accountError.classList.remove('hidden');
  } finally {
    els.accountLoading.classList.add('hidden');
  }
}

els.cookieCheck.addEventListener('click', checkAccount);
els.accountClose.addEventListener('click', closeAccountModal);
els.accountErrorClose.addEventListener('click', closeAccountModal);
els.accountModal.addEventListener('click', (event) => {
  if (event.target === els.accountModal) closeAccountModal();
});

const DONATE_QR_URL = 'https://img.vietqr.io/image/MOMO-0856593899-compact.png';
const DONATE_ACCOUNT = '0856593899';
let donateCopyTimer = null;

function openDonateModal() {
  if (!els.donateQrError.classList.contains('hidden')) {
    els.donateQrError.classList.add('hidden');
    els.donateQr.removeAttribute('src');
  }
  if (!els.donateQr.src) {
    els.donateQr.classList.add('hidden');
    els.donateQrLoading.classList.remove('hidden');
    els.donateQr.src = DONATE_QR_URL;
  }
  els.donateModal.classList.remove('hidden');
}

function closeDonateModal() {
  els.donateModal.classList.add('hidden');
}

els.donateQr.addEventListener('load', () => {
  els.donateQrLoading.classList.add('hidden');
  els.donateQrError.classList.add('hidden');
  els.donateQr.classList.remove('hidden');
});

els.donateQr.addEventListener('error', () => {
  els.donateQrLoading.classList.add('hidden');
  els.donateQr.classList.add('hidden');
  els.donateQrError.classList.remove('hidden');
});

els.donateBtn.addEventListener('click', openDonateModal);
els.donateClose.addEventListener('click', closeDonateModal);
els.donateCloseBtn.addEventListener('click', closeDonateModal);
els.donateModal.addEventListener('click', (event) => {
  if (event.target === els.donateModal) closeDonateModal();
});

els.donateCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(DONATE_ACCOUNT);
    els.donateCopyText.textContent = 'Đã copy';
    if (donateCopyTimer) clearTimeout(donateCopyTimer);
    donateCopyTimer = setTimeout(() => {
      els.donateCopyText.textContent = 'Copy số MoMo';
    }, 1500);
  } catch {
    showError(`Không copy được số tài khoản. Số MoMo: ${DONATE_ACCOUNT}`);
  }
});

const ZALO_GROUP_URL = 'https://zalo.me/g/sq0cjgbxtheqvuyaubcn';
let zaloCopyTimer = null;

function openZaloModal() {
  els.zaloModal.classList.remove('hidden');
}

function closeZaloModal() {
  els.zaloModal.classList.add('hidden');
}

els.zaloBtn.addEventListener('click', openZaloModal);
els.zaloClose.addEventListener('click', closeZaloModal);
els.zaloModal.addEventListener('click', (event) => {
  if (event.target === els.zaloModal) closeZaloModal();
});

els.zaloCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ZALO_GROUP_URL);
    els.zaloCopyText.textContent = 'Đã copy';
    if (zaloCopyTimer) clearTimeout(zaloCopyTimer);
    zaloCopyTimer = setTimeout(() => {
      els.zaloCopyText.textContent = 'Copy link';
    }, 1500);
  } catch {
    showError(`Không copy được link. Link nhóm: ${ZALO_GROUP_URL}`);
  }
});

const LEGAL_STORAGE_KEY = 'douyin-legal-accepted-v1';

function initLegalNotice() {
  let accepted = false;
  try {
    accepted = localStorage.getItem(LEGAL_STORAGE_KEY) === 'accepted';
  } catch {}
  if (!accepted) {
    els.legalModal.classList.remove('hidden');
    els.legalAccept.focus();
  }
}

els.legalAccept.addEventListener('click', () => {
  try {
    localStorage.setItem(LEGAL_STORAGE_KEY, 'accepted');
  } catch {}
  els.legalModal.classList.add('hidden');
});

async function loadCookieStatus() {
  try {
    const res = await fetch('/api/cookie');
    if (res.ok) renderCookieStatus(await res.json());
  } catch {}
}

els.cookieInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    els.cookieSave.click();
  }
});

els.cookieSave.addEventListener('click', async () => {
  const value = els.cookieInput.value.trim();
  if (!value) return showError('Vui lòng dán cookie trước khi lưu.');
  clearError();
  els.cookieSave.disabled = true;
  els.cookieSaveText.textContent = 'Đang lưu...';
  els.cookieSaveIdleIcon.classList.add('hidden');
  els.cookieSaveLoadingIcon.classList.remove('hidden');
  try {
    const status = await postJson('/api/cookie', { cookie: value });
    renderCookieStatus(status);
    els.cookieInput.value = '';
    els.cookieInput.placeholder = 'Đã lưu cookie. Dán cookie mới để thay thế.';
  } catch (err) {
    showError(err.message);
  } finally {
    els.cookieSave.disabled = false;
    els.cookieSaveText.textContent = 'Lưu cookie';
    els.cookieSaveIdleIcon.classList.remove('hidden');
    els.cookieSaveLoadingIcon.classList.add('hidden');
  }
});

els.cookieClear.addEventListener('click', async () => {
  clearError();
  try {
    const res = await fetch('/api/cookie', { method: 'DELETE' });
    if (!res.ok) throw new Error('Không xóa được cookie.');
    renderCookieStatus(await res.json());
    els.cookieInput.placeholder = 'sessionid=...; ttwid=... hoặc đoạn Copy as cURL';
  } catch (err) {
    showError(err.message);
  }
});

loadCookieStatus();

const QUEUE_STORAGE_KEY = 'douyin-queue-v1';
const queueItems = [];
let queueProcessing = false;
let queuePausedAll = false;
let queueMessageTimer = null;

const QUEUE_STATUS_LABEL = {
  pending: 'Chờ tải',
  extracting: 'Đang lấy thông tin',
  downloading: 'Đang tải',
  paused: 'Tạm dừng',
  done: 'Đã tải',
  error: 'Lỗi',
};

function saveQueueToStorage() {
  try {
    const data = queueItems.map((item) => ({
      url: item.url,
      title: item.title || '',
      status: ['done', 'error', 'pending', 'paused'].includes(item.status) ? item.status : 'pending',
      note: item.status === 'done' || item.status === 'error' || item.status === 'paused' ? item.note || '' : '',
    }));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function updateQueueSummary() {
  const total = queueItems.length;
  const done = queueItems.filter((item) => item.status === 'done').length;
  const errors = queueItems.filter((item) => item.status === 'error').length;
  const paused = queueItems.filter((item) => item.status === 'paused').length;
  const active = queueItems.filter(
    (item) => item.status === 'extracting' || item.status === 'downloading',
  ).length;
  els.queueCount.textContent = String(total);
  if (els.tabQueueBadge) {
    els.tabQueueBadge.textContent = String(total);
    els.tabQueueBadge.classList.toggle('hidden', total === 0);
  }
  const parts = [`${total} mục`, `${done} đã tải`];
  if (active) parts.push(`${active} đang chạy`);
  if (paused) parts.push(`${paused} tạm dừng`);
  if (errors) parts.push(`${errors} lỗi`);
  els.queueSummary.textContent = total === 0 ? '' : parts.join(' · ');

  if (els.queuePauseAll) {
    els.queuePauseAll.classList.toggle('hidden', active === 0);
  }
  if (els.queueResumeAll) {
    els.queueResumeAll.classList.toggle('hidden', paused === 0);
  }
  updateTabVisibility();
}

function flashQueueMessage(text) {
  els.queueSummary.textContent = text;
  clearTimeout(queueMessageTimer);
  queueMessageTimer = setTimeout(updateQueueSummary, 3500);
}

function syncQueueCheckAll() {
  const selectable = queueItems.filter(
    (item) => item.status !== 'extracting' && item.status !== 'downloading',
  );
  const selected = selectable.filter((item) => item.selected);
  els.queueCheckAll.checked = selectable.length > 0 && selected.length === selectable.length;
  els.queueCheckAll.indeterminate = selected.length > 0 && selected.length < selectable.length;
}

function renderQueueItem(item) {
  const elements = item.elements;
  elements.root.dataset.status = item.status;
  elements.title.textContent = item.title || item.url;
  elements.badge.textContent = QUEUE_STATUS_LABEL[item.status] || item.status;
  elements.badge.className = 'badge queue-item-badge';
  if (item.status === 'done') elements.badge.classList.add('on');
  if (item.status === 'paused') elements.badge.classList.add('paused');
  if (item.status === 'error') elements.badge.classList.add('error');
  elements.note.textContent = item.note || '';
  elements.note.classList.toggle('hidden', !item.note);
  elements.check.checked = item.selected;
  elements.check.disabled = item.status === 'extracting' || item.status === 'downloading';
  elements.progress.classList.toggle('hidden', item.status !== 'downloading' && item.status !== 'paused');

  if (item.jobId && (item.status === 'downloading' || item.status === 'paused')) {
    elements.pauseBtn.classList.remove('hidden');
    elements.pauseBtn.setAttribute('title', item.status === 'paused' ? 'Tiếp tục tải' : 'Tạm dừng');
    elements.pauseBtn.innerHTML = item.status === 'paused' ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
    renderIcons(elements.pauseBtn);
  } else {
    elements.pauseBtn.classList.add('hidden');
  }
}

function addQueueItem(url, restored = {}) {
  const node = els.queueItemTemplate.content.firstElementChild.cloneNode(true);
  const item = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now() + Math.random()),
    url,
    title: restored.title || '',
    status: ['done', 'error', 'paused'].includes(restored.status) ? restored.status : 'pending',
    note: restored.note || '',
    selected: false,
    preview: null,
    jobId: null,
    eventSource: null,
    elements: {
      root: node,
      check: node.querySelector('.queue-item-check'),
      title: node.querySelector('.queue-item-title'),
      badge: node.querySelector('.queue-item-badge'),
      note: node.querySelector('.queue-item-note'),
      progress: node.querySelector('.queue-item-progress'),
      progressBar: node.querySelector('.queue-item-progress .progress-bar'),
      pauseBtn: node.querySelector('.queue-item-pause'),
      removeBtn: node.querySelector('.queue-item-remove'),
    },
  };
  item.elements.check.addEventListener('change', () => {
    item.selected = item.elements.check.checked;
    syncQueueCheckAll();
  });
  item.elements.pauseBtn?.addEventListener('click', async () => {
    if (!item.jobId) return;
    item.elements.pauseBtn.disabled = true;
    try {
      if (item.status === 'paused') {
        await postJson(`/api/download/${item.jobId}/resume`);
        item.status = 'downloading';
        item.note = 'Đang tiếp tục tải...';
        renderQueueItem(item);
        updateQueueSummary();
      } else if (item.status === 'downloading' || item.status === 'pending') {
        await postJson(`/api/download/${item.jobId}/pause`);
        item.status = 'paused';
        item.note = 'Đã tạm dừng';
        renderQueueItem(item);
        updateQueueSummary();
      }
    } catch (err) {
      flashQueueMessage(`Lỗi: ${err.message}`);
    } finally {
      item.elements.pauseBtn.disabled = false;
    }
  });
  item.elements.removeBtn.addEventListener('click', () => removeQueueItem(item));
  queueItems.push(item);
  els.queueList.appendChild(node);
  renderIcons(node);
  renderQueueItem(item);
  updateQueueSummary();
  return item;
}

function removeQueueItem(item) {
  if (item.status === 'extracting' || item.status === 'downloading') return;
  item.eventSource?.close();
  item.elements.root.remove();
  const index = queueItems.indexOf(item);
  if (index >= 0) queueItems.splice(index, 1);
  updateQueueSummary();
  syncQueueCheckAll();
  saveQueueToStorage();
}

function getBestQualityIndex(preview) {
  if (!preview?.qualities || preview.qualities.length === 0) return 0;
  // Ưu tiên chuẩn tương thích cao H.264 (AVC) để xem được trên 100% thiết bị Windows/Mac/di động mà không cần cài thêm codec
  const h264Index = preview.qualities.findIndex((q) => q.codec !== 'h265');
  return h264Index >= 0 ? h264Index : 0;
}

function startQueueDownload(item) {
  return (async () => {
    try {
      let started;
      const targetQualityIndex = getBestQualityIndex(item.preview);
      try {
        started = await postJson('/api/download', {
          awemeId: item.preview.awemeId,
          qualityIndex: targetQualityIndex,
        });
      } catch (err) {
        if (err.code !== 'FILE_EXISTS') throw err;
        item.note = 'Đang chờ bạn chọn cách xử lý file trùng...';
        renderQueueItem(item);
        const choice = await askConflict(err.fileName || item.preview.title);
        if (choice === 'cancel') {
          item.status = 'error';
          item.note = 'Đã hủy vì file đã tồn tại.';
          renderQueueItem(item);
          updateQueueSummary();
          return;
        }
        started = await postJson('/api/download', {
          awemeId: item.preview.awemeId,
          qualityIndex: targetQualityIndex,
          conflictAction: choice,
        });
      }
      item.jobId = started.jobId;
      item.status = 'downloading';
      item.note = 'Đang bắt đầu tải...';
      renderQueueItem(item);
      updateQueueSummary();
      await watchJob(started.jobId, {
        resolveOnPause: true,
        onSource: (source) => {
          item.eventSource = source;
        },
        onQueued: () => {
          item.note = 'Đang chờ luồng tải trống...';
          renderQueueItem(item);
        },
        onProgress: (data) => {
          item.status = 'downloading';
          const percent = data.total
            ? Math.round((data.downloaded / data.total) * 100)
            : null;
          item.note =
            percent != null
              ? `${percent}% · ${formatBytes(data.downloaded)} / ${formatBytes(data.total)}`
              : `Đã tải ${formatBytes(data.downloaded)}`;
          item.elements.progressBar.style.width = percent != null ? `${percent}%` : '0%';
          renderQueueItem(item);
          updateQueueSummary();
        },
        onPaused: (data) => {
          item.status = 'paused';
          const percent = data.total
            ? Math.round((data.downloaded / data.total) * 100)
            : null;
          item.note = `Đã tạm dừng (${percent != null ? percent + '%' : formatBytes(data.downloaded)})`;
          renderQueueItem(item);
          updateQueueSummary();
        },
        onDone: (data) => {
          item.status = 'done';
          item.note = baseName(data.path);
          item.selected = false;
          renderQueueItem(item);
          updateQueueSummary();
        },
        onError: (message) => {
          item.status = 'error';
          item.note = message;
          renderQueueItem(item);
          updateQueueSummary();
        },
      });
    } catch (err) {
      item.status = 'error';
      item.note = err.message;
      renderQueueItem(item);
      updateQueueSummary();
    }
  })();
}

async function processQueue(selectedOnly) {
  if (queueProcessing) return;
  const targets = queueItems.filter((item) => {
    if (selectedOnly && !item.selected) return false;
    return item.status === 'pending' || item.status === 'error' || item.status === 'paused';
  });
  if (targets.length === 0) {
    showError(
      selectedOnly
        ? 'Chưa chọn mục nào cần tải (hoặc mục đã tải xong).'
        : 'Không có mục nào cần tải.',
    );
    return;
  }
  clearError();
  conflictBatchChoice = null;
  conflictQueue.length = 0;
  queuePausedAll = false;
  queueProcessing = true;
  els.queueDownloadSelected.disabled = true;
  els.queueDownloadAll.disabled = true;
  els.queueDlIdleIcon.classList.add('hidden');
  els.queueDlLoadingIcon.classList.remove('hidden');
  els.queueDlText.textContent = selectedOnly ? 'Đang tải mục đã chọn...' : 'Đang tải tất cả...';
  try {
    for (const item of targets) {
      if (item.status === 'error') {
        item.preview = null;
      }
    }

    const QUEUE_CONCURRENCY = 2;
    let cursor = 0;

    async function queueWorker() {
      while (cursor < targets.length) {
        if (queuePausedAll) break;
        const item = targets[cursor++];
        if (!queueItems.includes(item)) continue;
        try {
          if (item.status === 'paused' && item.jobId) {
            await postJson(`/api/download/${item.jobId}/resume`);
            item.status = 'downloading';
            item.note = 'Đang tiếp tục tải...';
            renderQueueItem(item);
            updateQueueSummary();
            continue;
          }
          if (!item.preview) {
            item.status = 'extracting';
            item.note = 'Đang lấy thông tin...';
            renderQueueItem(item);
            updateQueueSummary();
            const data = await postJson('/api/extract', { text: item.url });
            const preview = data.items?.[0];
            if (!preview) {
              throw new Error(data.errors?.[0]?.message || 'Không lấy được thông tin video.');
            }
            item.preview = preview;
            item.title = preview.title || item.title;
            item.note = 'Đã có thông tin, đang chuẩn bị tải...';
            renderQueueItem(item);
          }
          if (queuePausedAll) {
            item.status = 'pending';
            item.note = 'Đã tạm dừng tất cả.';
            renderQueueItem(item);
            updateQueueSummary();
            break;
          }
          await startQueueDownload(item);
        } catch (err) {
          item.status = 'error';
          item.note = err.message;
          renderQueueItem(item);
          updateQueueSummary();
        }
      }
    }

    const workerCount = Math.min(targets.length, QUEUE_CONCURRENCY);
    const workers = [];
    for (let i = 0; i < workerCount; i++) {
      workers.push(queueWorker());
    }
    await Promise.all(workers);
  } finally {
    conflictBatchChoice = null;
    queueProcessing = false;
    els.queueDownloadSelected.disabled = false;
    els.queueDownloadAll.disabled = false;
    els.queueDlIdleIcon.classList.remove('hidden');
    els.queueDlLoadingIcon.classList.add('hidden');
    els.queueDlText.textContent = 'Tải mục đã chọn';
    updateQueueSummary();
    saveQueueToStorage();
  }
}

els.queueAddBtn.addEventListener('click', async () => {
  const text = els.input.value.trim();
  if (!text) return showError('Vui lòng dán link Douyin.');
  clearError();
  els.queueAddBtn.disabled = true;
  try {
    const { urls } = await postJson('/api/links/parse', { text });
    let added = 0;
    let skipped = 0;
    for (const url of urls) {
      if (queueItems.some((item) => item.url === url)) {
        skipped++;
        continue;
      }
      addQueueItem(url);
      added++;
    }
    saveQueueToStorage();
    if (added === 0) {
      showError('Tất cả link đã có trong hàng đợi.');
    } else if (skipped > 0) {
      flashQueueMessage(`Đã thêm ${added} link, bỏ qua ${skipped} link trùng.`);
    } else {
      flashQueueMessage(`Đã thêm ${added} link vào hàng đợi.`);
    }
  } catch (err) {
    showError(err.message);
  } finally {
    els.queueAddBtn.disabled = false;
  }
});

els.queueCheckAll.addEventListener('change', () => {
  const checked = els.queueCheckAll.checked;
  for (const item of queueItems) {
    if (item.status === 'extracting' || item.status === 'downloading') continue;
    item.selected = checked;
    renderQueueItem(item);
  }
  syncQueueCheckAll();
});

els.queueDownloadSelected.addEventListener('click', () => processQueue(true));
els.queueDownloadAll.addEventListener('click', () => processQueue(false));

els.queuePauseAll?.addEventListener('click', async () => {
  queuePausedAll = true;
  const activeItems = queueItems.filter((item) => item.jobId && item.status === 'downloading');
  for (const item of activeItems) {
    postJson(`/api/download/${item.jobId}/pause`).catch(() => {});
  }
});

els.queueResumeAll?.addEventListener('click', async () => {
  queuePausedAll = false;
  const pausedItems = queueItems.filter((item) => item.jobId && item.status === 'paused');
  for (const item of pausedItems) {
    postJson(`/api/download/${item.jobId}/resume`).catch(() => {});
  }
  if (!queueProcessing) {
    processQueue(false);
  }
});

els.queueRemoveSelected.addEventListener('click', () => {
  const selected = queueItems.filter((item) => item.selected);
  if (selected.length === 0) return showError('Chưa chọn mục nào để xóa.');
  for (const item of selected.slice()) removeQueueItem(item);
});

function restoreQueue() {
  try {
    const list = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    for (const entry of list) {
      if (entry?.url) addQueueItem(entry.url, entry);
    }
  } catch {}
  updateQueueSummary();
  syncQueueCheckAll();
}

els.extractCheckAll?.addEventListener('change', () => {
  const isChecked = els.extractCheckAll.checked;
  for (const item of items) {
    if (!item.done) {
      item.selected = isChecked;
      if (item.check) item.check.checked = isChecked;
      item.root.dataset.selected = String(isChecked);
    }
  }
  updateExtractSelection();
});

els.downloadSelectedBtn?.addEventListener('click', async () => {
  const targets = items.filter((item) => item.selected && !item.done);
  if (targets.length === 0) {
    return showError('Chưa chọn video nào để tải.');
  }
  clearError();
  conflictBatchChoice = null;
  conflictQueue.length = 0;
  els.downloadSelectedBtn.disabled = true;
  els.downloadAllBtn.disabled = true;
  setLoading('downloadSelected', true);
  els.downloadSelectedText.textContent = `Đang tải (${targets.length})...`;
  try {
    await Promise.all(targets.map((item) => downloadItem(item)));
  } finally {
    conflictBatchChoice = null;
    els.downloadSelectedBtn.disabled = false;
    els.downloadAllBtn.disabled = false;
    setLoading('downloadSelected', false);
    updateExtractSelection();
  }
});

els.downloadAllBtn.addEventListener('click', async () => {
  conflictBatchChoice = null;
  conflictQueue.length = 0;
  els.downloadAllBtn.disabled = true;
  if (els.downloadSelectedBtn) els.downloadSelectedBtn.disabled = true;
  els.downloadAllText.textContent = 'Đang tải tất cả...';
  setLoading('downloadAll', true);
  try {
    const pending = items.filter((item) => !item.done);
    await Promise.all(pending.map((item) => downloadItem(item)));
  } finally {
    conflictBatchChoice = null;
    els.downloadAllBtn.disabled = false;
    els.downloadAllText.textContent = 'Tải tất cả';
    setLoading('downloadAll', false);
    updateExtractSelection();
  }
});

els.pauseAllBtn?.addEventListener('click', pauseAllExtract);
els.resumeAllBtn?.addEventListener('click', resumeAllExtract);

const TAB_STORAGE_KEY = 'douyin-active-tab-v1';
const TABS = ['extract', 'profile', 'queue', 'cookie'];
let currentTab = 'extract';
try {
  const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
  if (TABS.includes(savedTab)) currentTab = savedTab;
} catch {}

function setTab(tab) {
  if (!TABS.includes(tab)) return;
  currentTab = tab;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {}
  clearError();
  updateTabVisibility();
}

function updateTabVisibility() {
  const isExtract = currentTab === 'extract';
  const isProfile = currentTab === 'profile';
  const isQueue = currentTab === 'queue';
  const isCookie = currentTab === 'cookie';

  for (const [el, active] of [
    [els.tabExtract, isExtract],
    [els.tabProfile, isProfile],
    [els.tabQueue, isQueue],
    [els.navCookie, isCookie],
  ]) {
    el?.classList.toggle('active', active);
    el?.setAttribute('aria-selected', String(active));
  }

  els.inputCard?.classList.toggle('hidden', isCookie || isProfile);
  els.extractBtn.classList.toggle('hidden', !isExtract);
  els.queueAddBtn.classList.toggle('hidden', !isQueue);
  els.cookiePanel?.classList.toggle('hidden', !isCookie);
  els.profileSection?.classList.toggle('hidden', !isProfile);
  els.listSection.classList.toggle('hidden', !isExtract || items.length === 0);
  els.queueSection.classList.toggle('hidden', !isQueue);

  if (isExtract) {
    els.input.placeholder = 'Dán link Douyin để lấy thông tin, xem trước và tải...';
    if (els.inputHint) {
      els.inputHint.textContent =
        'Hỗ trợ xem trước video, thông tin tác giả và chọn độ phân giải trước khi tải.';
    }
  } else if (isQueue) {
    els.input.placeholder = 'Dán một hoặc nhiều link Douyin vào đây để thêm vào hàng đợi...';
    if (els.inputHint) {
      els.inputHint.textContent =
        'Hàng đợi sẽ tự động tải các video theo cơ chế cuốn chiếu siêu nhanh mà không cần chờ.';
    }
    const total = queueItems.length;
    els.queueEmpty?.classList.toggle('hidden', total > 0);
    els.queueHeadActions?.classList.toggle('hidden', total === 0);
    els.queueCheckAllLabel?.classList.toggle('hidden', total === 0);
  }
}

els.tabExtract?.addEventListener('click', () => setTab('extract'));
els.tabProfile?.addEventListener('click', () => setTab('profile'));
els.tabQueue?.addEventListener('click', () => setTab('queue'));
els.navCookie?.addEventListener('click', () => setTab('cookie'));
els.viewListBtn?.addEventListener('click', () => setViewMode('list'));
els.viewGridBtn?.addEventListener('click', () => setViewMode('grid'));
els.viewCompactBtn?.addEventListener('click', () => setViewMode('compact'));
els.profileViewListBtn?.addEventListener('click', () => setViewMode('list'));
els.profileViewGridBtn?.addEventListener('click', () => setViewMode('grid'));
els.profileViewCompactBtn?.addEventListener('click', () => setViewMode('compact'));

restoreQueue();
updateTabVisibility();
initViewMode();
initLegalNotice();
renderIcons();
