import { $, $$ } from './utils.js';

function emsGKS(){
  const a = +($('#ems_gksa')?.value || 0);
  const k = +($('#ems_gksk')?.value || 0);
  const m = +($('#ems_gksm')?.value || 0);
  return (a && k && m) ? (a + k + m) : 0;
}

const autoMap = {
  red: {
    'AKS < 90 mmHg': () => { const s = +($('#ems_sbp')?.value || 0); return s > 0 && s < 90; },
    'SpO₂ < 90%': () => { const s = +($('#ems_spo2')?.value || 0); return s > 0 && s < 90; },
    'KD < 8 ar > 30/min': () => { const r = +($('#ems_rr')?.value || 0); return r > 0 && (r < 8 || r > 30); },
    'ŠSD > 120/min': () => { const h = +($('#ems_hr')?.value || 0); return h > 120; },
    'GKS < 9': () => { const g = emsGKS(); return g > 0 && g < 9; }
  }
};

function autoActivateFromEMS(){
  const red = $('#chips_red');
  Object.entries(autoMap.red).forEach(([label,fn])=>{
    if(fn()){
      const chip = $$('.chip', red).find(c=>c.dataset.value===label);
      if(chip && !chip.classList.contains('active')) chip.classList.add('active');
    }
  });
}

export function initAutoActivate(saveAll){
  ['#ems_hr','#ems_rr','#ems_spo2','#ems_sbp','#ems_dbp','#ems_gksa','#ems_gksk','#ems_gksm','#ems_temp']
    .forEach(sel=>{
      const el = $(sel);
      if(el) el.addEventListener('input', ()=>{ autoActivateFromEMS(); if(typeof saveAll==='function') saveAll(); });
    });
}

export { autoActivateFromEMS };
