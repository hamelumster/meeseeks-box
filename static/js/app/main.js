// /static/js/app/main.js
import { $, sleep, autosize, setStatus, addCopyButtons, preloadFrames } from './utils.js';
import { DONE_FRAMES, ACCEPT_FRAMES, ACCEPT_FPS, ACCEPT_HOLD_MS, REFLECT_FRAMES, REFLECT_FPS, FADE_MS } from './config.js';
import { swapChar, showCharacter, playFrameSequence, playLoop } from './character.js';
import { showInlineBox, finishAndOfferBox } from './inlineBox.js';
import { initI18n, setLocale, getLocale, t, applyTranslations } from '/static/js/i18n.js';

function setHint(key) {
  const el = document.getElementById('charHint');
  if (!el) return;
  el.setAttribute('data-hint-key', key);
  el.textContent = t(key);
}

const boxClickHandler = () => {
  const boxBtn = $('boxBtn');
  const boxImg = $('boxImg');
  const chatStage = $('chatStage');
  const pageWrap = $('pageWrap');
  const intro = $('intro');
  const askForm = $('askForm');
  const promptIn = $('promptInput');
  const charHint = $('charHint');

  setHint('char.hint_idle');

  function showThinking() {
  const hint = document.getElementById('charHint');
  hint.textContent = t('char.hint_thinking');
  }

  function showReady(){
  document.getElementById('status').textContent = t('status.ready');
  document.getElementById('charHint').textContent = t('char.hint_idle');
  }

  // document.getElementById('charHint').textContent = t('char.hint_idle');

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

        await showCharacter();

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
    setHint('char.hint_thinking');
    askForm.querySelector('button').disabled = true;

    // 1) accept anim
    await playFrameSequence(ACCEPT_FRAMES, { 
      fps: ACCEPT_FPS, 
      holdLastMs: ACCEPT_HOLD_MS,
    });

    // 2) loop "thinking" anim
    let reflectToken = { canceled: false };
    playLoop(REFLECT_FRAMES, { fps: REFLECT_FPS, cancelToken: reflectToken });

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
      setHint('status.ready');
      reflectToken.canceled = true; 
      await swapChar('/static/assets/msks_done.svg');

      setTimeout(() => {
        if (!chatStage?.classList.contains('hidden') && charHint) {
          setHint('char.hint_disappear');
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
          ? t('error.no_model')
          : `${t('error.prefix')} ${err.message || t('error.unknown')}`,
        'error'
      );
      reflectToken.canceled = true;
      setHint('char.hint_retry');
    } finally {
      askForm.querySelector('button').disabled = false;
      reflectToken = null;
    }
  });
}

function init() {
  initI18n();
  applyTranslations();
  setupBoxButton();
  setupAutosize();
  setupSubmit();

  const btnEn = document.getElementById('langEn');
  const btnRu = document.getElementById('langRu');

  function syncLangButtons() {
  const loc = getLocale();
  btnEn?.classList.toggle('is-active', loc === 'en');
  btnRu?.classList.toggle('is-active', loc === 'ru');
  }
  syncLangButtons();

  btnEn?.addEventListener('click', () => { setLocale('en'); syncLangButtons(); });
  btnRu?.addEventListener('click', () => { setLocale('ru'); syncLangButtons(); });

  btnEn?.addEventListener('click', () => {
    setLocale('en');
    syncLangButtons();
    const cur = document.getElementById('charHint')?.getAttribute('data-hint-key');
    if (cur) setHint(cur);
  });

  btnRu?.addEventListener('click', () => {
    setLocale('ru');
    syncLangButtons();
    const cur = document.getElementById('charHint')?.getAttribute('data-hint-key');
    if (cur) setHint(cur);
  });

}

document.addEventListener('DOMContentLoaded', init);
preloadFrames(ACCEPT_FRAMES);
preloadFrames(REFLECT_FRAMES);
