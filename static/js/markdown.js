// настройки marked
marked.setOptions({ gfm: true, breaks: true, smartypants: true });

// helper: markdown -> безопасный HTML
window.md = function (html) {
  return DOMPurify.sanitize(marked.parse(html || ''));
};
