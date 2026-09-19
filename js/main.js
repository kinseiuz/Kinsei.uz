/**
 * KINSEI Studio — Application Entry Point (Figma-exact)
 * No status bar, no SFX, no cursor glow, no shuffle button.
 */

import { state } from './state.js';
import { randomizeGroupPositions } from './modules/cards.js';
import { setupDraggable } from './modules/drag.js';
import { initTabs, setActiveTab, getProjectCards, getTeamCards } from './modules/tabs.js';
import { initForm } from './modules/form.js';
import { initModal, openProjectModal, closeModal } from './modules/modal.js';
import { initAudio, playSound } from './modules/audio.js';

document.addEventListener('DOMContentLoaded', () => {
  // ── Initialize modules ──
  initAudio();
  initTabs();
  initForm();
  initModal();

  // ── Tactile Button Click Sound Effects ──
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, .tab-btn, .mobile-tab-btn, .social-link, .mobile-icon-btn, .card-title-link, .modal-close-btn');
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

  // ── Bind drag & drop ──
  [...projectCards, ...teamCards].forEach(setupDraggable);

  // ── Project preview modal ──
  document.querySelectorAll('.card-title-link[data-project-preview]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.dataset.projectPreview;
      if (id) openProjectModal(id);
    });
  });

  // ── Keyboard Shortcuts ──
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case '1': setActiveTab('projects'); break;
      case '2': setActiveTab('team');     break;
      case '3': setActiveTab('contact');  break;
      case 'Escape': closeModal(); break;
    }
  });

  // ── Resize reflow ──
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const cards = state.currentTab === 'team' ? teamCards : projectCards;
      randomizeGroupPositions(cards, false);
    }, 150);
  });

  // ── Boot: Projects view ──
  document.getElementById('projectsGroup').classList.add('active-group');
  document.getElementById('teamGroup').classList.remove('active-group');
  randomizeGroupPositions(projectCards, true);
});
