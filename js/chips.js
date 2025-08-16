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

function togglePupilNote(side, chip){
  const note = $(`#d_pupil_${side}_note`);
  const show = chip.dataset.value==='kita' && isChipActive(chip);
  note.style.display = show ? 'block' : 'none';
  if(chip.dataset.value!=='kita') note.value='';
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
      togglePupilNote('left', chip);
    }
    if(group.id==='d_pupil_right_group'){
      togglePupilNote('right', chip);
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
}

export function listChips(sel){
  return $$('.chip', $(sel)).filter(isChipActive).map(c=>c.dataset.value);
}
