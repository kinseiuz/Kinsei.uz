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
  const isMobile = vpW <= 860;
  const cardW = card.offsetWidth || (isMobile ? 242 : 320);
  const cardH = card.offsetHeight || (isMobile ? 245 : 260);

  let x, y, rotation;

  if (isMobile) {
    const headerEl = document.getElementById('siteHeader');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 205;
    const topSafe = Math.max(195, headerBottom + 12);
    const bottomSafe = Math.max(topSafe + 160, vpH - cardH * 0.72);
    const availableY = Math.max(60, bottomSafe - topSafe);

    if (totalCards <= 2) {
      // Team cards (2 members) - spread comfortably left & right
      const isFirst = index === 0;
      const targetX = isFirst ? 20 : (vpW - cardW - 20);
      x = Math.round(targetX + (Math.random() - 0.5) * 20);
      y = Math.round(topSafe + (isFirst ? 0.15 : 0.55) * availableY + (Math.random() - 0.5) * 20);
      rotation = Math.round((isFirst ? -6 : 6) + (Math.random() - 0.5) * 4);
    } else {
      // 5 Project Cards - balanced staggered placement across full canvas
      // Index 0: upper-left, Index 1: upper-right, Index 2: mid-left, Index 3: mid-right, Index 4: lower-center
      const horizontalAnchors = [
        -20,                       // Card 0: slightly sticking out on left
        vpW - cardW + 15,          // Card 1: sticking out on right
        (vpW - cardW) / 2 - 40,    // Card 2: center-left
        vpW - cardW - 15,          // Card 3: lower-right
        25                         // Card 4: lower-left
      ];
      const verticalFractions = [0.05, 0.28, 0.50, 0.72, 0.94];
      const rotAngles = [-8, 7, -5, 6, -3];

      const anchorX = horizontalAnchors[index % horizontalAnchors.length];
      const fractionY = verticalFractions[index % verticalFractions.length];
      const baseRot = rotAngles[index % rotAngles.length];

      x = Math.round(anchorX + (Math.random() - 0.5) * 24);
      y = Math.round(topSafe + fractionY * availableY + (Math.random() - 0.5) * 16);
      rotation = Math.round(baseRot + (Math.random() - 0.5) * 5);
    }
  } else {
    const slotWidth = (vpW - 120) / totalCards;
    const slotLeft = 60 + index * slotWidth;
    const minX = slotLeft - 30;
    const maxX = slotLeft + (slotWidth - cardW) + 30;
    const minY = Math.max(220, vpH * 0.40);
    const maxY = Math.max(minY + 30, vpH - cardH - 35);

    x = Math.round(minX + Math.random() * (maxX - minX));
    y = Math.round(minY + Math.random() * (maxY - minY));
    rotation = Math.round(Math.random() * CONFIG.rotationRange - CONFIG.rotationRange / 2);
  }

  // Strict 70% viewport retention clamp (up to 30% card size may peak past screen edges)
  const r = CONFIG.viewportRetention;
  const clampMinX = -cardW * (1 - r);
  const clampMaxX = vpW - cardW * r;
  const clampMinY = isMobile ? 180 : 0;
  const clampMaxY = vpH - cardH * r;

  x = Math.max(clampMinX, Math.min(clampMaxX, x));
  y = Math.max(clampMinY, Math.min(clampMaxY, y));

  return {
    x,
    y,
    rotation,
    baseZIndex: 5 + index * 4 + Math.floor(Math.random() * 2),
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
