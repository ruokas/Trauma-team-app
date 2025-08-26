import { notify } from './alerts.js';
import { $ } from './utils.js';

export const CIRC_THRESHOLDS = {
  '#c_hr': { min: 60, max: 100, label: 'ŠSD' },
  '#c_sbp': { min: 90, max: 180, label: 'AKS s' },
  '#c_dbp': { min: 60, max: 110, label: 'AKS d' }
};

export function checkField(sel) {
  const cfg = CIRC_THRESHOLDS[sel];
  const el = $(sel);
  if (!cfg || !el) return false;
  const val = parseFloat(el.value);
  if (isNaN(val)) return false;
  if ((cfg.min !== undefined && val < cfg.min) || (cfg.max !== undefined && val > cfg.max)) {
    notify({ type: 'warning', message: `${cfg.label} už ribų` });
    return true;
  }
  return false;
}

export function initCirculationChecks(updateMetrics) {
  Object.keys(CIRC_THRESHOLDS).forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener('input', () => {
      if (typeof updateMetrics === 'function') updateMetrics();
      checkField(sel);
    });
  });
}
