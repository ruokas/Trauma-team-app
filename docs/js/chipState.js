import { $, $$ } from './utils.js';

export const IMAGING_GROUPS = ['#imaging_ct','#imaging_xray','#imaging_other_group'];
export const CHIP_GROUPS = ['#chips_red','#chips_yellow',...IMAGING_GROUPS,'#labs_basic','#a_airway_group','#b_breath_left_group','#b_breath_right_group','#c_pulse_radial_group','#c_pulse_femoral_group','#c_skin_temp_group','#c_skin_color_group','#d_pupil_left_group','#d_pupil_right_group','#spr_decision_group'];

export function serializeChips(groups = CHIP_GROUPS){
  const data = {};
  groups.forEach(sel => {
    data['chips:' + sel] = $$('.chip.active', $(sel)).map(c => c.dataset.value);
  });
  return data;
}

export function loadChips(data, groups = CHIP_GROUPS){
  groups.forEach(sel => {
    const arr = data['chips:' + sel] || [];
    $$('.chip', $(sel)).forEach(c => c.classList.toggle('active', arr.includes(c.dataset.value)));
  });
  const labsArr = data['chips:#labs_basic'] || [];
  const labsContainer = $('#labs_basic');
  labsArr.forEach(val => {
    if(!$$('.chip', labsContainer).some(c => c.dataset.value === val)){
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.value = val;
      chip.textContent = val;
      labsContainer.appendChild(chip);
    }
  });
  $$('.chip', labsContainer).forEach(c => c.classList.toggle('active', labsArr.includes(c.dataset.value)));
}
