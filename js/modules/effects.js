/**
 * KINSEI Studio — Ambient Visual Effects (Cursor Glow, Live Clock)
 */

import { state } from '../state.js';

/** Track cursor and move the radial glow spotlight */
export function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  window.addEventListener('pointermove', (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/** Real-time Tashkent clock in header status bar */
export function initLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  function tick() {
    el.textContent = `TOSHKENT: ${fmt.format(new Date())} GMT+5`;
  }

  tick();
  setInterval(tick, 1000);
}

/** SFX toggle button */
export function initSFXToggle() {
  const btn = document.getElementById('sfxToggle');
  const icon = document.getElementById('sfxIcon');
  if (!btn) return;

  btn.addEventListener('click', () => {
    state.sfxEnabled = !state.sfxEnabled;
    icon.textContent = state.sfxEnabled ? '🔊' : '🔇';
    btn.querySelector('.util-label').textContent = state.sfxEnabled ? 'SFX: YOQILGAN' : "SFX: O'CHIQ";
  });
}
