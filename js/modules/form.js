/**
 * KINSEI Studio — Contact Form (Uzbekistan standard phone formatting & validation)
 */

import { CONFIG } from '../config.js';
import { playSound } from './audio.js';

let form, name, phone, service, customGroup, custom, submitBtn;
let toastEl, toastTitle, toastMessage;
let toastTimer = null;

export function formatUzbekPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (!digits) return '';

  // If user enters Russian/regional 890... or raw 9-digit local e.g. 90...
  if (digits.startsWith('8') && digits.length === 10) {
    digits = '998' + digits.slice(1);
  } else if (!digits.startsWith('998')) {
    digits = '998' + digits;
  }

  // Cap at 12 digits (998 + 9 local)
  digits = digits.slice(0, 12);

  let formatted = '+998';
  if (digits.length > 3) {
    formatted += ' (' + digits.slice(3, 5);
  }
  if (digits.length >= 5) {
    formatted += ') ';
  }
  if (digits.length > 5) {
    formatted += digits.slice(5, 8);
  }
  if (digits.length > 8) {
    formatted += '-' + digits.slice(8, 10);
  }
  if (digits.length > 10) {
    formatted += '-' + digits.slice(10, 12);
  }
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

  toastEl = document.getElementById('toastNotification');
  toastTitle = document.getElementById('toastTitle');
  toastMessage = document.getElementById('toastMessage');

  // "Other" slide-down
  service?.addEventListener('change', () => {
    if (service.value === 'Other') {
      customGroup?.classList.add('expanded');
      custom?.setAttribute('required', 'true');
      custom?.focus();
    } else {
      customGroup?.classList.remove('expanded');
      custom?.removeAttribute('required');
      if (custom) custom.value = '';
    }
    validate();
  });

  // Live validation and input fill status
  [name, custom].forEach(el => {
    if (el) {
      el.addEventListener('input', validate);
      el.addEventListener('change', validate);
    }
  });

  // Phone input formatting & mask handling
  if (phone) {
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
        const selStart = phone.selectionStart;
        const selEnd = phone.selectionEnd;

        // If cursor is right after formatting characters: ') ', '-', ' ('
        if (selStart === selEnd && selStart > 0) {
          const charBefore = val[selStart - 1];
          if (charBefore === '-' || charBefore === ' ' || charBefore === ')') {
            e.preventDefault();
            let digits = val.slice(0, selStart).replace(/\D/g, '');
            if (digits.length > 3) {
              digits = digits.slice(0, -1);
              const remainder = val.slice(selEnd).replace(/\D/g, '');
              const combined = digits + remainder;
              phone.value = formatUzbekPhone(combined);
              validate();
            } else {
              phone.value = '';
              validate();
            }
          }
        }
      }
    });

    phone.addEventListener('input', () => {
      const raw = phone.value;
      const digits = raw.replace(/\D/g, '');
      if (digits.length <= 3 && (raw === '' || raw === '+' || raw === '+998')) {
        if (raw === '') {
          phone.value = '';
        } else {
          phone.value = '+998 (';
        }
      } else {
        phone.value = formatUzbekPhone(raw);
      }
      validate();
    });
  }

  form?.addEventListener('submit', handleSubmit);
}

function validate() {
  const phoneDigits = phone ? phone.value.replace(/\D/g, '') : '';
  const isPhoneComplete = phoneDigits.length === 12 && phoneDigits.startsWith('998');

  // Update .is-filled state on individual inputs
  if (name) name.classList.toggle('is-filled', name.value.trim().length > 0);
  if (phone) phone.classList.toggle('is-filled', isPhoneComplete);
  if (service) service.classList.toggle('is-filled', service.value !== '');
  if (custom) custom.classList.toggle('is-filled', custom.value.trim().length > 0);

  const ok =
    name && name.value.trim().length >= 2 &&
    isPhoneComplete &&
    service && service.value !== '' &&
    (service.value !== 'Other' || (custom && custom.value.trim().length >= 2));

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
    custom: service.value === 'Other' ? custom.value.trim() : null,
    time: new Date().toLocaleString('uz-UZ'),
  };

  const lines = [
    '🚀 *Yangi loyiha so\'rovi (KINSEI)*',
    `👤 *Mijoz:* ${data.name}`,
    `📞 *Telefon:* ${data.phone}`,
    `🛠 *Xizmat:* ${data.service}`,
  ];
  if (data.custom) lines.push(`📝 *Tafsilot:* ${data.custom}`);
  lines.push(`⏰ *Vaqt:* ${data.time}`);
  const text = lines.join('\n');

  let ok = false;
  if (CONFIG.telegram.botToken && CONFIG.telegram.chatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CONFIG.telegram.chatId, text, parse_mode: 'Markdown' }),
      });
      ok = (await r.json()).ok;
    } catch (err) { console.warn('Telegram:', err); }
  } else {
    await new Promise(r => setTimeout(r, 500));
    console.log('⚡ Telegram bot:\n', text);
    ok = true;
  }

  if (btnText) btnText.style.display = 'inline';
  if (btnLoader) btnLoader.style.display = 'none';

  if (ok) {
    playSound('success');
    showToast('Xabaringiz yuborildi!', 'Tez orada siz bilan bog\'lanamiz.');
    form.reset();
    if (customGroup) customGroup.classList.remove('expanded');
    validate();
  } else {
    showToast('Xatolik yuz berdi', 'Iltimos, telefon yoki telegram orqali bog\'laning.');
  }
}

function showToast(title, msg) {
  if (toastTimer) clearTimeout(toastTimer);
  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = msg;
  if (toastEl) {
    toastEl.classList.add('toast-active');
    toastTimer = setTimeout(() => toastEl.classList.remove('toast-active'), 4000);
  }
}

export function preselectService(type) {
  if (service) {
    service.value = type;
    service.dispatchEvent(new Event('change'));
  }
  if (name) name.focus();
}
