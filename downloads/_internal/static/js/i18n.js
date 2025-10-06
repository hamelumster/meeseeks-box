// static/js/i18n.js
const DICTS = {
  en: {
    'ui.intro_hint': 'Press the button to summon Mr. Meeseeks!',
    'char.hint_idle': "I'm Mr. Meeseeks! Look at me!",
    'char.hint_thinking': "Ooooh, I can do that!",
    'char.hint_reflect': 'Mr. Meeseeks is thinking...',
    'char.hint_disappear': 'Mr. Meeseeks disappears after completing the request…',
    'char.hint_retry': 'Oops… shall we try again?',
    'ui.send': 'Send',
    'ui.input_placeholder': 'How many wonders of the world are there?',
    'status.ready': 'Ready!',
    'error.no_model': 'Failed to connect to the model. Open LM Studio → Server → Start Server and load a model.',
    'ui.inline_hint': 'Press the button to summon Mr. Meeseeks again',
    'error.prefix': 'Error:',
    'error.unknown': 'unknown',
  },
  ru: {
    'ui.intro_hint': 'Нажми на кнопку, чтобы появился мистер Мисикс!',
    'char.hint_idle': 'Я мистер Миииисиииикс! Посмотрите на меня!',
    'char.hint_thinking': 'Ооооо, сейчас я тебе отвечу!',
    'char.hint_reflect': 'Мистер Мисикс думает...',
    'char.hint_disappear': 'Мистер Мисикс исчезает после того, как выполняет просьбу...',
    'char.hint_retry': 'Упс… попробуем ещё?',
    'ui.send': 'Отправить',
    'ui.input_placeholder': 'Сколько чудес света в мире?',
    'status.ready': 'Готово!',
    'error.no_model': 'Не удалось подключиться к модели. Открой LM Studio → Server → Start Server и загрузите модель.',
    'ui.inline_hint': 'Нажми на кнопку, чтобы вызвать мистера Мисикса снова',
    'error.prefix': 'Ошибка:',
    'error.unknown': 'неизвестная',
  }
};

let currentLocale = 'en'; // default EN
export function t(key){ return (DICTS[currentLocale] && DICTS[currentLocale][key]) || key; }
export function setLocale(loc){
  if (DICTS[loc]) { currentLocale = loc; localStorage.setItem('locale', loc); applyTranslations(); }
}
export function getLocale(){ return currentLocale; }

export function applyTranslations(root=document){
  root.querySelectorAll('[data-i18n-key]').forEach(el=>{
    const key = el.getAttribute('data-i18n-key');
    const attr = el.getAttribute('data-i18n-attr'); 
    const text = t(key);
    if (attr) el.setAttribute(attr, text); else el.textContent = text;
  });
}

// initialize
export function initI18n(){
  const saved = localStorage.getItem('locale');
  if (saved && DICTS[saved]) currentLocale = saved;
  applyTranslations();
}
