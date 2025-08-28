import { $ } from './utils.js';
import { logEvent } from './timeline.js';
import { isChipActive } from './chips.js';

export function init() {
  const vitals = {
    '#gmp_hr': 'GMP ŠSD',
    '#gmp_rr': 'GMP KD',
    '#gmp_spo2': 'GMP SpO₂',
    '#gmp_sbp': 'GMP AKS s',
    '#gmp_dbp': 'GMP AKS d',
    '#b_rr': 'KD',
    '#b_spo2': 'SpO₂',
    '#c_hr': 'ŠSD',
    '#c_sbp': 'AKS s',
    '#c_dbp': 'AKS d',
    '#c_caprefill': 'KPL'
  };
  Object.entries(vitals).forEach(([sel, label]) => {
    const el = $(sel);
    if (el) el.addEventListener('change', () => { if (el.value) logEvent('vital', label, el.value); });
  });

  const chipVitals = {
    '#c_pulse_radial_group': 'Radialinis pulsas',
    '#c_pulse_femoral_group': 'Femoralis pulsas',
    '#c_skin_temp_group': 'Odos temp.',
    '#c_skin_color_group': 'Odos spalva'
  };
  Object.entries(chipVitals).forEach(([sel, label]) => {
    const group = $(sel);
    if (group) group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip && isChipActive(chip)) logEvent('vital', label, chip.dataset.value);
    });
  });
}

