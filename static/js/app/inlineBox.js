// /static/js/app/inlineBox.js
import { $, sleep, preloadFrames, setStatus, addCopyButtons } from './utils.js';
import { DONE_FRAMES, FADE_MS } from './config.js';
import { showCharacter, playFrameSequence, swapChar, cancelCurrentSeq } from './character.js';
import { applyTranslations } from '../i18n.js';

// Показ встроенной коробки в месте персонажа
export function showInlineBox() {
  const charStage = $('charStage');
  if (!charStage) return;

  charStage.innerHTML = `
    <button id="chatBoxBtn"
      class="w-full rounded-3xl bg-white shadow grid place-items-center hover:shadow-lg transition-shadow py-4
             focus:outline-none focus:ring-0 focus-visible:outline-none border-0">
      <img id="chatBoxImg" src="/static/assets/box1.svg" alt="Коробка"
           class="w-40 h-40 md:w-48 md:h-48 select-none pointer-events-none" />
      <div class="text-sm text-gray-500 mt-2" data-i18n-key="ui.inline_hint"></div>
    </button>
  `;
  // легкий вход блока
  charStage.classList.remove('fade-in');
  void charStage.offsetWidth;
  charStage.classList.add('fade-in');

  applyTranslations(charStage);

  const chatBoxBtn = $('chatBoxBtn');
  const chatBoxImg = $('chatBoxImg');
  if (!chatBoxBtn || !chatBoxImg) return;

  preloadFrames(['/static/assets/box1.svg','/static/assets/box2.svg']);

  chatBoxBtn.addEventListener('click', async () => {
    if (chatBoxBtn.disabled) return;
    chatBoxBtn.disabled = true;
    chatBoxBtn.setAttribute('aria-pressed', 'true');

    try {
      chatBoxImg.src = '/static/assets/box2.svg';
      await sleep(180);
      chatBoxImg.src = '/static/assets/box1.svg';
      await sleep(160);
    } finally {
      chatBoxBtn.removeAttribute('aria-pressed');
    }

    // плавный уход текущего блока
    charStage.classList.add('fade-out');
    await sleep(FADE_MS);
    charStage.classList.remove('fade-out');

    await restartFlowFromBox();
  }, { once: true });

  chatBoxBtn.focus();
}

// Мягко скрыть и очистить ответ
export function clearAnswer() {
  const answerCard = $('answerCard');
  if (!answerCard) return;
  if (!answerCard.classList.contains('hidden')) {
    answerCard.classList.add('fade-out');
    setTimeout(() => {
      answerCard.classList.add('hidden');
      answerCard.classList.remove('fade-out');
      answerCard.innerHTML = '';
    }, FADE_MS);
  } else {
    answerCard.innerHTML = '';
  }
  setStatus('');
}

// Полный рестарт цикла по клику встроенной коробки
export async function restartFlowFromBox() {
  cancelCurrentSeq();
  clearAnswer();
  await showCharacter();
}

// Вспомогательная функция для основного флоу (после ответа)
export async function finishAndOfferBox() {
  const seq = cancelCurrentSeq(); // сбросить предыдущий
  await playFrameSequence(DONE_FRAMES, { cancelToken: seq });
  if (!seq.canceled) showInlineBox();
}
