const form = document.getElementById('download-form');
const input = document.getElementById('github-url');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const previewEl = document.getElementById('preview');
const progressCard = document.getElementById('progress-card');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const progressLabel = document.getElementById('progress-label');
const progressFiles = document.getElementById('progress-files');
const progressSize = document.getElementById('progress-size');
const treeBody = document.getElementById('tree-body');
const treeCount = document.getElementById('tree-count');
const treeTitle = document.getElementById('tree-title');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');

const debounce = (fn, ms) => {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
};

function setStatus(message, type = '') {
  statusText.textContent = message;
  statusEl.className = 'status ' + (message ? `active ${type}` : '');
}

function setProgress(percent, label, filesText = '', sizeText = '') {
  progressFill.style.width = percent + '%';
  progressPercent.textContent = Math.round(percent) + '%';
  if (label) progressLabel.textContent = label;
  if (filesText) progressFiles.textContent = filesText;
  if (sizeText) progressSize.textContent = sizeText;
}

function resetUI() {
  setStatus('');
  progressCard.classList.remove('active');
  previewEl.classList.remove('active');
  setProgress(0, 'Preparing download…', '0 of 0 files', '0 B');
  downloadBtn.disabled = false;
}

function clearAll() {
  input.value = '';
  resetUI();
  input.focus();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseGitHubUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 4) return null;

    const owner = parts[0];
    const repo = parts[1];
    const type = parts[2];
    const ref = parts[3];
    const path = parts.slice(4).join('/');

    if (type !== 'tree' && type !== 'blob') return null;

    return { owner, repo, type, ref, path };
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = response.status === 403
      ? 'GitHub API rate limit reached. Try again later or use a personal access token.'
      : `GitHub API error (${response.status})`;
    throw new Error(message);
  }
  return response.json();
}

async function fetchRawText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`);
  return response.text();
}

function originalBaseName(path, fallback) {
  const name = (path || '').split('/').filter(Boolean).pop();
  return name || fallback;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can make browsers save a generic/UUID name instead.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function updatePreview(parsed, repoInfo, items = []) {
  document.getElementById('repo-name').textContent = `${parsed.owner}/${parsed.repo}`;
  document.getElementById('repo-path').textContent = parsed.path || parsed.ref;

  const avatar = document.getElementById('repo-avatar');
  avatar.innerHTML = repoInfo?.owner?.avatar_url
    ? `<img src="${repoInfo.owner.avatar_url}" alt="" />`
    : '<div style="width:100%;height:100%;background:var(--accent);display:grid;place-items:center;color:white;font-weight:700;">' + parsed.owner[0].toUpperCase() + '</div>';

  const isFile = parsed.type === 'blob';
  const badge = document.getElementById('type-badge');
  badge.className = 'badge ' + (isFile ? 'badge-file' : 'badge-folder');
  badge.textContent = isFile ? 'File' : 'Folder';

  const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
  document.getElementById('file-count').innerHTML = `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> ${items.filter(i => i.type === 'blob' || i.mode === '100644' || i.mode === '100755').length} files`;
  document.getElementById('total-size').innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> ${formatBytes(totalSize)}`;

  previewEl.classList.add('active');

  if (!isFile) {
    treeBody.innerHTML = '';
    treeTitle.textContent = `Contents of /${parsed.path}`;
    treeCount.textContent = `${items.length} items`;

    items.slice(0, 50).forEach(item => {
      const isBlob = item.type === 'blob' || item.mode === '100644' || item.mode === '100755';
      const name = item.relativePath || item.path;
      const row = document.createElement('div');
      row.className = `tree-row ${isBlob ? 'file' : 'folder'}`;
      row.innerHTML = `
        ${isBlob
          ? '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'}
        <span class="file-name">${name}</span>
        <span class="file-size">${item.size ? formatBytes(item.size) : ''}</span>
      `;
      treeBody.appendChild(row);
    });

    if (items.length > 50) {
      const more = document.createElement('div');
      more.className = 'tree-row';
      more.style.color = 'var(--muted)';
      more.style.justifyContent = 'center';
      more.textContent = `+ ${items.length - 50} more files`;
      treeBody.appendChild(more);
    }

    treeBody.closest('.tree').style.display = items.length ? 'block' : 'none';
  } else {
    treeBody.closest('.tree').style.display = 'none';
  }
}

async function inspectUrl(url) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    previewEl.classList.remove('active');
    return;
  }

  try {
    const repoInfo = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);

    if (parsed.type === 'blob') {
      const fileInfo = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${parsed.path}?ref=${parsed.ref}`);
      updatePreview(parsed, repoInfo, [{ type: 'blob', relativePath: fileInfo.name, size: fileInfo.size }]);
    } else {
      const tree = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${parsed.ref}?recursive=1`);
      const prefix = parsed.path ? parsed.path + '/' : '';
      const items = tree.tree
        .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
        .map(item => ({
          relativePath: item.path.slice(prefix.length),
          size: item.size || 0,
          type: item.type,
          mode: item.mode,
        }));
      updatePreview(parsed, repoInfo, items);
    }
  } catch (error) {
    console.error(error);
    previewEl.classList.remove('active');
  }
}

async function downloadFile(parsed) {
  const { owner, repo, ref, path } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  const data = await fetchJson(apiUrl);

  if (Array.isArray(data)) {
    throw new Error('This URL points to a folder, not a file.');
  }

  progressCard.classList.add('active');
  setProgress(30, 'Fetching file…', '1 file', formatBytes(data.size));

  const response = await fetch(data.download_url);
  if (!response.ok) throw new Error(`Failed to download file (${response.status})`);

  const blob = await response.blob();
  const fileName = originalBaseName(path, data.name);
  setProgress(100, 'Saving file…', '1 file', formatBytes(blob.size));
  downloadBlob(blob, fileName);
  setStatus(`Downloaded ${fileName}`, 'success');
}

async function collectFiles(owner, repo, ref, pathPrefix) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const data = await fetchJson(apiUrl);

  if (!data.tree || !Array.isArray(data.tree)) {
    throw new Error('Unexpected GitHub API response.');
  }

  const prefix = pathPrefix ? pathPrefix + '/' : '';
  return data.tree
    .filter(item => item.type === 'blob' && item.path.startsWith(prefix))
    .map(item => ({
      relativePath: item.path.slice(prefix.length),
      sha: item.sha,
      size: item.size || 0,
    }));
}

async function downloadFolder(parsed) {
  const { owner, repo, ref, path } = parsed;
  const files = await collectFiles(owner, repo, ref, path);

  if (files.length === 0) {
    throw new Error('No files found at this path.');
  }

  const folderName = originalBaseName(path, repo);
  const zip = new JSZip();
  const total = files.length;
  let completed = 0;
  let totalBytes = 0;

  progressCard.classList.add('active');
  setProgress(0, 'Starting download…', `0 of ${total} files`, '0 B');

  const batchSize = 8;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    await Promise.all(batch.map(async (file) => {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}/${file.relativePath}`;
      const content = await fetchRawText(rawUrl);
      // Keep original folder name as the ZIP root directory.
      zip.file(`${folderName}/${file.relativePath}`, content);
      totalBytes += new Blob([content]).size;
      completed++;
      setProgress(
        Math.round((completed / total) * 100),
        `Downloading ${completed} of ${total} files…`,
        `${completed} of ${total} files`,
        formatBytes(totalBytes)
      );
    }));
  }

  setProgress(95, 'Creating ZIP archive…', `${total} files`, formatBytes(totalBytes));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });
  downloadBlob(blob, `${folderName}.zip`);

  setProgress(100, 'Download complete', `${total} files`, formatBytes(totalBytes));
  setStatus(`Created ZIP with ${total} files (${formatBytes(totalBytes)})`, 'success');
}

input.addEventListener('input', debounce(() => {
  const url = input.value.trim();
  if (!url) {
    previewEl.classList.remove('active');
    return;
  }
  inspectUrl(url);
}, 400));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    setStatus('Please enter a valid GitHub file or folder URL.', 'error');
    return;
  }

  downloadBtn.disabled = true;
  clearBtn.disabled = true;
  setStatus('');

  try {
    if (parsed.type === 'blob') {
      await downloadFile(parsed);
    } else {
      await downloadFolder(parsed);
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Something went wrong.', 'error');
    progressCard.classList.remove('active');
  } finally {
    downloadBtn.disabled = false;
    clearBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', clearAll);

document.querySelectorAll('[data-url]').forEach(btn => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.url;
    input.dispatchEvent(new Event('input'));
    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    input.focus();
  });
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
  sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

applyTheme(localStorage.getItem('theme') || 'dark');
