/**
 * KINSEI Studio — Contact Form (Uzbekistan standard phone formatting & validation)
 */

import { playSound } from './audio.js?v=23';
import { t, getLang } from './i18n.js?v=17';

let form, name, phone, service, customGroup, custom, submitBtn;
let customSelectWrapper, customSelectTrigger, selectedServiceText, customSelectOptions, customSelectMenu;
let toastEl, toastTitle, toastMessage;
let toastTimer = null;
let toastHideAt = 0;
let toastRemaining = 4000;
let toastPaused = false;
let keyboardLift = 0;
let keyboardBound = false;

const TOAST_MS = 4000;

export const formPos = { x: 0, y: 0, dragged: false };
export const toastPos = { x: 0, y: 0, dragged: false };

export function formatUzbekPhone(value) {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if (!digits) return '';

  let local = '';
  if (digits.startsWith('998')) {
    local = digits.slice(3);
  } else if (digits.startsWith('8') && digits.length === 10) {
    local = digits.slice(1);
  } else {
    local = digits;
  }

  // Cap at 9 local digits (e.g. 90 123 45 67)
  local = local.slice(0, 9);
  if (!local) {
    return digits.startsWith('998') ? '+998 ' : '';
  }

  let formatted = '+998 (' + local.slice(0, 2);
  if (local.length >= 2) formatted += ') ';
  if (local.length > 2) formatted += local.slice(2, 5);
  if (local.length >= 5) formatted += '-';
  if (local.length > 5) formatted += local.slice(5, 7);
  if (local.length >= 7) formatted += '-';
  if (local.length > 7) formatted += local.slice(7, 9);
  return formatted;
}

export function initForm() {
  form = document.getElementById('contactForm');
  name = document.getElementById('clientName');
  phone = document.getElementById('clientPhone');
  service = document.getElementById('serviceType');
  customGroup = document.getElementById('customServiceGroup');
  custom = document.getElementById('customService');
  submitBtn = document.getElementById('submitBtn');

  customSelectWrapper = document.getElementById('customSelectWrapper');
  customSelectTrigger = document.getElementById('customSelectTrigger');
  selectedServiceText = document.getElementById('selectedServiceText');
  customSelectOptions = document.querySelectorAll('.custom-select-option');
  customSelectMenu = document.getElementById('customSelectMenu');

  toastEl = document.getElementById('toastNotification');
  toastTitle = document.getElementById('toastTitle');
  toastMessage = document.getElementById('toastMessage');

  customSelectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = customSelectWrapper?.classList.toggle('is-open');
    customSelectTrigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      requestAnimationFrame(positionSelectMenu);
    } else {
      clearSelectMenuPos();
    }
  });

  customSelectOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value;
      if (service) service.value = val;
      if (selectedServiceText) selectedServiceText.textContent = opt.textContent;
      customSelectTrigger?.classList.add('has-value');
      customSelectOptions.forEach(o => o.classList.toggle('is-selected', o === opt));
      closeServiceMenu();

      if (service) {
        service.dispatchEvent(new Event('change'));
      }
      validate();
    });
  });

  document.addEventListener('click', (e) => {
    if (customSelectWrapper && !customSelectWrapper.contains(e.target)) {
      closeServiceMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && customSelectWrapper?.classList.contains('is-open')) {
      closeServiceMenu();
    }
  });

  service?.addEventListener('change', () => {
    if (service.value === 'other') {
      customGroup?.classList.add('expanded');
      custom?.setAttribute('required', 'true');
      custom?.focus({ preventScroll: true });
      requestAnimationFrame(keepFieldVisible);
      setTimeout(keepFieldVisible, 360);
    } else {
      customGroup?.classList.remove('expanded');
      custom?.removeAttribute('required');
      if (custom) custom.value = '';
    }
    validate();
  });

  [name, custom].forEach(el => {
    if (el) {
      el.addEventListener('input', validate);
      el.addEventListener('change', validate);
    }
  });

  [name, phone, custom].forEach((el) => {
    el?.addEventListener('focus', () => {
      window.scrollTo(0, 0);
      requestAnimationFrame(keepFieldVisible);
      setTimeout(keepFieldVisible, 280);
    });
  });

  if (phone) {
    phone.setAttribute('inputmode', 'tel');

    phone.addEventListener('focus', () => {
      if (!phone.value || phone.value.trim() === '') {
        phone.value = '+998 (';
      }
    });

    phone.addEventListener('blur', () => {
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length <= 3) {
        phone.value = '';
      }
      validate();
    });

    phone.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        const val = phone.value;
        const digits = val.replace(/\D/g, '');

        if (digits.length <= 3) {
          e.preventDefault();
          phone.value = '';
          validate();
          return;
        }

        const selStart = phone.selectionStart;
        const selEnd = phone.selectionEnd;

        if (selStart === selEnd && selStart > 0) {
          const charBefore = val[selStart - 1];
          if (charBefore === '-' || charBefore === ' ' || charBefore === ')' || charBefore === '(') {
            e.preventDefault();
            let before = val.slice(0, selStart - 1);
            let digitsBefore = before.replace(/\D/g, '');
            if (digitsBefore.length > 3) {
              digitsBefore = digitsBefore.slice(0, -1);
              const after = val.slice(selEnd);
              const digitsAfter = after.replace(/\D/g, '');
              phone.value = formatUzbekPhone(digitsBefore + digitsAfter);
            } else {
              phone.value = '';
            }
            validate();
          }
        }
      }
    });

    phone.addEventListener('input', () => {
      const raw = phone.value;
      const digits = raw.replace(/\D/g, '');

      if (!digits || digits.length === 0) {
        phone.value = '';
      } else if (digits.length <= 3 && (raw === '' || raw === '+' || raw.trim() === '+998' || raw.trim() === '+998 (')) {
        phone.value = raw.includes('998') ? '+998 (' : '';
      } else {
        phone.value = formatUzbekPhone(raw);
      }
      validate();
    });
  }

  form?.addEventListener('submit', handleSubmit);
  window.addEventListener('kinsei-lang', refreshServiceLabel);
  refreshServiceLabel();
  bindKeyboardLift();
}

export function placeMobileForm() {
  const el = document.getElementById('contactSection');
  if (!el || window.innerWidth > 860) return;
  const w = el.offsetWidth || 320;
  const h = el.offsetHeight || 280;
  formPos.x = Math.round((window.innerWidth - w) / 2);

  const nav = document.querySelector('.mobile-tab-bar');
  const navBottom = nav?.getBoundingClientRect().bottom || 0;
  const underNav = Math.round(navBottom + 30);
  const floorY = Math.max(8, window.innerHeight - h - 12);
  formPos.y = Math.min(underNav, floorY);
  formPos.y = Math.max(8, formPos.y);

  formPos.dragged = false;
  keyboardLift = 0;
  applyFormScreenPos();
}

export function applyFormScreenPos() {
  const el = document.getElementById('contactSection');
  if (!el) return;
  el.style.left = `${formPos.x}px`;
  el.style.top = `${Math.max(8, formPos.y - keyboardLift)}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  if (customSelectWrapper?.classList.contains('is-open')) positionSelectMenu();
}

export function resetMobileFormPos() {
  formPos.x = 0;
  formPos.y = 0;
  formPos.dragged = false;
  keyboardLift = 0;
  const el = document.getElementById('contactSection');
  el?.style.removeProperty('left');
  el?.style.removeProperty('top');
  el?.style.removeProperty('right');
  el?.style.removeProperty('bottom');
  closeServiceMenu();
}

export function closeServiceMenu() {
  customSelectWrapper?.classList.remove('is-open');
  customSelectTrigger?.setAttribute('aria-expanded', 'false');
  clearSelectMenuPos();
}

function positionSelectMenu() {
  const menu = customSelectMenu;
  const trigger = customSelectTrigger;
  if (!menu || !trigger || !customSelectWrapper?.classList.contains('is-open')) return;

  if (window.innerWidth > 860) {
    clearSelectMenuPos();
    return;
  }

  menu.classList.add('is-fixed');
  const r = trigger.getBoundingClientRect();
  menu.style.visibility = 'hidden';
  menu.style.display = 'flex';
  const menuH = menu.offsetHeight || 180;
  menu.style.visibility = '';

  const spaceBelow = window.innerHeight - r.bottom;
  menu.style.left = `${r.left}px`;
  menu.style.width = `${r.width}px`;
  menu.style.zIndex = '200';
  if (spaceBelow < menuH + 12) {
    menu.style.top = 'auto';
    menu.style.bottom = `${window.innerHeight - r.top + 4}px`;
  } else {
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.bottom = 'auto';
  }
}

function clearSelectMenuPos() {
  if (!customSelectMenu) return;
  customSelectMenu.classList.remove('is-fixed');
  customSelectMenu.style.left = '';
  customSelectMenu.style.top = '';
  customSelectMenu.style.bottom = '';
  customSelectMenu.style.width = '';
  customSelectMenu.style.zIndex = '';
  customSelectMenu.style.display = '';
  customSelectMenu.style.visibility = '';
}

function bindKeyboardLift() {
  if (keyboardBound) return;
  keyboardBound = true;
  const vv = window.visualViewport;
  const update = () => keepFieldVisible();
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('focusout', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) {
        keyboardLift = 0;
        if (document.getElementById('contactSection')?.classList.contains('mobile-contact-visible')) {
          applyFormScreenPos();
        }
      }
    }, 80);
  });
}

function keepFieldVisible() {
  const section = document.getElementById('contactSection');
  if (!section?.classList.contains('mobile-contact-visible')) return;

  const field = document.activeElement;
  const isField = field && section.contains(field) && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA');
  if (!isField) {
    keyboardLift = 0;
    applyFormScreenPos();
    return;
  }

  window.scrollTo(0, 0);
  const vv = window.visualViewport;
  const visibleTop = vv ? vv.offsetTop + 12 : 12;
  const visibleBottom = vv ? vv.offsetTop + vv.height - 12 : window.innerHeight - 12;
  const prevLift = keyboardLift;

  const fieldRect = field.getBoundingClientRect();
  const unliftedTop = fieldRect.top + prevLift;
  const fieldH = fieldRect.height;
  const sectionRect = section.getBoundingClientRect();
  const unliftedFormBottom = sectionRect.bottom + prevLift;

  let lift = 0;
  if (unliftedTop + fieldH > visibleBottom) {
    lift = unliftedTop + fieldH - visibleBottom;
  }
  if (unliftedFormBottom - lift > visibleBottom) {
    lift = Math.max(lift, unliftedFormBottom - visibleBottom);
  }
  if (unliftedTop - lift < visibleTop) {
    lift = unliftedTop - visibleTop;
  }
  keyboardLift = Math.max(0, lift);
  applyFormScreenPos();
}

function validate() {
  const phoneDigits = phone ? phone.value.replace(/\D/g, '') : '';
  const isPhoneComplete = phoneDigits.length === 12 && phoneDigits.startsWith('998');

  if (name) name.classList.toggle('is-filled', name.value.trim().length > 0);
  if (phone) phone.classList.toggle('is-filled', isPhoneComplete);
  if (service) service.classList.toggle('is-filled', service.value !== '');
  if (custom) custom.classList.toggle('is-filled', custom.value.trim().length > 0);

  const ok =
    name && name.value.trim().length >= 2 &&
    isPhoneComplete &&
    service && service.value !== '' &&
    (service.value !== 'other' || (custom && custom.value.trim().length >= 2));

  if (submitBtn) {
    submitBtn.disabled = !ok;
    submitBtn.classList.toggle('ready-to-submit', ok);
  }
  return ok;
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  if (btnText) btnText.style.display = 'none';
  if (btnLoader) btnLoader.style.display = 'inline-flex';
  submitBtn.disabled = true;

  const data = {
    name: name.value.trim(),
    phone: phone.value.trim(),
    service: service.value,
    custom: service.value === 'other' ? custom.value.trim() : null,
  };

  let ok = false;
  try {
    const r = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        service: data.service,
        serviceLabel: selectedServiceText?.textContent?.trim() || data.service,
        custom: data.custom,
        lang: getLang(),
      }),
    });
    const payload = await r.json().catch(() => ({}));
    ok = r.ok && payload.ok !== false;
  } catch (err) {
    console.warn('Lead:', err);
  }

  if (btnText) btnText.style.display = 'inline';
  if (btnLoader) btnLoader.style.display = 'none';

  if (ok) {
    playSound('success');
    showToast(t('toastOkTitle'), t('toastOkMsg'));
    form.reset();
    if (service) service.value = '';
    if (selectedServiceText) selectedServiceText.textContent = t('serviceType');
    if (customSelectTrigger) customSelectTrigger.classList.remove('has-value');
    customSelectOptions?.forEach(o => o.classList.remove('is-selected'));
    closeServiceMenu();
    if (customGroup) customGroup.classList.remove('expanded');
    validate();
  } else {
    showToast(t('toastErrTitle'), t('toastErrMsg'));
    validate();
  }
}

function refreshServiceLabel() {
  if (!selectedServiceText) return;
  if (!service?.value) {
    selectedServiceText.textContent = t('serviceType');
    return;
  }
  const opt = Array.from(customSelectOptions || []).find((o) => o.dataset.value === service.value);
  if (opt) selectedServiceText.textContent = opt.textContent;
}

export function applyToastScreenPos() {
  if (!toastEl) return;
  toastEl.style.left = `${toastPos.x}px`;
  toastEl.style.top = `${toastPos.y}px`;
  toastEl.style.right = 'auto';
  toastEl.style.bottom = 'auto';
  toastEl.style.margin = '0';
}

export function resetToastPos() {
  toastPos.x = 0;
  toastPos.y = 0;
  toastPos.dragged = false;
  if (!toastEl) return;
  toastEl.classList.remove('is-toast-pressed', 'is-toast-dragging');
  toastEl.style.removeProperty('left');
  toastEl.style.removeProperty('top');
  toastEl.style.removeProperty('right');
  toastEl.style.removeProperty('bottom');
  toastEl.style.removeProperty('margin');
  toastEl.style.removeProperty('transition');
}

export function pauseToastHide() {
  if (!toastEl?.classList.contains('toast-active')) return;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
    toastRemaining = Math.max(900, toastHideAt - performance.now());
  }
  toastPaused = true;
}

export function resumeToastHide() {
  if (!toastPaused) return;
  toastPaused = false;
  if (!toastEl?.classList.contains('toast-active')) return;
  armToastHide(toastRemaining);
}

function armToastHide(ms) {
  if (toastTimer) clearTimeout(toastTimer);
  toastHideAt = performance.now() + ms;
  toastTimer = setTimeout(hideToast, ms);
}

function hideToast() {
  toastTimer = null;
  toastPaused = false;
  if (!toastEl) return;
  toastEl.classList.remove('toast-active', 'is-toast-pressed', 'is-toast-dragging');
  toastTimer = setTimeout(() => {
    resetToastPos();
    toastTimer = null;
  }, 300);
}

function showToast(title, msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toastPaused = false;
  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = msg;
  if (toastEl) {
    resetToastPos();
    toastEl.classList.add('toast-active');
    armToastHide(TOAST_MS);
  }
}

export function preselectService(type) {
  if (service) {
    service.value = type;
    const opt = Array.from(customSelectOptions || []).find(o => o.dataset.value === type);
    if (opt && selectedServiceText) {
      selectedServiceText.textContent = opt.textContent;
      customSelectTrigger?.classList.add('has-value');
      customSelectOptions.forEach(o => o.classList.toggle('is-selected', o === opt));
    }
    service.dispatchEvent(new Event('change'));
  }
  if (name) name.focus({ preventScroll: true });
}
