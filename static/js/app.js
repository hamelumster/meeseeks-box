// ====== Lottie setup ======
const boxLottie = lottie.loadAnimation({
  container: document.getElementById('boxLottie'),
  renderer: 'svg',
  loop: true,
  autoplay: true,
  path: '/static/assets/box.json'
});

const charContainer = document.getElementById('charLottie');
let charAnimIdle, charAnimThink, currentAnim = null;

function loadCharAnims() {
  charAnimIdle = lottie.loadAnimation({
    container: charContainer,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    path: '/static/assets/character_idle.json'
  });
  charAnimThink = lottie.loadAnimation({
    container: charContainer,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    path: '/static/assets/character_think.json'
  });
  playAnim('idle');
}

function playAnim(mode) {
  [charAnimIdle, charAnimThink].forEach(a => a && a.stop());
  if (mode === 'think' && charAnimThink) { charAnimThink.play(); currentAnim = 'think'; return; }
  if (charAnimIdle) { charAnimIdle.play(); currentAnim = 'idle'; }
}

// ====== DOM refs ======
const boxBtn     = document.getElementById('boxBtn');
const chatStage  = document.getElementById('chatStage');
const askForm    = document.getElementById('askForm');
const promptIn   = document.getElementById('promptInput');
const statusEl   = document.getElementById('status');
const answerCard = document.getElementById('answerCard');
const charHint   = document.getElementById('charHint');

function setStatus(msg, kind='info') {
  statusEl.textContent = msg || '';
  statusEl.className = 'text-sm ' + (kind === 'error' ? 'text-red-600' : 'text-gray-500');
}

// кнопки «Копировать» для всех <pre>
function addCopyButtons(root) {
  root.querySelectorAll('pre').forEach(pre => {
    pre.classList.add('relative','group');
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Копировать';
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

// ====== Flow ======
boxBtn.addEventListener('click', () => {
  boxBtn.classList.add('fade-out');
  setTimeout(() => {
    boxBtn.classList.add('hidden');
    chatStage.classList.remove('hidden');
    chatStage.classList.add('fade-in');
    loadCharAnims();
    promptIn.focus();
  }, 250);
});

askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptIn.value.trim();
  if (!prompt) return;

  setStatus('Думаю над ответом…');
  answerCard.classList.add('hidden');
  answerCard.innerHTML = '';
  charHint.textContent = 'Думаю над ответом…';
  playAnim('think');
  askForm.querySelector('button').disabled = true;

  try {
    const resp = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, stream: false })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json(); // { content }

    // показать ответ
    answerCard.innerHTML = (window.md ? window.md(data.content) : data.content);
    answerCard.classList.remove('hidden');
    answerCard.classList.add('fade-in');
    setStatus('');
    charHint.textContent = 'Готово!';

    // подсветка кода
    if (window.hljs) {
      answerCard.querySelectorAll('pre code').forEach(el => window.hljs.highlightElement(el));
    }
    // кнопки «Копировать»
    addCopyButtons(answerCard);

  } catch (err) {
    setStatus(
      err.message?.includes('no_responsive_model')
        ? 'Не удалось подключиться к модели. Открой LM Studio → Server → Start Server и загрузите модель.'
        : `Ошибка: ${err.message || 'неизвестная'}`,
      'error'
    );
    charHint.textContent = 'Упс… попробуем ещё?';
  } finally {
    playAnim('idle');
    askForm.querySelector('button').disabled = false;
  }
});

