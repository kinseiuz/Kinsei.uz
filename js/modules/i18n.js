/**
 * KINSEI Studio — Language switching
 */

import { LANG_LABELS, STRINGS, SUPPORTED_LANGS, detectSystemLang } from '../data/i18n.js?v=3';

const STORAGE_KEY = 'kinsei-lang';

let currentLang = 'uz';

export function getLang() {
  return currentLang;
}

export function t(key) {
  const dict = STRINGS[currentLang] || STRINGS.uz;
  return dict[key] ?? STRINGS.uz[key] ?? key;
}

export function initI18n() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  currentLang = SUPPORTED_LANGS.includes(saved) ? saved : detectSystemLang();
  applyI18n();
  bindLangSwitcher();
}

export function setLang(lang, persist = true) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) {
    if (lang === currentLang) closeLangMenu();
    return;
  }
  currentLang = lang;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }
  applyI18n();
  closeLangMenu();
}

function applyI18n() {
  const dict = STRINGS[currentLang] || STRINGS.uz;
  document.documentElement.lang = currentLang;
  document.title = dict.docTitle;

  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', dict.docDesc);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = dict[el.dataset.i18n];
    if (value != null) el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const value = dict[el.dataset.i18nPlaceholder];
    if (value != null) el.setAttribute('placeholder', value);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const value = dict[el.dataset.i18nAria];
    if (value != null) el.setAttribute('aria-label', value);
  });

  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const value = dict[el.dataset.i18nLabel];
    if (value != null) el.setAttribute('aria-label', value);
  });

  const currentLabel = document.getElementById('langCurrent');
  if (currentLabel) currentLabel.textContent = LANG_LABELS[currentLang];

  document.querySelectorAll('.lang-option').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.lang === currentLang);
  });

  window.dispatchEvent(new CustomEvent('kinsei-lang', { detail: { lang: currentLang } }));
}

function bindLangSwitcher() {
  const wrapper = document.getElementById('langSwitcher');
  const trigger = document.getElementById('langTrigger');
  if (!wrapper || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrapper.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  wrapper.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(btn.dataset.lang, true);
    });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeLangMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenu();
  });
}

function closeLangMenu() {
  const wrapper = document.getElementById('langSwitcher');
  const trigger = document.getElementById('langTrigger');
  wrapper?.classList.remove('is-open');
  trigger?.setAttribute('aria-expanded', 'false');
}
