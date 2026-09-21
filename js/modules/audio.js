/**
 * KINSEI Studio — Web Audio SFX Synthesizer
 * Zero external audio files; all sounds generated procedurally via Web Audio API.
 */

import { t } from './i18n.js?v=1';
import { state } from '../state.js';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Unlock audio on first user gesture
function setupAudioUnlock() {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

export function initAudio() {
  setupAudioUnlock();

  // Load saved preference
  try {
    const saved = localStorage.getItem('kinsei_sfx');
    if (saved !== null) {
      state.sfxEnabled = saved === 'true';
    }
  } catch (e) {
    // localStorage not accessible
  }

  // Bind sound toggle button
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
  } catch (e) {}

  const toggleBtn = document.getElementById('soundToggleBtn');
  if (toggleBtn) {
    updateSoundToggleUI(toggleBtn);
  }

  if (state.sfxEnabled) {
    playSound('toggleOn');
  }
}

function updateSoundToggleUI(btn) {
  if (!btn) return;
  const isMuted = !state.sfxEnabled;
  btn.setAttribute('data-muted', isMuted ? 'true' : 'false');
  btn.setAttribute('aria-label', isMuted ? t('soundUnmute') : t('soundMute'));
  btn.setAttribute('title', isMuted ? t('soundUnmute') : t('soundMute'));
}

export function playSound(type) {
  if (!state.sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (type) {
    // ── Tactile crisp button click ──
    case 'click': {
      // Layer 1: High frequency snap (850Hz -> 180Hz in 25ms)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(850, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.025);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.025);

      // Layer 2: Subtle warm body punch (320Hz -> 80Hz in 20ms)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(320, now);
      osc2.frequency.exponentialRampToValueAtTime(80, now + 0.02);
      gain2.gain.setValueAtTime(0.05, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.02);
      break;
    }

    // ── Tab switch ──
    case 'tab': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.07);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      break;
    }

    // ── Tactile Rich Banner / Card Tap ──
    case 'banner':
    case 'card': {
      // High snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.045);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.045);

      // Warm punch
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(280, now);
      osc2.frequency.exponentialRampToValueAtTime(75, now + 0.04);
      gain2.gain.setValueAtTime(0.09, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.04);
      break;
    }

    // ── Sound Unmute Blip ──
    case 'toggleOn': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }

    // ── Sound Mute Blip ──
    case 'toggleOff': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    // ── Card grab ──
    case 'grab': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    // ── Card drop ──
    case 'drop': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }

    // ── Successful form submission chime ──
    case 'success': {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        const start = now + idx * 0.07;
        const dur = 0.35;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.06, start);
        g.gain.exponentialRampToValueAtTime(0.0005, start + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(start);
        o.stop(start + dur);
      });
      break;
    }
  }
}
