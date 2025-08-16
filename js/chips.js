import { $, $$ } from './utils.js';

export function initChips(saveAll){
  document.addEventListener('click', e => {
    const btn = e.target.closest('button.chip');
    if(!btn) return;
    const group = btn.parentElement;
    const single = group?.dataset?.single === 'true';
    if(single){
      $$('.chip', group).forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
    } else {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    }
    if(group.id==='d_pupil_left_group'){
      const active = btn.dataset.value==='kita' && btn.getAttribute('aria-pressed')==='true';
      $('#d_pupil_left_note').style.display = active ? 'block' : 'none';
      if(!active) $('#d_pupil_left_note').value='';
    }
    if(group.id==='d_pupil_right_group'){
      const active = btn.dataset.value==='kita' && btn.getAttribute('aria-pressed')==='true';
      $('#d_pupil_right_note').style.display = active ? 'block' : 'none';
      if(!active) $('#d_pupil_right_note').value='';
    }
    if(typeof saveAll === 'function') saveAll();
  }, true);

  document.addEventListener('change', e => {
    const input = e.target.matches('.chip > input') ? e.target : null;
    if(!input) return;
    const group = input.closest('.chip-group');
    if(group?.id==='d_pupil_left_group'){
      const active = input.value==='kita' && input.checked;
      $('#d_pupil_left_note').style.display = active ? 'block' : 'none';
      if(!active) $('#d_pupil_left_note').value='';
    }
    if(group?.id==='d_pupil_right_group'){
      const active = input.value==='kita' && input.checked;
      $('#d_pupil_right_note').style.display = active ? 'block' : 'none';
      if(!active) $('#d_pupil_right_note').value='';
    }
    if(typeof saveAll === 'function') saveAll();
  }, true);
}

export function listChips(sel){
  const root = $(sel);
  const buttons = $$('button.chip[aria-pressed="true"]', root).map(b=>b.dataset.value);
  const inputs = $$('input:checked', root).map(i=>i.value);
  return [...buttons, ...inputs];
}

