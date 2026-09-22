/**
 * KINSEI Studio — Application Entry Point (Figma-exact)
 * No status bar, no SFX, no cursor glow, no shuffle button.
 */

import { CONFIG } from './config.js?v=8';
import { state } from './state.js';
import { randomizeGroupPositions } from './modules/cards.js?v=28';
import { setupDraggable, initCardInteraction } from './modules/drag.js?v=49';
import { initTabs, setActiveTab, getProjectCards, getTeamCards, readSavedTab, bootActiveTab } from './modules/tabs.js?v=37';
import { initForm } from './modules/form.js?v=28';
import { initModal, openProjectModal, closeModal } from './modules/modal.js?v=26';
import { initAudio, playSound } from './modules/audio.js?v=20';
import { initI18n } from './modules/i18n.js?v=2';
import { initLogoMark } from './modules/logo.js?v=2';
import { bindViewportFill } from './viewport.js?v=2';

bindViewportFill();

document.addEventListener('DOMContentLoaded', () => {
  applyNavVisibility();

  // ── Initialize modules ──
  initDynamicFavicon();
  initLogoMark();
  initI18n();
  initAudio();
  initTabs();
  initForm();
  initModal();

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, .tab-btn, .mobile-tab-btn, .social-link, .mobile-icon-btn, .modal-close-btn');
    if (!el || el.id === 'soundToggleBtn') return;

    if (el.classList.contains('tab-btn') || el.classList.contains('mobile-tab-btn')) {
      playSound('tab');
    } else {
      playSound('click');
    }
  });

  // ── Get card collections ──
  const projectCards = getProjectCards();
  const teamCards = getTeamCards();

  // ── Bind drag, hover layers, and drop ──
  [...projectCards, ...teamCards].forEach(setupDraggable);
  initCardInteraction();

  // ── Keyboard Shortcuts ──
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (CONFIG.showNav) {
      switch (e.key) {
        case '1': setActiveTab('projects'); break;
        case '2': setActiveTab('team');     break;
        case '3':
          if (window.innerWidth <= 860) setActiveTab('contact');
          break;
      }
      return;
    }
    if (CONFIG.showMobileNav && window.innerWidth <= 860) {
      if (e.key === '1') setActiveTab('projects');
      if (e.key === '2' || e.key === '3') setActiveTab('contact');
    }
  });

  // ── Resize reflow ──
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.currentTab === 'contact') return;
      const cards = state.currentTab === 'team' ? teamCards : projectCards;
      randomizeGroupPositions(cards, false);
    }, 150);
  });

  // ── Boot ──
  bootActiveTab(pickBootTab());
  trackVisit();
});

function visitorId() {
  const key = 'kinsei_vid';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `k-${Date.now()}`;
  }
}

function trackVisit() {
  const payload = JSON.stringify({
    vid: visitorId(),
    ref: document.referrer || '',
    lang: document.documentElement.lang || 'uz',
    w: window.innerWidth,
    h: window.innerHeight,
    ua: navigator.userAgent,
  });
  const blob = new Blob([payload], { type: 'application/json' });
  if (navigator.sendBeacon && navigator.sendBeacon('/api/hit', blob)) return;
  fetch('/api/hit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function pickBootTab() {
  if (CONFIG.showNav) return readSavedTab();
  if (CONFIG.showMobileNav && window.innerWidth <= 860) {
    const saved = readSavedTab();
    return saved === 'team' ? CONFIG.defaultTab : saved;
  }
  return CONFIG.defaultTab;
}

function applyNavVisibility() {
  const showNav = CONFIG.showNav;
  const showMobileNav = CONFIG.showMobileNav !== false;
  const showSocial = CONFIG.showSocial !== false;

  document.body.classList.toggle('solo-team', !showNav);
  document.body.classList.toggle('hide-social', !showSocial);
  document.body.classList.toggle('hide-teahouse', CONFIG.showTeahouse === false);
  document.body.classList.toggle('hide-sound', CONFIG.showSound === false);

  document.querySelectorAll('.tab-switcher').forEach((el) => {
    el.hidden = !showNav;
    el.setAttribute('aria-hidden', showNav ? 'false' : 'true');
  });

  document.querySelectorAll('.mobile-tab-bar').forEach((el) => {
    el.hidden = !showMobileNav;
    el.setAttribute('aria-hidden', showMobileNav ? 'false' : 'true');
  });

  document.querySelectorAll('.social-links-desktop, .social-icons-mobile').forEach((el) => {
    el.hidden = !showSocial;
    el.setAttribute('aria-hidden', showSocial ? 'false' : 'true');
  });
}

/**
 * Automatically adapt browser favicon to light / dark browser theme
 */
function initDynamicFavicon() {
  const faviconLink = document.getElementById('dynamicFavicon') || document.querySelector('link[rel="icon"]');
  if (!faviconLink) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const updateFavicon = (e) => {
    const isDark = (e && typeof e.matches === 'boolean') ? e.matches : mediaQuery.matches;
    faviconLink.href = isDark ? 'assets/favicons/favicon-dark.png' : 'assets/favicons/favicon-light.png';
  };

  updateFavicon(mediaQuery);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', updateFavicon);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(updateFavicon);
  }
}

