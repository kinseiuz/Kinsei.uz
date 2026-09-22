/**
 * KINSEI Studio — Card Physics & Random Positioning
 */

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { viewW, viewH } from '../viewport.js?v=2';

/**
 * Calculate safe random card position within viewport,
 * avoiding header & contact form UI zones.
 */
export function calculateSafeCardPosition(card, index, totalCards) {
  const vpW = viewW();
  const vpH = viewH();
  const isMobile = vpW <= 860;
  const cardW = card.offsetWidth || (isMobile ? 248 : 320);
  const cardH = card.offsetHeight || (isMobile ? 210 : 260);

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
    baseZIndex: 0,
  };
}

/**
 * Apply position, rotation, z-index, and hover-color to a card DOM element.
 * When animated, the card is thrown from a shared origin (like a hand dealing).
 */
export function applyCardTransform(card, pos, animated = true, delayMs = 0, origin = null) {
  card.style.setProperty('--curr-rot', `${pos.rotation}deg`);
  card.style.left = `${pos.x}px`;
  card.style.top = `${pos.y}px`;
  card.style.removeProperty('transform');
  card.dataset.baseZ = String(pos.baseZIndex);
  card.style.zIndex = String(pos.baseZIndex);

  const hoverHex = card.dataset.hoverColor || '#FFFFFF';
  card.style.setProperty('--card-hover-hex', hoverHex);

  if (animated) {
    const handX = origin?.x ?? viewW() * 0.5;
    const handY = origin?.y ?? viewH() + 120;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 130);

    card.style.setProperty('--throw-x', `${Math.round(handX - pos.x)}px`);
    card.style.setProperty('--throw-y', `${Math.round(handY - pos.y)}px`);
    card.style.setProperty('--throw-rot', `${pos.rotation + spin}deg`);
    card.style.setProperty('--throw-dur', `${(0.5 + Math.random() * 0.14).toFixed(2)}s`);

    card.classList.remove('card-entering', 'is-dealt');
    void card.offsetWidth;
    card.style.animationDelay = `${delayMs}ms`;
    card.classList.add('card-entering', 'is-dealt');
    card.addEventListener('animationend', (e) => {
      if (e.target !== card) return;
      card.classList.remove('card-entering');
      card.style.animationDelay = '';
    }, { once: true });
  } else {
    card.classList.add('is-dealt');
  }
}

function shuffledIndices(n) {
  const slots = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

/**
 * Randomize all cards in a group.
 * Thrown from one origin so they land like a handful of cards tossed on a table.
 */
export function randomizeGroupPositions(cards, animated = true) {
  const total = cards.length;
  const slots = shuffledIndices(total);
  const delays = shuffledIndices(total).map((rank) => rank * 55);
  const origin = {
    x: viewW() * 0.5 + (Math.random() - 0.5) * 36,
    y: viewH() + 110,
  };
  state.hoveredCard = null;
  state.pinnedCard = null;
  state.stackFront = 10;
  state.skipHoverCard = null;
  cards.forEach((card) => card.classList.remove('is-hovered', 'is-dragging', 'is-pressed'));

  const layers = shuffledIndices(total);

  cards.forEach((card, i) => {
    const pos = calculateSafeCardPosition(card, slots[i], total);
    pos.baseZIndex = 1 + layers[i];
    state.cardStates.set(card, pos);
    applyCardTransform(card, pos, animated, animated ? delays[i] : 0, origin);
  });
}

/**
 * Animate cards exiting viewport, then run callback.
 */
export function exitCards(cards, direction, callback) {
  if (cards.length === 0) { callback?.(); return; }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    callback?.();
    cards.forEach((card) => {
      card.classList.remove('card-entering', 'card-exiting-down', 'card-exiting-side');
      card.style.animationDelay = '';
      card.style.removeProperty('--exit-x-offset');
    });
  };

  const cls = direction === 'side' ? 'card-exiting-side' : 'card-exiting-down';
  let done = 0;
  const leaveX = viewW() + 160;

  cards.forEach((card, i) => {
    const offset = (i % 2 === 0 ? 1 : -1) * leaveX;
    card.style.setProperty('--exit-x-offset', `${offset}px`);
    card.style.animationDelay = '0ms';
    card.classList.remove('card-entering');
    void card.offsetWidth;
    card.classList.add(cls);

    card.addEventListener('animationend', (e) => {
      if (e.target !== card) return;
      done++;
      if (done === cards.length) finish();
    }, { once: true });
  });

  setTimeout(finish, 720);
}
