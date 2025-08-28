import { $ } from './utils.js';
import { FAST_AREAS } from './config.js';

export function init() {
  const fastWrap = $('#fastGrid');
  if (!fastWrap) return;
  FAST_AREAS.forEach(({ name, marker }) => {
    const box = document.createElement('div');
    box.innerHTML = `<label>${name} (${marker})</label><div class="row"><label class="pill red"><input type="radio" name="fast_${name}" value="Yra"> Yra</label><label class="pill"><input type="radio" name="fast_${name}" value="Nėra"> Nėra</label></div>`;
    fastWrap.appendChild(box);
  });
}

