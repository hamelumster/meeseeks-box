// ====== DOM refs ======
const boxBtn = document.getElementById('boxBtn');
const boxImg = document.getElementById('boxImg');
const chatStage = document.getElementById('chatStage');
const askForm = document.getElementById('askForm');
const promptIn = document.getElementById('promptInput');
const statusEl = document.getElementById('status');
const answerCard = document.getElementById('answerCard');
const charHint = document.getElementById('charHint');
const pageWrap = document.getElementById('pageWrap');
const intro = document.getElementById('intro');
const charStage = document.getElementById('charStage');

// ==== КАДРЫ ПОСЛЕ "ГОТОВО" ====
const DONE_FRAMES = [
  '/static/assets/vanish/vanish_1.svg',
  '/static/assets/vanish/vanish_2.svg',
  '/static/assets/vanish/vanish_3.svg',
  '/static/assets/vanish/vanish_4.svg',
  '/static/assets/vanish/vanish_5.svg',
  '/static/assets/vanish/vanish_6.svg',
];

const EMPTY_FRAME = '/static/assets/vanish/vanish_7.svg';

// утилиты
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function preloadFrames(frames = []) {
  return Promise.all(frames.map(src => new Promise(res => {
    const img = new Image();
    img.onload = () => res();
    img.onerror = () => res(); // не блокируем из-за ошибок
    img.src = src;
  })));
}

// глобальный контроллер текущей последовательности
let currentSeq = { canceled: false };

/**
 * Проигрывает массив кадров c заданной частотой
 * @param {string[]} frames
 * @param {{fps?: number, holdLast?: boolean, cancelToken?: {canceled:boolean}}} opts
 */
async function playFrameSequence(frames, { fps = 8, holdLast = true, cancelToken } = {}) {
  if (!frames || !frames.length) return;
  const interval = Math.max(30, Math.floor(1000 / fps));
  await preloadFrames(frames);
  for (let i = 0; i < frames.length; i++) {
    if (cancelToken?.canceled) return; // прервали — выходим
    swapChar(frames[i], { instant: true });
    await sleep(interval);
  }
  // пока держим последний кадр
}

// Плавная смена картинки
function waitTransitionEnd(el, prop = 'opacity', timeout = 200) {
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

async function swapChar(src, { instant = false } = {}) {
  const imgHost = document.getElementById('charAppear');
  if (!imgHost) return;

  // если уже та же картинка — ничего не делаем
  if (imgHost.src && imgHost.src.endsWith(src)) return;

  if (instant) {
    // моментальная подмена (для покадровой анимации)
    imgHost.style.opacity = 1;
    imgHost.src = src;
    return;
  }

  // 1) плавно скрываем текущую
  imgHost.style.opacity = 0;
  await waitTransitionEnd(imgHost, 'opacity', 220);

  // 2) ждём загрузку новой, чтобы не мигало
  await new Promise(res => {
    const img = new Image();
    img.onload = res;
    img.onerror = res; // не блокируемся на ошибке
    img.src = src;
  });

  // 3) подменяем и плавно показываем
  imgHost.src = src;
  requestAnimationFrame(() => { imgHost.style.opacity = 1; });
}

// авто-высота textarea
function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// отправка по Enter, перенос по Shift+Enter
promptIn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    askForm.requestSubmit(); // отправляем форму
  }
});

// растить поле по мере ввода
promptIn.addEventListener('input', () => autosize(promptIn));
// первичная подгонка
autosize(promptIn);

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

// Показ встроенной коробки в месте персонажа
function showInlineBox() {
  if (!charStage) return;

  // верстаем кнопку-коробку прямо в место персонажа
  charStage.innerHTML = `
    <button id="chatBoxBtn"
      class="w-full rounded-3xl bg-white shadow grid place-items-center hover:shadow-lg transition-shadow py-4
         focus:outline-none focus:ring-0 focus-visible:outline-none border-0">
      <img id="chatBoxImg" src="/static/assets/box1.svg" alt="Коробка"
           class="w-40 h-40 md:w-48 md:h-48 select-none pointer-events-none" />
      <div class="text-sm text-gray-500 mt-2">Нажми на кнопку, чтобы вызвать мистера Мисикса снова</div>
    </button>
  `;

  // перезапустить fade-in анимацию для контейнера
  charStage.classList.remove('fade-in');
  void charStage.offsetWidth; // force reflow
  charStage.classList.add('fade-in');

  const chatBoxBtn = document.getElementById('chatBoxBtn');
  const chatBoxImg = document.getElementById('chatBoxImg');

  if (!chatBoxBtn || !chatBoxImg) return;

  // Прелоад обеих картинок коробки
  preloadFrames(['/static/assets/box1.svg','/static/assets/box2.svg']);

  chatBoxBtn.addEventListener('click', async () => {
    // защита от даблкликов
    if (chatBoxBtn.disabled) return;
    chatBoxBtn.disabled = true;
    chatBoxBtn.setAttribute('aria-pressed', 'true');

    // мини-анимация нажатия: box1 -> box2 -> box1
    try {
      chatBoxImg.src = '/static/assets/box2.svg';
      await sleep(180);
      chatBoxImg.src = '/static/assets/box1.svg';
      await sleep(160);
    } finally {
      chatBoxBtn.removeAttribute('aria-pressed');
    }

    // плавно скрываем контейнер коробки (весь charStage)
    charStage.classList.add('fade-out');
    await sleep(220);
    charStage.classList.remove('fade-out');

    await restartFlowFromBox();
  }, { once: true });

  // доступность: фокус на кнопку
  chatBoxBtn.focus();
}

// Мягко скрыть и очистить ответ
function clearAnswer() {
  if (!answerCard) return;
  if (!answerCard.classList.contains('hidden')) {
    answerCard.classList.add('fade-out');
    setTimeout(() => {
      answerCard.classList.add('hidden');
      answerCard.classList.remove('fade-out');
      answerCard.innerHTML = '';
    }, 250);
  } else {
    answerCard.innerHTML = '';
  }
  setStatus('');
}

// Вернуть персонажа и ввод в исходный вид (внутри chatStage)
async function showCharacter() {
  if (!charStage) return;

  // Вернём картинку персонажа на место
  charStage.innerHTML = `
    <img id="charAppear" src="/static/assets/msks_appear1.svg" alt="Появление персонажа"
         class="mx-auto w-full max-w-xs md:max-w-sm lg:max-w-md h-auto select-none" />
  `;

  // перезапустить fade-in анимацию для контейнера
  charStage.classList.remove('fade-in');
  void charStage.offsetWidth; // force reflow
  charStage.classList.add('fade-in');

  // Подсказка и анимация
  charHint.textContent = 'Я мистер Миииисиииикс! Посмотрите на меня!';
  swapChar('/static/assets/msks_appear1.svg');

  // Готовим форму, но пока не показываем мгновенно
  askForm.classList.add('hidden');
  askForm.classList.remove('fade-out');
  askForm.querySelector('button').disabled = false;
  promptIn.value = '';
  autosize(promptIn);

  // Мягко: сначала персонаж, потом — форма с небольшой задержкой
  await swapChar('/static/assets/msks_appear1.svg');  // плавная смена кадра персонажа
  setTimeout(() => {
    askForm.classList.remove('hidden');
    askForm.classList.add('fade-in');
    // снять класс после анимации, чтобы не влиял дальше
    setTimeout(() => {
      askForm.classList.remove('fade-in');
      promptIn.focus(); // фокус только когда форма уже «вышла»
    }, 250);
  }, 90);

  // Прелоад кадров, если нужно переигрывать потом
  preloadFrames(DONE_FRAMES);
  preloadFrames([EMPTY_FRAME]);
}

// Полный рестарт цикла по клику встроенной коробки
async function restartFlowFromBox() {
  // отменить текущие последовательности/таймеры
  currentSeq.canceled = true;

  // скрыть/очистить предыдущий ответ
  clearAnswer();

  // показать персонажа и поле ввода
  await showCharacter();
}


// ====== Flow ======
boxBtn.addEventListener('click', () => {
  // показать "нажатую" коробку
  if (boxImg) boxImg.src = '/static/assets/box2.svg';
  boxBtn.setAttribute('aria-pressed', 'true');
  boxBtn.disabled = true;

  const pressDelay = 200; // сколько держим "нажатую" картинку (box2)
  const postReleaseHold = 180; // сколько держим "отпущенную" (box1) перед исчезновением

  // 1) подержать box2 (нажатую)
  setTimeout(() => {
    // 2) вернуть в исходное состояние (box1)
    if (boxImg) boxImg.src = '/static/assets/box1.svg';

    // 3) ещё чуть-чуть подержать box1
    setTimeout(() => {
      // 4) плавно скрыть блок с коробкой
      boxBtn.classList.add('fade-out');

      setTimeout(() => {
        boxBtn.classList.add('hidden');

        // Спрятать экран приветствия (центрированную часть)
        if (intro) intro.classList.add('hidden');

        if (pageWrap) {
        pageWrap.classList.remove('-translate-y-12', 'md:-translate-y-12');
        pageWrap.style.paddingTop = '8px';
        }

        chatStage.style.marginTop = '2px';

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // показать сцену чата
        chatStage.classList.remove('hidden');
        chatStage.classList.add('fade-in');

        // прелоад финальных кадров
        preloadFrames(DONE_FRAMES);
        preloadFrames([EMPTY_FRAME]);

        swapChar('/static/assets/msks_appear1.svg');
        charHint.textContent = 'Я мистер Миииисиииикс! Посмотрите на меня!';

        // сброс формы
        promptIn.value = '';
        askForm.classList.remove('hidden', 'fade-out');
        askForm.querySelector('button').disabled = false;
        autosize(promptIn);
        promptIn.focus();

        // финальная очистка/сброс кнопки
        boxBtn.removeAttribute('aria-pressed');
        boxBtn.disabled = false;
        boxBtn.classList.remove('fade-out');
      }, 250); // длительность fade-out
    }, postReleaseHold);
  }, pressDelay);
});

askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptIn.value.trim();
  if (!prompt) return;
  autosize(promptIn);

  answerCard.classList.add('hidden');
  answerCard.innerHTML = '';
  charHint.textContent = 'Ооооо, сейчас я тебе отвечу!';
  await swapChar('/static/assets/msks_think.svg');
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
    await swapChar('/static/assets/msks_done.svg');

    setTimeout(() => {
    if (!chatStage.classList.contains('hidden')) {
    charHint.textContent = 'Мистер Мисикс исчезает после того, как выполняет просьбу...';
    }
    }, 2000);

    await sleep(1600);

    currentSeq.canceled = true;
    currentSeq = { canceled: false };
    await playFrameSequence(DONE_FRAMES, {
    fps: 16,
    holdLast: false,
    cancelToken: currentSeq
    });

    // после последовательности показываем встроенную коробку
    if (!currentSeq.canceled) {
      showInlineBox();
    }
    
    // подсветка кода
    if (window.hljs) {
      answerCard.querySelectorAll('pre code').forEach(el => window.hljs.highlightElement(el));
    }
    // кнопки «Копировать»
    addCopyButtons(answerCard);

    // СКРЫВАЕМ ФОРМУ ПОСЛЕ ОТВЕТА
    askForm.classList.add('fade-out');
    setTimeout(() => {
      askForm.classList.add('hidden');
      askForm.classList.remove('fade-out');
    }, 250);

  } catch (err) {
    setStatus(
      err.message?.includes('no_responsive_model')
        ? 'Не удалось подключиться к модели. Открой LM Studio → Server → Start Server и загрузите модель.'
        : `Ошибка: ${err.message || 'неизвестная'}`,
      'error'
    );
    charHint.textContent = 'Упс… попробуем ещё?';
  } finally {
    askForm.querySelector('button').disabled = false;
  }
});

