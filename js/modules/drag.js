/**
 * KINSEI Studio — Card hover layers & drag
 *
 * Hover lifts a card so it is fully visible; leaving restores its own layer.
 * Dragging (desktop) or touching (phone) pins that card on top until another
 * card is dragged or touched. Hover never pins.
 */

import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { playSound } from './audio.js?v=24';
import { openProjectModal } from './modal.js?v=45';
import { formPos, applyFormScreenPos, closeServiceMenu, toastPos, applyToastScreenPos, pauseToastHide, resumeToastHide } from './form.js?v=32';
import { viewW, viewH } from '../viewport.js?v=2';

const CARD_DRAG_PX = 12;
const RUBBER = 0.55;
const SETTLE_MS = 520;
const SETTLE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SETTLE_TRANSITION = `left ${SETTLE_MS}ms ${SETTLE_EASE}, top ${SETTLE_MS}ms ${SETTLE_EASE}`;

const dragFlags = new WeakMap();
const hoverOutTimers = new WeakMap();
const hoverLock = new WeakMap();
let session = null;
let listenersBound = false;
let suppressMouseHoverUntil = 0;
let suppressFormClick = null;

export function setupDraggable(card) {
  dragFlags.set(card, false);

  card.addEventListener('pointerenter', (e) => {
    if (session) return;
    if (!hoverAllowed(e.pointerType)) return;
    updateHover(cardFromPoint(e.clientX, e.clientY));
  });

  card.addEventListener('pointerleave', (e) => {
    if (session) return;
    if (!hoverAllowed(e.pointerType)) return;
    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
    const next = cardFromPoint(e.clientX, e.clientY);
    if (next === card) return;
    updateHover(next);
  });

  card.addEventListener('click', (e) => {
    if (dragFlags.get(card)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

export function initCardInteraction() {
  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false });
  window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  window.addEventListener('pointerup', endSession);
  window.addEventListener('pointercancel', endSession);
  window.addEventListener('lostpointercapture', onLostCapture);
  window.addEventListener('blur', () => endSession({ pointerId: session?.pointerId }));
  window.addEventListener('touchmove', onTouchMoveGuard, { capture: true, passive: false });
}

function onTouchMoveGuard(e) {
  if (session?.hasDragged) e.preventDefault();
}

function onPointerDown(e) {
  if (e.button !== 0 || e.isPrimary === false) return;
  if (session) return;

  const toastEl = document.getElementById('toastNotification');
  if (toastEl?.classList.contains('toast-active') && toastEl.contains(e.target)) {
    startToastDrag(e, toastEl);
    return;
  }

  if (e.target.closest?.('.modal-card, .card-back-link')) return;

  const formEl = document.getElementById('contactSection');
  if (
    formEl?.classList.contains('mobile-contact-visible') &&
    window.innerWidth <= 860 &&
    formEl.contains(e.target)
  ) {
    if (e.target.closest?.('.custom-select-menu')) return;
    startFormDrag(e, formEl);
    return;
  }

  const card = cardFromPoint(e.clientX, e.clientY);
  if (!card) return;
  if (card.classList.contains('is-flipping')) return;

  playSound('click');
  if (e.pointerType !== 'mouse') e.preventDefault();

  const live = freezeLivePosition(card);
  const cur = state.cardStates.get(card) || {
    x: live.x,
    y: live.y,
    rotation: 0,
    baseZIndex: Number(card.dataset.baseZ) || 10,
  };
  cur.x = live.x;
  cur.y = live.y;

  dragFlags.set(card, false);
  if (e.pointerType !== 'mouse') pinCard(card);
  session = {
    card,
    pointerId: e.pointerId,
    pointerType: e.pointerType || 'mouse',
    startX: e.clientX,
    startY: e.clientY,
    initX: cur.x,
    initY: cur.y,
    hasDragged: false,
    lastTime: performance.now(),
    lastPX: e.clientX,
    lastPY: e.clientY,
    vx: 0,
    vy: 0,
    cur,
    captured: false,
  };
  card.classList.add('is-pressed', 'is-hovered');
  if (e.pointerType !== 'mouse') {
    try {
      card.setPointerCapture(e.pointerId);
      session.captured = true;
    } catch {
      session.captured = false;
    }
  }
}

function startFormDrag(e, formEl) {
  const interactive = isFormInteractive(e.target);
  formEl.classList.remove('form-enter-up');
  const live = freezeLivePosition(formEl);
  formPos.x = live.x;
  formPos.y = live.y;
  session = {
    kind: 'form',
    el: formEl,
    pointerId: e.pointerId,
    pointerType: e.pointerType || 'mouse',
    startX: e.clientX,
    startY: e.clientY,
    initX: live.x,
    initY: live.y,
    hasDragged: false,
    captured: false,
    interactive,
    lastTime: performance.now(),
    lastPX: e.clientX,
    lastPY: e.clientY,
    vx: 0,
    vy: 0,
  };
  if (!interactive) {
    formEl.classList.add('is-form-pressed');
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
      try {
        formEl.setPointerCapture(e.pointerId);
        session.captured = true;
      } catch {
        session.captured = false;
      }
    }
  }
}

function isFormInteractive(el) {
  return !!el.closest?.('input, textarea, button, select, .custom-select-menu, .custom-select-option, .custom-select-trigger, a');
}

function startToastDrag(e, el) {
  pauseToastHide();
  const live = freezeOffsetPosition(el);
  toastPos.x = live.x;
  toastPos.y = live.y;
  session = {
    kind: 'toast',
    el,
    pointerId: e.pointerId,
    pointerType: e.pointerType || 'mouse',
    startX: e.clientX,
    startY: e.clientY,
    initX: live.x,
    initY: live.y,
    hasDragged: false,
    captured: false,
    lastTime: performance.now(),
    lastPX: e.clientX,
    lastPY: e.clientY,
    vx: 0,
    vy: 0,
  };
  el.classList.add('is-toast-pressed');
  if (e.pointerType !== 'mouse') {
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
      session.captured = true;
    } catch {
      session.captured = false;
    }
  }
}

function onPointerMove(e) {
  if (!session) {
    if (hoverAllowed(e.pointerType)) updateHover(cardFromPoint(e.clientX, e.clientY));
    return;
  }
  if (e.pointerId !== session.pointerId) return;

  // Mouse: buttons===0 means the press ended without a pointerup.
  // Touch/pen: browsers often report buttons===0 during move, which used to
  // kill the drag after a few millimeters.
  if (session.pointerType === 'mouse' && e.buttons === 0) {
    endSession(e);
    return;
  }

  if (session.kind === 'form') {
    moveForm(e);
    return;
  }
  if (session.kind === 'toast') {
    moveToast(e);
    return;
  }

  const dx = e.clientX - session.startX;
  const dy = e.clientY - session.startY;

  if (!session.hasDragged && Math.hypot(dx, dy) > CARD_DRAG_PX) {
    session.hasDragged = true;
    dragFlags.set(session.card, true);
    state.isDragging = true;
    state.activeDragCard = session.card;
    state.skipHoverCard = null;
    pinCard(session.card);
    session.card.classList.add('is-dragging', 'is-hovered');
    session.card.style.zIndex = String(dragZ());
    try {
      session.card.setPointerCapture(e.pointerId);
      session.captured = true;
    } catch {
      session.captured = false;
    }
    playSound('grab');
  }

  if (session.hasDragged) e.preventDefault();
  if (!session.hasDragged) return;

  const now = performance.now();
  const dt = Math.max(1, now - session.lastTime);
  session.vx = (e.clientX - session.lastPX) / dt;
  session.vy = (e.clientY - session.lastPY) / dt;
  session.lastTime = now;
  session.lastPX = e.clientX;
  session.lastPY = e.clientY;

  const card = session.card;
  const cW = card.offsetWidth;
  const cH = card.offsetHeight;
  const bounds = restBounds(cW, cH, viewW(), viewH());
  const cx = rubberClamp(session.initX + dx, bounds.minX, bounds.maxX, viewW());
  const cy = rubberClamp(session.initY + dy, bounds.minY, bounds.maxY, viewH());

  card.style.left = `${cx}px`;
  card.style.top = `${cy}px`;
  session.cur.x = cx;
  session.cur.y = cy;
  state.cardStates.set(card, session.cur);
}

function onLostCapture(e) {
  if (!session || e.pointerId !== session.pointerId) return;
  session.captured = false;
  if (session.pointerType === 'mouse') endSession(e);
}

function moveForm(e) {
  const dx = e.clientX - session.startX;
  const dy = e.clientY - session.startY;

  if (!session.hasDragged && Math.hypot(dx, dy) > CONFIG.dragThreshold) {
    session.hasDragged = true;
    session.el.classList.add('is-form-dragging', 'is-form-pressed');
    closeServiceMenu();
    const active = document.activeElement;
    if (active && session.el.contains(active) && typeof active.blur === 'function') {
      active.blur();
    }
    window.getSelection?.()?.removeAllRanges?.();
    try {
      session.el.setPointerCapture(e.pointerId);
      session.captured = true;
    } catch {
      session.captured = false;
    }
  }

  if (session.hasDragged) e.preventDefault();
  if (!session.hasDragged) return;

  const now = performance.now();
  const dt = Math.max(1, now - session.lastTime);
  session.vx = (e.clientX - session.lastPX) / dt;
  session.vy = (e.clientY - session.lastPY) / dt;
  session.lastTime = now;
  session.lastPX = e.clientX;
  session.lastPY = e.clientY;

  const el = session.el;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const bounds = restBounds(w, h, viewW(), viewH());
  formPos.x = rubberClamp(session.initX + dx, bounds.minX, bounds.maxX, viewW());
  formPos.y = rubberClamp(session.initY + dy, bounds.minY, bounds.maxY, viewH());
  formPos.dragged = true;
  applyFormScreenPos();
}

function moveToast(e) {
  const dx = e.clientX - session.startX;
  const dy = e.clientY - session.startY;

  if (!session.hasDragged && Math.hypot(dx, dy) > CONFIG.dragThreshold) {
    session.hasDragged = true;
    session.el.classList.add('is-toast-dragging', 'is-toast-pressed');
    try {
      session.el.setPointerCapture(e.pointerId);
      session.captured = true;
    } catch {
      session.captured = false;
    }
  }

  if (session.hasDragged) e.preventDefault();
  if (!session.hasDragged) return;

  const now = performance.now();
  const dt = Math.max(1, now - session.lastTime);
  session.vx = (e.clientX - session.lastPX) / dt;
  session.vy = (e.clientY - session.lastPY) / dt;
  session.lastTime = now;
  session.lastPX = e.clientX;
  session.lastPY = e.clientY;

  const el = session.el;
  const bounds = restBounds(el.offsetWidth, el.offsetHeight, viewW(), viewH());
  toastPos.x = rubberClamp(session.initX + dx, bounds.minX, bounds.maxX, viewW());
  toastPos.y = rubberClamp(session.initY + dy, bounds.minY, bounds.maxY, viewH());
  toastPos.dragged = true;
  applyToastScreenPos();
}

function endToastSession() {
  const { el, captured, pointerId, hasDragged, vx, vy } = session;
  if (captured) {
    try { el.releasePointerCapture(pointerId); } catch { /* already released */ }
  }
  el.classList.remove('is-toast-dragging', 'is-toast-pressed');
  if (hasDragged) {
    const settled = settlePoint(
      toastPos.x,
      toastPos.y,
      vx || 0,
      vy || 0,
      el.offsetWidth,
      el.offsetHeight,
      viewW(),
      viewH(),
    );
    toastPos.x = settled.x;
    toastPos.y = settled.y;
    el.style.transition = SETTLE_TRANSITION;
    applyToastScreenPos();
    setTimeout(() => { if (el) el.style.transition = ''; }, SETTLE_MS);
  }
  session = null;
  state.isDragging = false;
  resumeToastHide();
}

function endFormSession() {
  const { el, captured, pointerId, hasDragged, vx, vy } = session;
  if (captured) {
    try { el.releasePointerCapture(pointerId); } catch { /* already released */ }
  }
  el.classList.remove('is-form-dragging', 'is-form-pressed');
  if (hasDragged) {
    const settled = settlePoint(
      formPos.x,
      formPos.y,
      vx || 0,
      vy || 0,
      el.offsetWidth,
      el.offsetHeight,
      viewW(),
      viewH(),
    );
    formPos.x = settled.x;
    formPos.y = settled.y;
    el.style.transition = SETTLE_TRANSITION;
    applyFormScreenPos();
    setTimeout(() => { if (el) el.style.transition = ''; }, SETTLE_MS);
    if (suppressFormClick) {
      el.removeEventListener('click', suppressFormClick, true);
    }
    suppressFormClick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    el.addEventListener('click', suppressFormClick, true);
    setTimeout(() => {
      el.removeEventListener('click', suppressFormClick, true);
      suppressFormClick = null;
    }, 400);
  }
  session = null;
  state.isDragging = false;
}

function endSession(e) {
  if (!session) return;
  if (e?.pointerId != null && session.pointerId != null && e.pointerId !== session.pointerId) return;

  if (session.kind === 'form') {
    endFormSession();
    return;
  }
  if (session.kind === 'toast') {
    endToastSession();
    return;
  }

  const { card, hasDragged, cur, vx, vy, captured, pointerId } = session;
  const previewId = card.dataset.projectPreview;
  const coordsOk = Number.isFinite(e?.clientX) && Number.isFinite(e?.clientY);
  const stillOnCard = !coordsOk || pointOnCard(card, e.clientX, e.clientY);
  const openOnRelease = !hasDragged && previewId && stillOnCard && !card.classList.contains('is-flipping');

  if (captured) {
    try { card.releasePointerCapture(pointerId); } catch { /* already released */ }
  }

  card.classList.remove('is-dragging', 'is-pressed');

  const pointerType = session.pointerType;
  const keepMouseHover = hoverAllowed(pointerType);

  if (!keepMouseHover) suppressMouseHoverUntil = performance.now() + 700;

  if (hasDragged) {
    playSound('drop');
    const settled = settlePoint(
      cur.x,
      cur.y,
      vx,
      vy,
      card.offsetWidth,
      card.offsetHeight,
      viewW(),
      viewH(),
    );
    card.style.transition = SETTLE_TRANSITION;
    card.style.left = `${settled.x}px`;
    card.style.top = `${settled.y}px`;
    cur.x = settled.x;
    cur.y = settled.y;
    state.cardStates.set(card, cur);
    setTimeout(() => {
      card.style.transition = '';
      if (!keepMouseHover || state.hoveredCard !== card) scheduleHoverOut(card);
    }, SETTLE_MS);
  }

  session = null;
  state.isDragging = false;
  state.activeDragCard = null;

  if (keepMouseHover) {
    state.hoveredCard = null;
    const stillOver = pointOnCard(card, e?.clientX, e?.clientY)
      ? card
      : (e && Number.isFinite(e.clientX) ? cardFromPoint(e.clientX, e.clientY) : null);
    updateHover(stillOver);
  } else {
    clearHover(card);
  }

  if (openOnRelease) {
    playSound('banner');
    openProjectModal(previewId, card);
  }
}

function hoverAllowed(pointerType) {
  if (window.innerWidth <= 860) return false;
  if (pointerType && pointerType !== 'mouse') return false;
  if (performance.now() < suppressMouseHoverUntil) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function cancelHoverOut(card) {
  if (!card) return;
  const t = hoverOutTimers.get(card);
  if (t) clearTimeout(t);
  hoverOutTimers.delete(card);
}

function scheduleHoverOut(card) {
  if (!card) return;
  cancelHoverOut(card);
  card.classList.remove('is-hovered');
  applyStackLayer(card);
  hoverLock.set(card, performance.now() + 120);
}

function clearHover(card) {
  const prev = state.hoveredCard;
  state.hoveredCard = null;
  if (prev && prev !== card) scheduleHoverOut(prev);
  scheduleHoverOut(card);
}

function updateHover(card) {
  if (card && (hoverLock.get(card) || 0) > performance.now()) {
    card = null;
  }
  if (card) cancelHoverOut(card);

  const prev = state.hoveredCard;
  if (prev === card) {
    if (card && card !== state.activeDragCard) {
      card.style.zIndex = String(hoverZ());
      card.classList.add('is-hovered');
    }
    return;
  }

  state.hoveredCard = card;
  if (prev && prev !== state.activeDragCard) {
    prev.classList.remove('is-hovered');
    applyStackLayer(prev);
  }

  if (card && card !== state.activeDragCard) {
    card.style.zIndex = String(hoverZ());
    card.classList.add('is-hovered');
  }
}

function hoverZ() {
  return (state.stackFront || 10) + 1;
}

function dragZ() {
  return (state.stackFront || 10) + 2;
}

function pinCard(card) {
  if (!card) return;
  state.stackFront = (state.stackFront || 10) + 1;
  const cur = state.cardStates.get(card);
  if (cur) {
    cur.baseZIndex = state.stackFront;
    state.cardStates.set(card, cur);
  }
  card.dataset.baseZ = String(state.stackFront);
  state.pinnedCard = card;
  applyStackLayer(card);
}

function applyStackLayer(card) {
  if (!card) return;
  if (state.activeDragCard === card) {
    card.style.zIndex = String(dragZ());
    return;
  }
  if (state.hoveredCard === card) {
    card.style.zIndex = String(hoverZ());
    return;
  }
  const cur = state.cardStates.get(card);
  const z = cur?.baseZIndex ?? Number(card.dataset.baseZ ?? 1);
  card.style.zIndex = String(z);
}

function restoreBaseLayer(card) {
  applyStackLayer(card);
}

function cardFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const card = el?.closest?.('.neo-card');
  if (card?.closest('.cards-group.active-group')) return card;
  return null;
}

function pointOnCard(card, x, y) {
  if (!card || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const r = card.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function restBounds(w, h, vpW, vpH) {
  const r = CONFIG.viewportRetention;
  return {
    minX: -w * (1 - r),
    maxX: vpW - w * r,
    minY: -h * (1 - r),
    maxY: vpH - h * r,
  };
}

function rubberBand(over, size) {
  if (over <= 0) return 0;
  const dim = Math.max(1, size);
  return (over * dim * RUBBER) / (dim + over);
}

function rubberClamp(value, min, max, size) {
  if (value < min) return min - rubberBand(min - value, size);
  if (value > max) return max + rubberBand(value - max, size);
  return value;
}

function settlePoint(x, y, vx, vy, w, h, vpW, vpH) {
  const b = restBounds(w, h, vpW, vpH);
  let tx = x + vx * 80;
  let ty = y + vy * 80;
  if (x < b.minX) tx = b.minX;
  else if (x > b.maxX) tx = b.maxX;
  else tx = clamp(tx, b.minX, b.maxX);
  if (y < b.minY) ty = b.minY;
  else if (y > b.maxY) ty = b.maxY;
  else ty = clamp(ty, b.minY, b.maxY);
  return { x: tx, y: ty };
}

function freezeLivePosition(el) {
  el.style.transition = 'none';
  void el.offsetWidth;
  return {
    x: parseFloat(getComputedStyle(el).left) || 0,
    y: parseFloat(getComputedStyle(el).top) || 0,
  };
}

function freezeOffsetPosition(el) {
  const r = el.getBoundingClientRect();
  el.style.transition = 'none';
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.margin = '0';
  void el.offsetWidth;
  return { x: r.left, y: r.top };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
