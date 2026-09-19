/**
 * KINSEI Studio — Project Detail Modal (Figma-exact)
 * No SFX sounds
 */

import { preselectService } from './form.js';
import { PROJECT_DATA } from '../data/projects.js';
import { playSound } from './audio.js';
import { setActiveTab } from './tabs.js';

let modal, backdrop, closeBtn, title, desc, tag, pills, liveBtn, orderBtn;

export function initModal() {
  modal = document.getElementById('projectModal');
  backdrop = document.getElementById('modalBackdrop');
  closeBtn = document.getElementById('modalCloseBtn');
  title = document.getElementById('modalTitle');
  desc = document.getElementById('modalDesc');
  tag = document.getElementById('modalTag');
  pills = document.getElementById('modalTechPills');
  liveBtn = document.getElementById('modalLiveBtn');
  orderBtn = document.getElementById('modalOrderBtn');

  closeBtn?.addEventListener('click', () => {
    playSound('click');
    closeModal();
  });
  backdrop?.addEventListener('click', () => {
    playSound('click');
    closeModal();
  });
}

export function openProjectModal(projectId) {
  const data = PROJECT_DATA[projectId];
  if (!data) return;

  title.textContent = data.title;
  tag.textContent = data.tag;
  desc.textContent = data.desc;
  liveBtn.href = data.url;

  pills.innerHTML = '';
  data.stack.forEach(t => {
    const el = document.createElement('span');
    el.className = 'tech-pill';
    el.textContent = t;
    pills.appendChild(el);
  });

  orderBtn.onclick = () => {
    playSound('click');
    closeModal();
    if (window.innerWidth <= 860) {
      setActiveTab('contact');
    }
    preselectService(data.serviceType);
  };

  modal.classList.add('modal-open');
  modal.setAttribute('aria-hidden', 'false');
}

export function closeModal() {
  modal.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
}
