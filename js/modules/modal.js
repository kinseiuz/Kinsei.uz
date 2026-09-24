/**
 * KINSEI Studio — Project popover on the clicked card
 * Same interaction as the form dropdown: no overlay, click outside to close.
 */

import { PROJECT_DATA } from '../data/projects.js?v=20';
import { playSound } from './audio.js?v=24';
import { t } from './i18n.js?v=18';
import { MODAL_DESC_KEYS } from '../data/i18n.js?v=18';
import { state } from '../state.js';

let modal, closeBtn, title, desc, liveBtn, card;
let closeLocked = false;
let lastProjectId = null;
let sourceCard = null;
let closingTimer = null;

export function initModal() {
  document.querySelectorAll('.neo-card[data-project-preview]').forEach(mountFlip);
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
    document.querySelectorAll('.neo-card[data-project-preview]').forEach(fillBack);
  });

  window.addEventListener('pointerdown', (e) => {
    const flipped = document.querySelector('.neo-card.is-flipped');
    if (!flipped || flipped.classList.contains('is-flipping')) return;
    if (flipped.contains(e.target)) return;
    closeModal();
  }, true);
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

function mountFlip(el) {
  if (el.querySelector('.card-flip')) return;
  const front = document.createElement('div');
  front.className = 'card-face card-front';
  while (el.firstChild) front.appendChild(el.firstChild);
  const back = document.createElement('div');
  back.className = 'card-face card-back';
  back.innerHTML = '<p class="card-back-title"></p><p class="card-back-desc"></p><a class="card-back-link" target="_blank" rel="noopener noreferrer"><span></span><span class="arrow">↗</span></a>';
  const flip = document.createElement('div');
  flip.className = 'card-flip';
  flip.append(front, back);
  el.append(flip);
  fillBack(el);
}

function fillBack(el) {
  const id = el.dataset.projectPreview;
  const data = PROJECT_DATA[id];
  const back = el.querySelector('.card-back');
  if (!data || !back) return;
  const descKey = MODAL_DESC_KEYS[id];
  back.querySelector('.card-back-title').textContent = data.title;
  back.querySelector('.card-back-desc').textContent = descKey ? t(descKey) : data.desc;
  const link = back.querySelector('.card-back-link');
  link.href = data.url;
  link.querySelector('span').textContent = t(data.cta === 'profile' ? 'visitProfile' : 'visitSite');
}

function hop(el, toBack) {
  if (el.classList.contains('is-flipping')) return;
  const cur = state.cardStates.get(el);
  const base = cur?.rotation ?? 0;
  const nextRot = Math.round(base + (Math.random() * 16 - 8));
  const dx = Math.round((Math.random() - 0.5) * 28);
  const dy = Math.round((Math.random() - 0.5) * 22);
  const from = toBack ? 0 : 180;
  el.style.setProperty('--hop-x', `${Math.round((Math.random() - 0.5) * 18)}px`);
  el.style.setProperty('--hop-y', `${Math.round(-16 - Math.random() * 18)}px`);
  el.style.setProperty('--flip-from', `${from}deg`);
  el.style.setProperty('--flip-mid', `${from + 90}deg`);
  el.style.setProperty('--flip-to', `${from + 180}deg`);
  el.style.setProperty('--spin-from', `${base}deg`);
  el.style.setProperty('--spin-mid', `${Math.round((base + nextRot) / 2)}deg`);
  el.classList.remove('is-flipping');
  void el.offsetWidth;
  el.classList.add('is-flipping');
  el.classList.toggle('is-flipped', toBack);
  window.setTimeout(() => {
    el.style.setProperty('--flip-y', toBack ? '180deg' : '0deg');
    el.style.setProperty('--curr-rot', `${nextRot}deg`);
    el.classList.remove('is-flipping');
  }, 440);
  el.style.setProperty('--curr-rot', `${nextRot}deg`);
  if (cur) {
    cur.rotation = nextRot;
    cur.x += dx;
    cur.y += dy;
    state.cardStates.set(el, cur);
    el.style.left = `${cur.x}px`;
    el.style.top = `${cur.y}px`;
  }
}

export function openProjectModal(projectId, sourceEl) {
  const el = resolveSource(projectId, sourceEl);
  if (!PROJECT_DATA[projectId] || !el) return;
  if (el.classList.contains('is-flipping')) return;
  document.querySelectorAll('.neo-card.is-flipped').forEach((other) => {
    if (other !== el && !other.classList.contains('is-flipping')) hop(other, false);
  });
  hop(el, !el.classList.contains('is-flipped'));
}

export function closeModal() {
  document.querySelectorAll('.neo-card.is-flipped').forEach((el) => {
    if (!el.classList.contains('is-flipping')) hop(el, false);
  });
}

export function isModalOpen() {
  return !!document.querySelector('.neo-card.is-flipped');
}
