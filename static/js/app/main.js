// /static/js/app/main.js
import { $, sleep, autosize, setStatus, addCopyButtons, preloadFrames } from './utils.js';
import { DONE_FRAMES, FADE_MS } from './config.js';
import { swapChar, showCharacter } from './character.js';
import { showInlineBox, finishAndOfferBox } from './inlineBox.js';

//
// DOM refs получаем на лету через $
//

const boxClickHandler = () => {
  const boxBtn = $('boxBtn');
  const boxImg = $('boxImg');
  const chatStage = $('chatStage');
  const pageWrap = $('pageWrap');
  const intro = $('intro');
  const askForm = $('askForm');
  const promptIn = $('promptInput');
  const charHint = $('charHint');

  if (!boxBtn) return;

  // показать "нажатую" коробку
  if (boxImg) boxImg.src = '/static/assets/box2.svg';
  boxBtn.setAttribute('aria-pressed', 'true');
  boxBtn.disabled = true;

  const pressDelay = 200;
  const postReleaseHold = 180;

  setTimeout(() => {
    if (boxImg) boxImg.src = '/static/assets/box1.svg';

    setTimeout(async () => {
      boxBtn.classList.add('fade-out');

      setTimeout(async () => {
        boxBtn.classList.add('hidden');

        if (intro) intro.classList.add('hidden');

        if (pageWrap) {
          pageWrap.classList.remove('-translate-y-12', 'md:-translate-y-12');
          pageWrap.style.paddingTop = '8px';
        }

        if (chatStage) {
          chatStage.style.marginTop = '2px';
          window.scrollTo({ top: 0, behavior: 'smooth' });

          chatStage.classList.remove('hidden');
          chatStage.classList.add('fade-in');
        }

        // прелоад кадров
        preloadFrames(DONE_FRAMES);

        // приветствие
        await swapChar('/static/assets/msks_appear1.svg');
        if (charHint) charHint.textContent = 'Я мистер Миииисиииикс! Посмотрите на меня!';

        // форма
        if (askForm && promptIn) {
          promptIn.value = '';
          askForm.classList.remove('hidden', 'fade-out');
          askForm.querySelector('button').disabled = false;
          autosize(promptIn);
          promptIn.focus();
        }

        boxBtn.removeAttribute('aria-pressed');
        boxBtn.disabled = false;
        boxBtn.classList.remove('fade-out');
      }, FADE_MS);
    }, postReleaseHold);
  }, pressDelay);
};

function setupBoxButton() {
  const boxBtn = $('boxBtn');
  if (boxBtn) {
    boxBtn.addEventListener('click', boxClickHandler, { once: true });
  }
}

function setupAutosize() {
  const promptIn = $('promptInput');
  if (!promptIn) return;

  promptIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('askForm')?.requestSubmit();
    }
  });

  promptIn.addEventListener('input', () => autosize(promptIn));
  autosize(promptIn);
}

function setupSubmit() {
  const askForm = $('askForm');
  if (!askForm) return;

  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const promptIn = $('promptInput');
    const answerCard = $('answerCard');
    const chatStage = $('chatStage');
    const charHint = $('charHint');

    if (!promptIn || !answerCard) return;

    const prompt = promptIn.value.trim();
    if (!prompt) return;

    autosize(promptIn);

    answerCard.classList.add('hidden');
    answerCard.innerHTML = '';
    if (charHint) charHint.textContent = 'Ооооо, сейчас я тебе отвечу!';
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
      if (charHint) charHint.textContent = 'Готово!';
      await swapChar('/static/assets/msks_done.svg');

      setTimeout(() => {
        if (!chatStage?.classList.contains('hidden') && charHint) {
          charHint.textContent = 'Мистер Мисикс исчезает после того, как выполняет просьбу...';
        }
      }, 2000);

      await sleep(1600);

      await finishAndOfferBox(); // покадровая анимация + встроенная коробка

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
      }, FADE_MS);

    } catch (err) {
      setStatus(
        err.message?.includes('no_responsive_model')
          ? 'Не удалось подключиться к модели. Открой LM Studio → Server → Start Server и загрузите модель.'
          : `Ошибка: ${err.message || 'неизвестная'}`,
        'error'
      );
      if (charHint) charHint.textContent = 'Упс… попробуем ещё?';
    } finally {
      askForm.querySelector('button').disabled = false;
    }
  });
}

function init() {
  setupBoxButton();
  setupAutosize();
  setupSubmit();
}

document.addEventListener('DOMContentLoaded', init);
