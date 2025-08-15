import { $, $$ } from './utils.js';

export function initChips(saveAll){
  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const group = chip.parentElement;
    const single = group?.dataset?.single === 'true';
    if(single){
      $$('.chip', group).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    } else {
      chip.classList.toggle('active');
    }
    if(group.id==='d_pupil_left_group'){
      $('#d_pupil_left_note').style.display = (chip.dataset.value==='kita' && chip.classList.contains('active')) ? 'block' : 'none';
      if(chip.dataset.value!=='kita') $('#d_pupil_left_note').value='';
    }
    if(group.id==='d_pupil_right_group'){
      $('#d_pupil_right_note').style.display = (chip.dataset.value==='kita' && chip.classList.contains('active')) ? 'block' : 'none';
      if(chip.dataset.value!=='kita') $('#d_pupil_right_note').value='';
    }
    if(typeof saveAll === 'function') saveAll();
  }, true);
}

export function listChips(sel){
  return $$('.chip.active', $(sel)).map(c=>c.dataset.value);
}
