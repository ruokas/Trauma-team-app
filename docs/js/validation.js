import { $ } from './utils.js';

function showInlineError(el, msg) {
  let err = el.nextElementSibling;
  if (!err || !err.classList.contains('input-error')) {
    err = document.createElement('span');
    err.className = 'input-error';
    err.style.color = 'var(--danger)';
    err.style.fontSize = '12px';
    err.style.marginLeft = '4px';
    el.insertAdjacentElement('afterend', err);
  }
  err.textContent = msg;
  err.style.display = msg ? 'inline' : 'none';
  if (msg) {
    el.classList.add('invalid');
  } else {
    el.classList.remove('invalid');
  }
}

export function validateField(el) {
  const val = el.value.trim();
  let msg = '';
  if (el.hasAttribute('required') && val === '') {
    msg = 'Privalomas laukas';
  } else if (val !== '') {
    const min = el.getAttribute('min');
    const max = el.getAttribute('max');
    if (min !== null || max !== null) {
      const num = parseFloat(val);
      if (Number.isNaN(num)) {
        msg = 'Netinkama reikšmė';
      } else if ((min !== null && num < parseFloat(min)) || (max !== null && num > parseFloat(max))) {
        msg = `Leistina ${min}–${max}`;
      }
    }
  }
  showInlineError(el, msg);
}

export function validateVitals() {
  const fields = ['#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm','#d_gksa','#d_gksk','#d_gksm','#patient_age','#patient_sex','#patient_history'];
  let ok = true;
  fields.forEach(sel => {
    const el = $(sel);
    if (el) {
      validateField(el);
      if (el.classList.contains('invalid')) ok = false;
    }
  });
  return ok;
}

export function initValidation() {
  const selectors = ['#patient_age','#patient_sex','#patient_history','#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm','#d_gksa','#d_gksk','#d_gksm'];
  selectors.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    ['input','change'].forEach(evt => el.addEventListener(evt, () => validateField(el)));
    validateField(el);
  });
}

if (typeof window !== 'undefined') {
  window.validateVitals = validateVitals;
}
