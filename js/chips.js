import { $, $$ } from './utils.js';

export function isChipActive(chip){
  if(chip.tagName === 'BUTTON') return chip.getAttribute('aria-pressed') === 'true';
  const input = chip.querySelector('input');
  if(input) return input.checked;
  return chip.classList.contains('active');
}

export function setChipActive(chip, active){
  if(chip.tagName === 'BUTTON'){
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  } else {
    const input = chip.querySelector('input');
    if(input) input.checked = active;
  }
  chip.classList.toggle('active', active);
}

export function initChips(saveAll){
  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const group = chip.parentElement;
    const single = group?.dataset?.single === 'true';

    if(single){
      $$('.chip', group).forEach(c => setChipActive(c, false));
      setChipActive(chip, true);
    } else {
      setChipActive(chip, !isChipActive(chip));
    }

    if(group.id==='d_pupil_left_group'){
      $('#d_pupil_left_note').style.display = (chip.dataset.value==='kita' && isChipActive(chip)) ? 'block' : 'none';
      if(chip.dataset.value!=='kita') $('#d_pupil_left_note').value='';
    }
    if(group.id==='d_pupil_right_group'){
      $('#d_pupil_right_note').style.display = (chip.dataset.value==='kita' && isChipActive(chip)) ? 'block' : 'none';
      if(chip.dataset.value!=='kita') $('#d_pupil_right_note').value='';
    }
      if(group.id==='spr_decision_group'){
        const show = chip.dataset.value==='Stacionarizavimas' && isChipActive(chip);
        const box = $('#spr_skyrius_container');
        box.style.display = show ? 'block' : 'none';
        if(!show){
          $('#spr_skyrius').value='';
          $('#spr_skyrius_kita').style.display='none';
          $('#spr_skyrius_kita').value='';
        }
      }
    delete chip.dataset.auto;
    if(typeof saveAll === 'function') saveAll();
  }, true);
}

export function listChips(sel){
  return $$('.chip', $(sel)).filter(isChipActive).map(c=>c.dataset.value);
}
