import { $, $$ } from './utils.js';

let listenersAdded = false;

export function isChipActive(chip){
  if(chip.tagName === 'BUTTON') return chip.getAttribute('aria-pressed') === 'true';
  const input = chip.querySelector('input');
  if(input) return input.checked;
  return chip.classList.contains('active');
}

export function setChipActive(chip, active){
  chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  if(chip.tagName !== 'BUTTON'){
    const input = chip.querySelector('input');
    if(input) input.checked = active;
  }
  chip.classList.toggle('active', active);
  if(chip.getAttribute('role') === 'radio'){
    chip.setAttribute('aria-checked', active ? 'true' : 'false');
  }
}

function togglePupilNote(side, chip){
  const groupId = `d_pupil_${side}_group`;
  if(chip.parentElement?.id !== groupId) return;
  const note = $(`#d_pupil_${side}_note`);
  const show = chip.dataset.value==='kita' && isChipActive(chip);
  note.style.display = show ? 'block' : 'none';
  if(!show) note.value='';
}

export function initChips(saveAll){
  $$('.chip').forEach(chip => {
    const group = chip.parentElement;
    const single = group?.dataset?.single === 'true';
    if(group){
      group.setAttribute('role', single ? 'radiogroup' : 'group');
    }
    if(chip.tagName !== 'BUTTON'){
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('role', single ? 'radio' : 'button');
    } else if(single){
      chip.setAttribute('role', 'radio');
    }
    setChipActive(chip, isChipActive(chip));
  });
  if(listenersAdded) return;
  listenersAdded = true;

  function handleChip(chip){
    const group = chip.parentElement;
    const single = group?.dataset?.single === 'true';

    if(single){
      $$('.chip', group).forEach(c => setChipActive(c, false));
      setChipActive(chip, true);
    } else {
      setChipActive(chip, !isChipActive(chip));
    }
    togglePupilNote('left', chip);
    togglePupilNote('right', chip);
    if(group.id.startsWith('imaging_')){
      const box=$('#imaging_other');
      const show=!!document.querySelector('[id^="imaging_"] .chip.active[data-value="Kita"]');
      box.style.display = show ? 'block' : 'none';
      if(!show) box.value='';
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
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    handleChip(chip);
  }, true);

  document.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const chip = e.target.closest('.chip');
    if(!chip) return;
    e.preventDefault();
    handleChip(chip);
  }, true);
}

export function listChips(sel){
  return $$('.chip', $(sel)).filter(isChipActive).map(c=>c.dataset.value);
}
