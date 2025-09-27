import { $, sleep, preloadFrames, waitTransitionEnd, autosize } from './utils.js';
import { DONE_FRAMES, APPEAR_FRAMES, ACCEPT_FRAMES, ACCEPT_FPS, REFLECT_FRAMES, REFLECT_FPS, FLIPBOOK_FPS, FADE_MS, MICRO_DELAY_MS } from './config.js';
import { t } from '../i18n.js';

let currentSeq = { canceled: false }; // контроллер покадровой анимации

// Плавная смена картинки персонажа
export async function swapChar(src, { instant = false } = {}) {
  const imgHost = $('charAppear');
  if (!imgHost) return;

  // если уже та же картинка — не дёргаем
  if (imgHost.src && imgHost.src.endsWith(src)) return;

  if (instant) {
    imgHost.style.opacity = 1;
    imgHost.src = src;
    return;
  }

  imgHost.style.opacity = 0;
  await waitTransitionEnd(imgHost, 'opacity', 220);

  await new Promise(res => {
    const img = new Image();
    img.onload = res;
    img.onerror = res;
    img.src = src;
  });

  imgHost.src = src;
  requestAnimationFrame(() => { imgHost.style.opacity = 1; });
}

// Покадровая последовательность (без плавности между кадрами)
export async function playFrameSequence(
  frames,
  { fps = FLIPBOOK_FPS, cancelToken, holdLastMs = 0 } = {}
) {
  if (!frames || !frames.length) return;
  const interval = Math.max(30, Math.floor(1000 / fps));
  await preloadFrames(frames);
  for (let i = 0; i < frames.length; i++) {
    if (cancelToken?.canceled) return;
    await swapChar(frames[i], { instant: true });
    await sleep(interval);
  }
  // pause in last frame
  if (!cancelToken?.canceled && holdLastMs > 0) {
    await sleep(holdLastMs);
  }
}

export async function playLoop(frames, { fps = REFLECT_FPS, cancelToken } = {}) {
  if (!frames || !frames.length) return;
  const interval = Math.max(30, Math.floor(1000 / fps));
  await preloadFrames(frames);
  while (!cancelToken?.canceled) {
    for (let i = 0; i < frames.length; i++) {
      if (cancelToken?.canceled) return;
      await swapChar(frames[i], { instant: true });
      await sleep(interval);
    }
  }
}

// Показ персонажа и аккуратное появление формы
export async function showCharacter() {
  const charStage = $('charStage');
  const askForm = $('askForm');
  const promptIn = $('promptInput');
  const charHint = $('charHint');

  if (!charStage || !askForm || !promptIn || !charHint) return;

  // Вставляем <img id="charAppear"> заново
  charStage.innerHTML = `
    <img id="charAppear" src="${APPEAR_FRAMES[0]}" alt="Появление персонажа"
         class="mx-auto w-full max-w-xs md:max-w-sm lg:max-w-md h-auto select-none" />
  `;
  // перезапуск анимации контейнера
  charStage.classList.remove('fade-in');
  void charStage.offsetWidth;
  charStage.classList.add('fade-in');

  charHint.textContent = t('char.hint_idle');

  // Подготовить форму, скрыв её
  askForm.classList.add('hidden');
  askForm.classList.remove('fade-out');
  askForm.querySelector('button').disabled = false;
  promptIn.value = '';
  autosize(promptIn);

  const seq = cancelCurrentSeq();
  await playFrameSequence(
    APPEAR_FRAMES, 
    { cancelToken: seq ,
    fps: FLIPBOOK_FPS,
  });

  // Затем плавно показать форму с микро-задержкой
  setTimeout(() => {
    askForm.classList.remove('hidden');
    askForm.classList.add('fade-in');
    setTimeout(() => {
      askForm.classList.remove('fade-in');
      promptIn.focus();
    }, FADE_MS);
  }, MICRO_DELAY_MS);

  // Прелоад финальных кадров (на будущее)
  preloadFrames(DONE_FRAMES);
}

// Сброс текущей последовательности
export function cancelCurrentSeq() {
  currentSeq.canceled = true;
  currentSeq = { canceled: false };
  return currentSeq;
}
