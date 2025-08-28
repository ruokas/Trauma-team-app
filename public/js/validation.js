import { $ } from './utils.js';

function showInlineError(el, msg) {
  if (!el.dataset.hint && el.getAttribute('aria-describedby')) {
    el.dataset.hint = el.getAttribute('aria-describedby');
  }
  const hintId = el.dataset.hint || '';
  let err = document.getElementById(el.id + '_error');
  if (!err) {
    err = document.createElement('div');
    err.id = el.id + '_error';
    err.className = 'error-msg';
    el.parentElement.appendChild(err);
  }
  err.textContent = msg;
  if (msg) {
    el.classList.add('invalid');
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', (hintId + ' ' + err.id).trim());
  } else {
    el.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
    if (hintId) el.setAttribute('aria-describedby', hintId); else el.removeAttribute('aria-describedby');
    err.remove();
  }
}

export function validateField(el) {
  const val = el.value.trim();
  let msg = '';
  switch (el.id) {
    case 'patient_age': {
      const num = parseFloat(val);
      if (val === '' || Number.isNaN(num) || num < 0 || num > 120) msg = 'Amžius 0-120';
      break;
    }
    case 'patient_sex':
      if (val === '') msg = 'Pasirinkite lytį';
      break;
    case 'patient_history':
      if (val === '') msg = 'Ligos istorijos nr. privalomas';
      break;
    default:
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
  }
  showInlineError(el, msg);
  return !msg;
}

export function validatePatient() {
  const fields = ['#patient_age', '#patient_sex', '#patient_history'];
  let ok = true;
  fields.forEach(sel => {
    const el = $(sel);
    if (el && !validateField(el)) ok = false;
  });
  return ok;
}

export function validateVitals() {
  const fields = ['#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm','#d_gksa','#d_gksk','#d_gksm'];
  let ok = true;
  fields.forEach(sel => {
    const el = $(sel);
    if (el && !validateField(el)) ok = false;
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
  window.validatePatient = validatePatient;
}
