import { $, $$ } from './utils.js';
import { IMAGING_GROUPS } from './chipState.js';

export function updateDomToggles(){
  const showBack = $$('.chip.active', $('#e_back_group')).some(c => c.dataset.value === 'Pakitimai');
  const backNote = $('#e_back_notes');
  backNote.style.display = showBack ? 'block' : 'none';
  backNote.classList.toggle('hidden', !showBack);

  const showAbdomen = $$('.chip.active', $('#e_abdomen_group')).some(c => c.dataset.value === 'Pakitimai');
  const abdomenNote = $('#e_abdomen_notes');
  abdomenNote.style.display = showAbdomen ? 'block' : 'none';
  abdomenNote.classList.toggle('hidden', !showAbdomen);

  const showSkinColorOther = $$('.chip.active', $('#c_skin_color_group')).some(c => c.dataset.value === 'Kita');
  const skinColorOther = $('#c_skin_color_other');
  skinColorOther.hidden = !showSkinColorOther;
  skinColorOther.classList.toggle('hidden', !showSkinColorOther);

  $('#oxygenFields').classList.toggle('hidden', !($('#b_oxygen_liters').value || $('#b_oxygen_type').value));
  $('#dpvFields').classList.toggle('hidden', !$('#b_dpv_fio2').value);

  const showSky = $$('.chip.active', $('#spr_decision_group')).some(c => c.dataset.value === 'Stacionarizavimas');
  const skyBox = $('#spr_skyrius_container');
  skyBox.style.display = showSky ? 'block' : 'none';
  skyBox.classList.toggle('hidden', !showSky);

  const showHosp = $$('.chip.active', $('#spr_decision_group')).some(c => c.dataset.value === 'Pervežimas į kitą ligoninę');
  const hospBox = $('#spr_ligonine_container');
  hospBox.style.display = showHosp ? 'block' : 'none';
  hospBox.classList.toggle('hidden', !showHosp);

  const showSkyOther = ($('#spr_skyrius').value === 'Kita');
  const skyOther = $('#spr_skyrius_kita');
  skyOther.style.display = showSkyOther ? 'block' : 'none';
  skyOther.classList.toggle('hidden', !showSkyOther);

  const showImgOther = IMAGING_GROUPS.some(sel => $$('.chip.active', $(sel)).some(c => c.dataset.value === 'Kita'));
  const imgOther = $('#imaging_other');
  imgOther.style.display = showImgOther ? 'block' : 'none';
  imgOther.classList.toggle('hidden', !showImgOther);
}
