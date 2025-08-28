import { createChipGroup } from './app.js';

export const CHIP_DATA = {
  chips_red: [
    { label: 'GKS < 9', color: 'red' },
    { label: 'KD < 8 ar > 30/min', color: 'red' },
    { label: 'AKS < 90 mmHg', color: 'red' },
    { label: 'SpO₂ < 90%', color: 'red' },
    { label: 'ŠSD > 120/min', color: 'red' },
    { label: 'Stridoras', color: 'red' },
    { label: 'Lūžę 2 ilgieji kaulai/dubuo', color: 'red' },
    { label: 'Kiauriniai suž. kakle/krūtinėje/juosmenyje', color: 'red' },
    { label: 'Įtariamas vidinis kraujavimas', color: 'red' },
    { label: 'Nestabili krūtinės ląsta', color: 'red' },
    { label: 'Nudegimas >18% ar KT nudegimas', color: 'red' },
    { label: 'Amputacijos aukščiau plašt./pėdų', color: 'red' }
  ],
  chips_yellow: [
    { label: 'Pėst./dvir./motociklo trauma', color: 'yellow' },
    { label: 'Sprogimas/susišaudymas', color: 'yellow' },
    { label: 'Kritimas >3 m ar nardymas', color: 'yellow' },
    { label: 'Reikėjo gelbėtojų pagalbos', color: 'yellow' }
  ],
  a_airway_group: [
    { label: 'Atviri' },
    { label: 'Obstrukcija', color: 'red' },
    { label: 'Įvesta laringinė kaukė', color: 'red' },
    { label: 'Intubuotas', color: 'red' },
    { label: 'Kita', color: 'red' }
  ],
  b_breath_left_group: [
    { label: 'Normalus', class: 'breath-chip' },
    { label: 'Kita', value: '_kita', color: 'red', class: 'breath-chip breath-toggle' },
    { label: 'Neišklausomas', color: 'red', class: 'breath-chip breath-option hidden' },
    { label: 'Susilpnėjęs', color: 'red', class: 'breath-chip breath-option hidden' },
    { label: 'Kita', color: 'red', class: 'breath-chip breath-option hidden' }
  ],
  b_breath_right_group: [
    { label: 'Normalus', class: 'breath-chip' },
    { label: 'Kita', value: '_kita', color: 'red', class: 'breath-chip breath-toggle' },
    { label: 'Neišklausomas', color: 'red', class: 'breath-chip breath-option hidden' },
    { label: 'Susilpnėjęs', color: 'red', class: 'breath-chip breath-option hidden' },
    { label: 'Kita', color: 'red', class: 'breath-chip breath-option hidden' }
  ],
  c_pulse_radial_group: [
    { label: 'Stiprus' },
    { label: 'Silpnas', color: 'red' }
  ],
  c_pulse_femoral_group: [
    { label: 'Stiprus' },
    { label: 'Silpnas', color: 'red' }
  ],
  c_skin_temp_group: [
    { label: 'Šilta' },
    { label: 'Šalta', color: 'red' }
  ],
  c_skin_color_group: [
    { label: 'Rausva' },
    { label: 'Blyški', color: 'red' },
    { label: 'Kita', color: 'red' }
  ],
  d_pupil_left_group: [
    { label: 'n.y.', value: 'n.y.' },
    { label: 'kita', value: 'kita', color: 'red' }
  ],
  d_pupil_right_group: [
    { label: 'n.y.', value: 'n.y.' },
    { label: 'kita', value: 'kita', color: 'red' }
  ],
  e_back_group: [
    { label: 'Be pakitimų' },
    { label: 'Pakitimai', color: 'red' }
  ],
  e_abdomen_group: [
    { label: 'Be pakitimų' },
    { label: 'Pakitimai', color: 'red' }
  ],
  spr_decision_group: [
    { label: 'Stacionarizavimas' },
    { label: 'Namo' },
    { label: 'Stebėjimas SMPS' },
    { label: 'Mirtis' },
    { label: 'Pervežimas į kitą ligoninę' }
  ]
};

export function buildChipGroup(containerId, chips){
  const container = createChipGroup(`#${containerId}`, chips.map(c => c.label));
  if(!container) return;
  const chipEls = container.querySelectorAll('.chip');
  chips.forEach((chip, idx) => {
    const el = chipEls[idx];
    if(!el) return;
    if(chip.value && chip.value !== chip.label){
      el.dataset.value = chip.value;
    }
    if(chip.color){
      el.classList.add(chip.color);
    }
    if(chip.class){
      el.classList.add(...chip.class.split(' '));
    }
  });
  return container;
}

export function initChipGroups(){
  Object.entries(CHIP_DATA).forEach(([id, chips]) => buildChipGroup(id, chips));
}

