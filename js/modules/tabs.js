/**
 * KINSEI Studio — Tab Navigation (Figma-exact)
 * No SFX sounds on tab switch
 */

import { state } from '../state.js';
import { randomizeGroupPositions, exitCards } from './cards.js';
import { playSound } from './audio.js';

let projectCards, teamCards;
let projectsGroup, teamGroup, contactSection;
let desktopTabProjects, desktopTabTeam, desktopTabContact;
let mobTabProjects, mobTabTeam, mobTabContact;

export function initTabs() {
  projectCards = Array.from(document.querySelectorAll('#projectsGroup .neo-card'));
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
}

export function setActiveTab(tabName) {
  if (state.currentTab === tabName) return;
  playSound('tab');
  const prevTab = state.currentTab;
  state.currentTab = tabName;

  // Update button states
  desktopTabProjects?.classList.toggle('active', tabName === 'projects');
  desktopTabTeam?.classList.toggle('active', tabName === 'team');
  desktopTabContact?.classList.toggle('active', tabName === 'contact');
  mobTabProjects?.classList.toggle('active', tabName === 'projects');
  mobTabTeam?.classList.toggle('active', tabName === 'team');
  mobTabContact?.classList.toggle('active', tabName === 'contact');

  const isMobile = window.innerWidth <= 860;

  // Mobile contact form toggle
  if (isMobile) {
    contactSection.classList.toggle('mobile-contact-visible', tabName === 'contact');
    document.body.classList.toggle('mobile-contact-active', tabName === 'contact');
  } else {
    document.body.classList.remove('mobile-contact-active');
  }

  if (tabName === 'projects') {
    exitCards(teamCards, isMobile ? 'side' : 'down', () => {
      teamGroup.classList.remove('active-group');
      projectsGroup.classList.add('active-group');
      randomizeGroupPositions(projectCards, true);
    });
  } else if (tabName === 'team') {
    exitCards(projectCards, isMobile ? 'side' : 'down', () => {
      projectsGroup.classList.remove('active-group');
      teamGroup.classList.add('active-group');
      randomizeGroupPositions(teamCards, true);
    });
  } else if (tabName === 'contact') {
    const prevCards = prevTab === 'team' ? teamCards : projectCards;
    exitCards(prevCards, 'down', () => {
      projectsGroup.classList.remove('active-group');
      teamGroup.classList.remove('active-group');
    });
  }
}

export function getProjectCards() { return projectCards; }
export function getTeamCards() { return teamCards; }
