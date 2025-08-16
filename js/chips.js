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
    const input = chip.querySelector('input');
    if(input && input.type === 'radio') return; // radios handled natively

    const group = chip.parentElement;
    const single = group?.dataset?.single === 'true';

    if(single){
      $$('.chip', group).forEach(c => setChipActive(c, false));
      setChipActive(chip, true);
    } else {
      setChipActive(chip, !isChipActive(chip));
    }

    if(group.id==='spr_decision_group'){
      const showSky = chip.dataset.value==='Stacionarizavimas' && isChipActive(chip);
      const boxSky = $('#spr_skyrius_container');
      boxSky.style.display = showSky ? 'block' : 'none';
      if(!showSky){
        $('#spr_skyrius').value='';
        $('#spr_skyrius_kita').style.display='none';
        $('#spr_skyrius_kita').value='';
      }

      const showHosp = chip.dataset.value==='Pervežimas į kitą ligoninę' && isChipActive(chip);
      const boxHosp = $('#spr_ligonine_container');
      boxHosp.style.display = showHosp ? 'block' : 'none';
      if(!showHosp){
        $('#spr_ligonine').value='';
      }
    }
    delete chip.dataset.auto;
    if(typeof saveAll === 'function') saveAll();
  }, true);

  document.addEventListener('change', e => {
    const input = e.target;
    if(input.type !== 'radio') return;
    const chip = input.closest('.chip');
    const group = chip?.parentElement;
    if(!group) return;
    $$('input[type="radio"]', group).forEach(r => {
      const parent = r.closest('.chip');
      parent.classList.toggle('active', r.checked);
    });
    if(group.id==='d_pupil_left_group'){
      $('#d_pupil_left_note').style.display = input.value==='kita' ? 'block' : 'none';
      if(input.value!=='kita') $('#d_pupil_left_note').value='';
    }
    if(group.id==='d_pupil_right_group'){
      $('#d_pupil_right_note').style.display = input.value==='kita' ? 'block' : 'none';
      if(input.value!=='kita') $('#d_pupil_right_note').value='';
    }
    if(typeof saveAll === 'function') saveAll();
  });
}

export function listChips(sel){
  return $$('.chip', $(sel)).filter(isChipActive).map(c=>c.dataset.value);
}
