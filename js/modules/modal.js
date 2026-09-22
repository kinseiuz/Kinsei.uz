/**
 * KINSEI Studio — Project Detail Modal
 */

import { PROJECT_DATA } from '../data/projects.js?v=20';
import { playSound } from './audio.js?v=20';
import { t } from './i18n.js?v=3';
import { MODAL_DESC_KEYS } from '../data/i18n.js?v=3';

let modal, closeBtn, title, desc, liveBtn, card;
let closeLocked = false;
let lastProjectId = null;

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

  modal?.addEventListener('pointerdown', (e) => {
    if (!modal.classList.contains('modal-open')) return;
    if (e.target.closest?.('.modal-card')) return;
    playSound('click');
    closeModal();
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

export function openProjectModal(projectId) {
  if (!PROJECT_DATA[projectId] || !modal) return;

  lastProjectId = projectId;
  fillModal(projectId);

  closeLocked = true;
  modal.classList.add('modal-open');
  modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => { closeLocked = false; }, 180);
}

export function closeModal() {
  if (!modal || closeLocked) return;
  modal.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
}

export function isModalOpen() {
  return !!modal?.classList.contains('modal-open');
}
