/**
 * KINSEI Studio — Project popover on the clicked card
 * Same interaction as the form dropdown: no overlay, click outside to close.
 */

import { PROJECT_DATA } from '../data/projects.js?v=20';
import { playSound } from './audio.js?v=23';
import { t } from './i18n.js?v=17';
import { MODAL_DESC_KEYS } from '../data/i18n.js?v=17';

let modal, closeBtn, title, desc, liveBtn, card;
let closeLocked = false;
let lastProjectId = null;
let sourceCard = null;
let closingTimer = null;

export function initModal() {
  modal = document.getElementById('projectModal');
  closeBtn = document.getElementById('modalCloseBtn');
  title = document.getElementById('modalTitle');
  desc = document.getElementById('modalDesc');
  liveBtn = document.getElementById('modalLiveBtn');
  card = modal?.querySelector('.modal-card');

  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playSound('click');
    closeModal();
  });

  card?.addEventListener('pointerdown', (e) => e.stopPropagation());
  card?.addEventListener('click', (e) => e.stopPropagation());

  window.addEventListener('pointerdown', (e) => {
    if (!modal?.classList.contains('modal-open')) return;
    if (e.target.closest?.('.modal-card')) return;
    closeModal();
  }, true);

  window.addEventListener('resize', () => {
    if (modal?.classList.contains('modal-open')) placeOnCard(sourceCard);
  });
  window.visualViewport?.addEventListener('resize', () => {
    if (modal?.classList.contains('modal-open')) placeOnCard(sourceCard);
  });
  window.addEventListener('kinsei-lang', () => {
    if (lastProjectId && modal?.classList.contains('modal-open')) {
      fillModal(lastProjectId);
      requestAnimationFrame(() => placeOnCard(sourceCard));
    }
  });
}

function fillModal(projectId) {
  const data = PROJECT_DATA[projectId];
  if (!data || !modal) return;

  const descKey = MODAL_DESC_KEYS[projectId];
  title.textContent = data.title;
  desc.textContent = descKey ? t(descKey) : data.desc;
  liveBtn.href = data.url;
  const ctaKey = data.cta === 'profile' ? 'visitProfile' : 'visitSite';
  const ctaLabel = liveBtn.querySelector('[data-i18n]');
  if (ctaLabel) {
    ctaLabel.dataset.i18n = ctaKey;
    ctaLabel.textContent = t(ctaKey);
  }
}

function resolveSource(projectId, sourceEl) {
  if (sourceEl?.classList?.contains('neo-card')) return sourceEl;
  return document.querySelector(`.neo-card[data-project-preview="${projectId}"]`);
}

function placeOnCard(el) {
  if (!card) return;
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.visualViewport?.height || window.innerHeight;
  const src = el?.getBoundingClientRect();
  const width = Math.round(Math.min(
    Math.max(src?.width || 320, 240),
    vw - pad * 2,
    380,
  ));
  card.style.width = `${width}px`;
  card.style.maxWidth = `${width}px`;
  const popH = card.offsetHeight || 220;
  let left = src ? src.left : (vw - width) / 2;
  let top = src ? src.top : (vh - popH) / 2;
  left = Math.max(pad, Math.min(left, vw - width - pad));
  top = Math.max(pad, Math.min(top, vh - popH - pad));
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

export function openProjectModal(projectId, sourceEl) {
  if (!PROJECT_DATA[projectId] || !modal || !card) return;

  if (closingTimer) {
    clearTimeout(closingTimer);
    closingTimer = null;
  }

  lastProjectId = projectId;
  fillModal(projectId);

  sourceCard?.classList.remove('is-preview-source');
  sourceCard = resolveSource(projectId, sourceEl);
  sourceCard?.classList.add('is-preview-source');

  modal.classList.remove('is-closing');
  modal.classList.add('modal-open');
  modal.setAttribute('aria-hidden', 'false');
  placeOnCard(sourceCard);

  closeLocked = true;
  requestAnimationFrame(() => {
    placeOnCard(sourceCard);
    window.setTimeout(() => { closeLocked = false; }, 240);
  });
}

export function closeModal() {
  if (!modal || closeLocked) return;
  if (!modal.classList.contains('modal-open') && !modal.classList.contains('is-closing')) return;

  closeLocked = true;
  modal.classList.add('is-closing');
  modal.classList.remove('modal-open');

  const finish = () => {
    if (closingTimer) {
      clearTimeout(closingTimer);
      closingTimer = null;
    }
    modal.classList.remove('is-closing');
    modal.setAttribute('aria-hidden', 'true');
    sourceCard?.classList.remove('is-preview-source');
    closeLocked = false;
  };

  closingTimer = window.setTimeout(finish, 180);
}

export function isModalOpen() {
  return !!modal?.classList.contains('modal-open');
}
