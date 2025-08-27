import { $, $$ } from './utils.js';

let listenersAdded = false;

export function addChipIndicators(chip){
  if(!chip || chip.querySelector('.chip-status-icon')) return;
  const tpl=document.getElementById('chip-template');
  if(tpl){
    const fragment=tpl.content.cloneNode(true);
    const icon=fragment.querySelector('.chip-status-icon');
    const sr=fragment.querySelector('.chip-status-text');
    chip.prepend(icon);
    chip.appendChild(sr);
  } else {
    const icon=document.createElement('span');
    icon.className='chip-status-icon';
    icon.setAttribute('aria-hidden','true');
    chip.prepend(icon);
    const sr=document.createElement('span');
    sr.className='chip-status-text sr-only';
    sr.setAttribute('aria-live','polite');
    sr.textContent='not selected';
    chip.appendChild(sr);
  }
}

export function isChipActive(chip){
  if(chip.tagName === 'BUTTON') return chip.getAttribute('aria-pressed') === 'true';
  const input = chip.querySelector('input');
  if(input) return input.checked;
  return chip.classList.contains('active');
}

export function setChipActive(chip, active){
  addChipIndicators(chip);
  chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  if(chip.tagName !== 'BUTTON'){
    const input = chip.querySelector('input');
    if(input) input.checked = active;
  }
  chip.classList.toggle('active', active);
  if(chip.getAttribute('role') === 'radio'){
    chip.setAttribute('aria-checked', active ? 'true' : 'false');
  }
  const icon=chip.querySelector('.chip-status-icon');
  const sr=chip.querySelector('.chip-status-text');
  if(icon) icon.textContent=active?'✓':'✗';
  if(sr) sr.textContent=active?'selected':'not selected';
}

function togglePupilNote(side, chip){
  const groupId = `d_pupil_${side}_group`;
  if(chip.parentElement?.id !== groupId) return;
  const note = $(`#d_pupil_${side}_note`);
  const group = note.parentElement;
  const show = chip.dataset.value==='kita' && isChipActive(chip);
  note.hidden = !show;
  note.classList.toggle('hidden', !show);
  const label = group.querySelector(`label[for="d_pupil_${side}_note"]`);
  if(label){
    label.hidden = !show;
    label.classList.toggle('hidden', !show);
  }
  if(!show) note.value='';
  group.setAttribute('aria-expanded', show);
}

function toggleBackNote(chip){
  if(chip.parentElement?.id !== 'e_back_group') return;
  const note = $('#e_back_notes');
  const show = chip.dataset.value==='Pakitimai' && isChipActive(chip);
  note.style.display = show ? 'block' : 'none';
  if(!show) note.value='';
}

function toggleSkinColorNote(chip){
  if(chip.parentElement?.id !== 'c_skin_color_group') return;
  const note = $('#c_skin_color_other');
  const show = chip.dataset.value==='Kita' && isChipActive(chip);
  note.style.display = show ? 'block' : 'none';
  if(!show) note.value='';
}

function updateBreathGroups(){
  ['b_breath_left_group','b_breath_right_group'].forEach(id=>{
    const group = $('#'+id);
    if(!group) return;
    const toggle = group.querySelector('.breath-toggle');
    const options = $$('.breath-option', group);
    const show = (toggle && isChipActive(toggle)) || options.some(isChipActive);
    options.forEach(opt=>{
      opt.classList.toggle('hidden', !show);
      if(!show) setChipActive(opt,false);
    });
  });
}

export function initChips(saveAll){
  $$('.chip').forEach(chip => {
    addChipIndicators(chip);
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
  updateBreathGroups();
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
    toggleBackNote(chip);
    toggleSkinColorNote(chip);
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
    updateBreathGroups();
    delete chip.dataset.auto;
    if(typeof saveAll === 'function') saveAll();
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    handleChip(chip);
  }, true);

  // Support keyboard interaction:
  // * Enter/Space toggles the active state of a chip
  // * Arrow keys move focus within a chip group. For radiogroups the
  //   newly focused chip is activated automatically to mirror native
  //   radio behaviour.
  document.addEventListener('keydown', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;

    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      handleChip(chip);
      return;
    }

    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      const group = chip.parentElement;
      if(!group) return;
      const chips = $$('.chip', group);
      const activeIndex = chips.findIndex(isChipActive);
      let index = activeIndex !== -1 ? activeIndex : chips.indexOf(chip);
      if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
        index = (index - 1 + chips.length) % chips.length;
      } else {
        index = (index + 1) % chips.length;
      }
      const nextChip = chips[index];
      e.preventDefault();
      nextChip.focus();
      if(group.dataset?.single === 'true'){
        handleChip(nextChip);
      }
    }
  }, true);
}

export function listChips(sel){
  return $$('.chip', $(sel)).filter(isChipActive).map(c=>c.dataset.value);
}
