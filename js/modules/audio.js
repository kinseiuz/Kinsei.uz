/**
 * KINSEI Studio — Phone-safe UI sounds
 * iOS Safari blocks Web Audio after the gesture; HTMLAudio + real WAV files play.
 */

import { t } from './i18n.js?v=17';
import { state } from '../state.js';
import { CONFIG } from '../config.js?v=11';

const SRC = {
  click: 'assets/sounds/tap.wav?v=1',
  banner: 'assets/sounds/tap.wav?v=1',
  card: 'assets/sounds/tap.wav?v=1',
  tab: 'assets/sounds/tab.wav?v=1',
  toggleOn: 'assets/sounds/tab.wav?v=1',
  grab: 'assets/sounds/grab.wav?v=1',
  drop: 'assets/sounds/drop.wav?v=1',
  success: 'assets/sounds/success.wav?v=1',
};

const players = {};
let unlocked = false;

function makePlayer(src) {
  const a = new Audio(src);
  a.preload = 'auto';
  a.playsInline = true;
  a.setAttribute('playsinline', '');
  a.setAttribute('webkit-playsinline', '');
  a.muted = false;
  a.volume = 1;
  return a;
}

function ensurePlayers() {
  if (Object.keys(players).length) return;
  const unique = [...new Set(Object.values(SRC))];
  const bySrc = {};
  unique.forEach((src) => { bySrc[src] = makePlayer(src); });
  Object.entries(SRC).forEach(([key, src]) => {
    players[key] = bySrc[src];
  });
}

function unlockFromGesture() {
  ensurePlayers();
  if (unlocked) return;
  unlocked = true;
  Object.values(players).forEach((a) => {
    try {
      a.muted = true;
      a.volume = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
          a.volume = 1;
        }).catch(() => {
          a.muted = false;
          a.volume = 1;
        });
      } else {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        a.volume = 1;
      }
    } catch {
      a.muted = false;
      a.volume = 1;
    }
  });
}

export function initAudio() {
  if (CONFIG.showSound === false) {
    state.sfxEnabled = false;
    return;
  }
  ensurePlayers();

  try {
    const saved = localStorage.getItem('kinsei_sfx');
    if (saved !== null) state.sfxEnabled = saved === 'true';
  } catch {
    /* ignore */
  }

  const unlock = () => unlockFromGesture();
  window.addEventListener('touchstart', unlock, { capture: true, passive: true });
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('click', unlock, { capture: true, passive: true });

  const toggleBtn = document.getElementById('soundToggleBtn');
  if (toggleBtn) {
    updateSoundToggleUI(toggleBtn);
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSound();
    });
  }

  window.addEventListener('kinsei-lang', () => {
    updateSoundToggleUI(document.getElementById('soundToggleBtn'));
  });
}

export function toggleSound() {
  state.sfxEnabled = !state.sfxEnabled;
  try {
    localStorage.setItem('kinsei_sfx', String(state.sfxEnabled));
  } catch {
    /* ignore */
  }
  updateSoundToggleUI(document.getElementById('soundToggleBtn'));
  if (state.sfxEnabled) playSound('toggleOn');
}

function updateSoundToggleUI(btn) {
  if (!btn) return;
  const isMuted = !state.sfxEnabled;
  btn.setAttribute('data-muted', isMuted ? 'true' : 'false');
  btn.setAttribute('aria-label', isMuted ? t('soundUnmute') : t('soundMute'));
  btn.setAttribute('title', isMuted ? t('soundUnmute') : t('soundMute'));
}

export function playSound(type) {
  if (CONFIG.showSound === false) return;
  if (!state.sfxEnabled) return;
  ensurePlayers();
  const a = players[type] || players.click;
  if (!a) return;
  try {
    a.muted = false;
    a.volume = 1;
    a.pause();
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}
