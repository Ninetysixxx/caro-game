// share.js — Web Share API wrapper + clipboard fallback

/**
 * Share content using native Web Share API, with clipboard fallback.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.text
 * @param {string} [opts.url]
 * @param {File} [opts.file]
 * @returns {Promise<{ok:boolean, method?:string, aborted?:boolean}>}
 */
export async function shareContent({ title, text, url, file } = {}) {
  const payload = { title, text };
  if (url) payload.url = url;

  const canFiles = file && navigator.canShare?.({ files: [file] });
  if (canFiles) payload.files = [file];

  try {
    if (navigator.share) {
      await navigator.share(payload);
      return { ok: true, method: 'native' };
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, aborted: true };
    }
    // Other errors fall through to fallback
  }

  // Fallback: copy text + url to clipboard
  const toCopy = url ? `${text}\n${url}` : text;
  try {
    await navigator.clipboard.writeText(toCopy);
    return { ok: true, method: 'clipboard' };
  } catch (clipErr) {
    // Safari strict mode: show manual copy textarea
    return { ok: false, method: 'manual', text: toCopy };
  }
}

/**
 * Trigger a toast notification.
 * @param {string} message
 * @param {number} durationMs
 */
export function showToast(message, durationMs = 2000) {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    toast.className = 'share-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, durationMs);
}

/**
 * Show a manual copy textarea modal for strict browsers.
 * @param {string} text
 */
export function showManualCopy(text) {
  let el = document.getElementById('manual-copy-modal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'manual-copy-modal';
    el.className = 'puzzle-modal';
    el.innerHTML = `
      <div class="puzzle-modal-backdrop"></div>
      <div class="puzzle-modal-panel">
        <h2 class="puzzle-modal-title">Sao chép</h2>
        <textarea readonly style="width:100%;height:80px;margin:12px 0;padding:8px;border-radius:6px;border:none;background:#1e1e2e;color:#ececf1;font:inherit;resize:none;"></textarea>
        <div class="puzzle-modal-actions">
          <button type="button" class="ctrl-btn" id="manual-copy-close">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('.puzzle-modal-backdrop').addEventListener('click', () => el.remove());
    el.querySelector('#manual-copy-close').addEventListener('click', () => el.remove());
  }
  el.querySelector('textarea').value = text;
}
