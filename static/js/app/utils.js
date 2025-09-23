export const $ = (id) => document.getElementById(id);

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function preloadFrames(frames = []) {
  return Promise.all(frames.map(src => new Promise(res => {
    const img = new Image();
    img.onload = () => res();
    img.onerror = () => res();
    img.src = src;
  })));
}

export function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export function setStatus(msg, kind = 'info') {
  const statusEl = $('status');
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.className = 'text-sm ' + (kind === 'error' ? 'text-red-600' : 'text-gray-500');
}

export function addCopyButtons(root) {
  root.querySelectorAll('pre').forEach(pre => {
    pre.classList.add('relative','group');
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.className =
      'absolute top-2 right-2 text-xs rounded-md bg-gray-800/80 text-white px-2 py-1 ' +
      'opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800';

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeEl.innerText);
        const old = btn.textContent; btn.textContent = 'Скопировано';
        setTimeout(() => (btn.textContent = old), 1200);
      } catch {
        const old = btn.textContent; btn.textContent = 'Ошибка';
        setTimeout(() => (btn.textContent = old), 1200);
      }
    });

    pre.appendChild(btn);
  });
}

// Ждём завершения CSS-перехода (по умолчанию opacity)
export function waitTransitionEnd(el, prop = 'opacity', timeout = 220) {
  return new Promise(resolve => {
    let done = false;
    const onEnd = (e) => {
      if (e.propertyName === prop) {
        done = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      }
    };
    el.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(() => { if (!done) { el.removeEventListener('transitionend', onEnd); resolve(); } }, timeout);
  });
}
