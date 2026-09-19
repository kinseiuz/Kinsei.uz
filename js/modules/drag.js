/**
 * KINSEI Studio — Drag & Drop (Figma-exact)
 * No SFX sounds
 */

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { playSound } from './audio.js';
import { openProjectModal } from './modal.js';

export function setupDraggable(card) {
  let startX, startY, initCardX, initCardY;
  let hasDragged = false;
  let lastTime, lastPX, lastPY, vx, vy;

  card.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;

    const cur = state.cardStates.get(card) || { x: card.offsetLeft, y: card.offsetTop, rotation: 0, baseZIndex: 10 };
    initCardX = cur.x;
    initCardY = cur.y;
    hasDragged = false;
    lastTime = performance.now();
    lastPX = e.clientX;
    lastPY = e.clientY;
    vx = vy = 0;

    state.activeDragCard = card;
    state.highestZIndex += 1;
    card.style.zIndex = state.highestZIndex;
    card.setPointerCapture(e.pointerId);

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;

      if (!hasDragged && Math.hypot(dx, dy) > CONFIG.dragThreshold) {
        hasDragged = true;
        state.isDragging = true;
        card.classList.add('is-dragging');
        playSound('grab');
      }

      if (!hasDragged) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      vx = (me.clientX - lastPX) / dt;
      vy = (me.clientY - lastPY) / dt;
      lastTime = now;
      lastPX = me.clientX;
      lastPY = me.clientY;

      const cW = card.offsetWidth, cH = card.offsetHeight;
      const vpW = window.innerWidth, vpH = window.innerHeight;
      const r = CONFIG.viewportRetention;

      const cx = clamp(initCardX + dx, -cW * (1 - r), vpW - cW * r);
      const cy = clamp(initCardY + dy, -cH * (1 - r), vpH - cH * r);

      card.style.left = `${cx}px`;
      card.style.top = `${cy}px`;
      cur.x = cx;
      cur.y = cy;
      state.cardStates.set(card, cur);
    };

    const onUp = (ue) => {
      card.releasePointerCapture(ue.pointerId);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerup', onUp);
      card.removeEventListener('pointercancel', onUp);
      card.classList.remove('is-dragging');

      if (hasDragged) {
        playSound('drop');
        // Inertia glide
        const cur = state.cardStates.get(card);
        const cW = card.offsetWidth, cH = card.offsetHeight;
        const vpW = window.innerWidth, vpH = window.innerHeight;
        const r = CONFIG.viewportRetention;

        const gx = clamp(cur.x + vx * 80, -cW * (1 - r), vpW - cW * r);
        const gy = clamp(cur.y + vy * 80, -cH * (1 - r), vpH - cH * r);

        card.style.transition = 'left 0.4s cubic-bezier(0.16,1,0.3,1), top 0.4s cubic-bezier(0.16,1,0.3,1)';
        card.style.left = `${gx}px`;
        card.style.top = `${gy}px`;
        cur.x = gx;
        cur.y = gy;
        state.cardStates.set(card, cur);

        setTimeout(() => { card.style.transition = ''; }, 400);
      } else {
        // User tapped / clicked the banner/card
        playSound('banner');
        const previewLink = card.querySelector('[data-project-preview]');
        if (previewLink) {
          const id = previewLink.dataset.projectPreview;
          if (id) openProjectModal(id);
        }
      }

      setTimeout(() => {
        state.isDragging = false;
        state.activeDragCard = null;
      }, 50);
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
  });

  // Hover: z-index lift
  card.addEventListener('mouseenter', () => {
    if (state.isDragging) return;
    card.style.zIndex = 100;
  });

  card.addEventListener('mouseleave', () => {
    if (state.isDragging || card === state.activeDragCard) return;
    const cur = state.cardStates.get(card);
    if (cur) card.style.zIndex = cur.baseZIndex;
  });

  // Prevent link click when dragging
  const link = card.querySelector('.card-title-link');
  if (link) {
    link.addEventListener('click', (e) => {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
    });
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
