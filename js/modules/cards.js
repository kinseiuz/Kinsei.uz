/**
 * KINSEI Studio — Card Physics & Random Positioning
 */

import { CONFIG } from '../config.js';
import { state } from '../state.js';

/**
 * Calculate safe random card position within viewport,
 * avoiding header & contact form UI zones.
 */
export function calculateSafeCardPosition(card, index, totalCards) {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const cardW = card.offsetWidth || 320;
  const cardH = card.offsetHeight || 260;
  const isMobile = vpW <= 860;

  let minX, maxX, minY, maxY;

  if (isMobile) {
    minX = Math.max(10, (vpW - cardW) / 2 - 14);
    maxX = Math.min(vpW - cardW - 10, (vpW - cardW) / 2 + 14);
    const headerEl = document.getElementById('siteHeader');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 190;
    const topSafe = Math.max(180, headerBottom + 12);
    minY = Math.min(topSafe + index * 16, Math.max(topSafe, vpH - cardH - 30));
    maxY = Math.min(minY + 20, Math.max(topSafe + 10, vpH - cardH - 15));
  } else {
    const slotWidth = (vpW - 100) / totalCards;
    const slotLeft = 50 + index * slotWidth;
    minX = slotLeft - 40;
    maxX = slotLeft + (slotWidth - cardW) + 40;
    minY = Math.max(220, vpH * 0.42);
    maxY = Math.max(minY + 40, vpH - cardH - 40);
  }

  // 70% viewport retention clamp
  const clampMinX = -cardW * (1 - CONFIG.viewportRetention);
  const clampMaxX = vpW - cardW * CONFIG.viewportRetention;
  const clampMinY = -cardH * (1 - CONFIG.viewportRetention);
  const clampMaxY = vpH - cardH * CONFIG.viewportRetention;

  minX = Math.max(clampMinX, minX);
  maxX = Math.min(clampMaxX, maxX);
  if (minX > maxX) maxX = minX;

  minY = Math.max(clampMinY, minY);
  maxY = Math.min(clampMaxY, maxY);
  if (minY > maxY) maxY = minY;

  return {
    x: Math.round(minX + Math.random() * (maxX - minX)),
    y: Math.round(minY + Math.random() * (maxY - minY)),
    rotation: Math.round(Math.random() * CONFIG.rotationRange - CONFIG.rotationRange / 2),
    baseZIndex: 5 + Math.floor(Math.random() * 15),
  };
}

/**
 * Apply position, rotation, z-index, and hover-color to a card DOM element.
 */
export function applyCardTransform(card, pos, animated = true) {
  card.style.setProperty('--curr-rot', `${pos.rotation}deg`);
  card.style.left = `${pos.x}px`;
  card.style.top = `${pos.y}px`;
  card.style.transform = `rotate(${pos.rotation}deg)`;
  card.style.zIndex = pos.baseZIndex;

  const hoverHex = card.dataset.hoverColor || '#FFFFFF';
  card.style.setProperty('--card-hover-hex', hoverHex);

  if (animated) {
    card.classList.add('card-entering');
    card.addEventListener('animationend', () => card.classList.remove('card-entering'), { once: true });
  }
}

/**
 * Randomize all cards in a group.
 */
export function randomizeGroupPositions(cards, animated = true) {
  const total = cards.length;
  cards.forEach((card, i) => {
    const pos = calculateSafeCardPosition(card, i, total);
    state.cardStates.set(card, pos);
    applyCardTransform(card, pos, animated);
  });
}

/**
 * Animate cards exiting viewport, then run callback.
 */
export function exitCards(cards, direction, callback) {
  if (cards.length === 0) { callback?.(); return; }

  let done = 0;
  const cls = direction === 'side' ? 'card-exiting-side' : 'card-exiting-down';

  cards.forEach((card, i) => {
    const offset = (i % 2 === 0 ? 1 : -1) * (350 + Math.random() * 100);
    card.style.setProperty('--exit-x-offset', `${offset}px`);
    card.classList.add(cls);

    card.addEventListener('animationend', () => {
      card.classList.remove(cls);
      done++;
      if (done === cards.length) callback?.();
    }, { once: true });
  });
}
