import { $ } from './utils.js';

const LS_MECHANISM_KEY = 'traumos_mechanizmai';

export function init() {
  const list = $('#gmp_mechanism_list');
  const input = $('#gmp_mechanism');
  if (!list || !input) return;
  const existing = new Set(Array.from(list.options).map(o => o.value));
  const stored = JSON.parse(localStorage.getItem(LS_MECHANISM_KEY) || '[]');
  stored.forEach(v => {
    if (!existing.has(v)) {
      const opt = document.createElement('option');
      opt.value = v;
      list.appendChild(opt);
      existing.add(v);
    }
  });
  input.addEventListener('change', () => {
    const val = input.value.trim();
    if (!val || existing.has(val)) return;
    const opt = document.createElement('option');
    opt.value = val;
    list.appendChild(opt);
    existing.add(val);
    stored.push(val);
    localStorage.setItem(LS_MECHANISM_KEY, JSON.stringify(stored));
  });
}

