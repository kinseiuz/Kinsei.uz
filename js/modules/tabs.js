/**
 * KINSEI Studio — Tab Navigation
 */

import { CONFIG } from '../config.js?v=11';
import { state } from '../state.js';
import { randomizeGroupPositions, exitCards } from './cards.js?v=34';
import { playSound } from './audio.js?v=23';
import { placeMobileForm, resetMobileFormPos } from './form.js?v=31';

const TAB_KEY = 'kinsei-tab';
const TABS = new Set(['projects', 'team', 'contact']);

let projectCards, teamCards;
let projectsGroup, teamGroup, contactSection;
let desktopTabProjects, desktopTabTeam, desktopTabContact;
let mobTabProjects, mobTabTeam, mobTabContact;
let switching = false;
let hideFormTimer = null;

function visibleProjectCards() {
  return Array.from(document.querySelectorAll('#projectsGroup .neo-card')).filter((card) => {
    if (card.dataset.cardId === 'teahouse' && !CONFIG.showTeahouse) return false;
    return true;
  });
}

export function initTabs() {
  projectCards = visibleProjectCards();
  teamCards = Array.from(document.querySelectorAll('#teamGroup .neo-card'));
  projectsGroup = document.getElementById('projectsGroup');
  teamGroup = document.getElementById('teamGroup');
  contactSection = document.getElementById('contactSection');
  desktopTabProjects = document.getElementById('tabProjects');
  desktopTabTeam = document.getElementById('tabTeam');
  desktopTabContact = document.getElementById('tabContact');
  mobTabProjects = document.getElementById('mobTabProjects');
  mobTabTeam = document.getElementById('mobTabTeam');
  mobTabContact = document.getElementById('mobTabContact');

  desktopTabProjects?.addEventListener('click', () => setActiveTab('projects'));
  desktopTabTeam?.addEventListener('click', () => setActiveTab('team'));
  desktopTabContact?.addEventListener('click', () => {
    setActiveTab('contact');
    document.getElementById('clientName')?.focus();
  });
  mobTabProjects?.addEventListener('click', () => setActiveTab('projects'));
  mobTabTeam?.addEventListener('click', () => setActiveTab('team'));
  mobTabContact?.addEventListener('click', () => setActiveTab('contact'));

  window.addEventListener('resize', () => {
    syncMobilePill();
    if (window.innerWidth > 860) applyDesktopFormReset();
  });
  window.addEventListener('kinsei-lang', () => {
    requestAnimationFrame(syncMobilePill);
  });
}

export function readSavedTab() {
  const hash = location.hash.replace(/^#/, '');
  if (TABS.has(hash)) return hash;
  try {
    const saved = sessionStorage.getItem(TAB_KEY);
    if (TABS.has(saved)) return saved;
  } catch {
    /* private mode */
  }
  return 'projects';
}

export function bootActiveTab(tabName) {
  let tab = TABS.has(tabName) ? tabName : 'projects';
  if (tab === 'contact' && (CONFIG.showForm === false || CONFIG.showMobileNav === false)) {
    tab = 'projects';
  }
  state.currentTab = tab;
  persistTab(tab);
  syncTabButtons(tab);

  projectsGroup.classList.toggle('active-group', tab === 'projects');
  teamGroup.classList.toggle('active-group', tab === 'team');

  if (tab === 'contact' && window.innerWidth <= 860) {
    showMobileForm();
  } else {
    applyDesktopFormReset();
  }

  requestAnimationFrame(syncMobilePill);

  if (tab === 'team') {
    randomizeGroupPositions(teamCards, true);
  } else if (tab === 'projects') {
    randomizeGroupPositions(projectCards, true);
  }
}

export function setActiveTab(tabName) {
  if (tabName === 'contact' && (CONFIG.showForm === false || CONFIG.showMobileNav === false)) return;
  if (!TABS.has(tabName) || state.currentTab === tabName || switching) return;
  playSound('tab');
  const prevTab = state.currentTab;
  state.currentTab = tabName;
  persistTab(tabName);
  syncTabButtons(tabName);
  requestAnimationFrame(syncMobilePill);

  const isMobile = window.innerWidth <= 860;
  switching = true;
  const done = () => { switching = false; };

  if (tabName === 'projects') {
    const revealProjects = () => {
      teamGroup.classList.remove('active-group');
      projectsGroup.classList.add('active-group');
      randomizeGroupPositions(projectCards, true);
      done();
    };
    if (prevTab === 'contact' && isMobile) {
      hideMobileForm(revealProjects);
    } else {
      exitCards(teamCards, isMobile ? 'side' : 'down', () => {
        teamGroup.classList.remove('active-group');
        revealProjects();
      });
    }
  } else if (tabName === 'team') {
    const revealTeam = () => {
      projectsGroup.classList.remove('active-group');
      teamGroup.classList.add('active-group');
      randomizeGroupPositions(teamCards, true);
      done();
    };
    if (prevTab === 'contact' && isMobile) {
      hideMobileForm(revealTeam);
    } else {
      exitCards(projectCards, isMobile ? 'side' : 'down', () => {
        projectsGroup.classList.remove('active-group');
        revealTeam();
      });
    }
  } else if (tabName === 'contact') {
    const prevCards = prevTab === 'team' ? teamCards : projectCards;
    if (isMobile) {
      exitCards(prevCards, 'down', () => {
        projectsGroup.classList.remove('active-group');
        teamGroup.classList.remove('active-group');
        showMobileForm();
        done();
      });
    } else {
      done();
    }
  } else {
    done();
  }
}

function persistTab(tabName) {
  try { sessionStorage.setItem(TAB_KEY, tabName); } catch { /* ignore */ }
  const url = new URL(location.href);
  url.hash = tabName === 'projects' ? '' : tabName;
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function syncTabButtons(tabName) {
  desktopTabProjects?.classList.toggle('active', tabName === 'projects');
  desktopTabTeam?.classList.toggle('active', tabName === 'team');
  desktopTabContact?.classList.toggle('active', tabName === 'contact');
  mobTabProjects?.classList.toggle('active', tabName === 'projects');
  mobTabTeam?.classList.toggle('active', tabName === 'team');
  mobTabContact?.classList.toggle('active', tabName === 'contact');
  desktopTabProjects?.setAttribute('aria-selected', tabName === 'projects' ? 'true' : 'false');
  desktopTabTeam?.setAttribute('aria-selected', tabName === 'team' ? 'true' : 'false');
}

function showMobileForm() {
  if (CONFIG.showForm === false || CONFIG.showMobileNav === false) return;
  if (window.innerWidth > 860 || !contactSection) return;
  document.body.classList.add('mobile-contact-active');
  contactSection.classList.remove('form-exiting');
  contactSection.classList.add('mobile-contact-visible');
  placeMobileForm();
  contactSection.classList.add('form-enter-up');
  const onEnd = (e) => {
    if (e.target !== contactSection) return;
    contactSection.classList.remove('form-enter-up');
  };
  contactSection.addEventListener('animationend', onEnd, { once: true });
}

function hideMobileForm(done) {
  if (window.innerWidth > 860 || !contactSection?.classList.contains('mobile-contact-visible')) {
    applyDesktopFormReset();
    done?.();
    return;
  }
  contactSection.classList.remove('form-enter-up');
  contactSection.classList.add('form-exiting');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (hideFormTimer) {
      clearTimeout(hideFormTimer);
      hideFormTimer = null;
    }
    contactSection.classList.remove('mobile-contact-visible', 'form-exiting', 'is-form-dragging', 'is-form-pressed');
    document.body.classList.remove('mobile-contact-active');
    resetMobileFormPos();
    done?.();
  };
  contactSection.addEventListener('animationend', (e) => {
    if (e.target === contactSection) finish();
  }, { once: true });
  hideFormTimer = setTimeout(finish, 520);
}

function applyDesktopFormReset() {
  contactSection?.classList.remove('mobile-contact-visible', 'form-enter-up', 'form-exiting', 'is-form-dragging', 'is-form-pressed');
  document.body.classList.remove('mobile-contact-active');
  resetMobileFormPos();
}

export function syncMobilePill() {
  const bar = document.querySelector('.mobile-tab-bar');
  const pill = document.getElementById('mobileTabPill');
  if (!bar || !pill || bar.hidden) return;
  const btn = bar.querySelector('.mobile-tab-btn.active');
  if (!btn || getComputedStyle(btn).display === 'none') return;
  const barRect = bar.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  pill.style.width = `${btnRect.width}px`;
  pill.style.height = `${btnRect.height}px`;
  pill.style.transform = `translate(${btnRect.left - barRect.left}px, ${btnRect.top - barRect.top}px)`;
  requestAnimationFrame(() => pill.classList.add('is-ready'));
}

export function getProjectCards() { return projectCards; }
export function getTeamCards() { return teamCards; }
