import { $, $$ } from './utils.js';
import { setChipActive } from './chips.js';

function gmpGKS(){
  const a = +($('#gmp_gksa')?.value || 0);
  const k = +($('#gmp_gksk')?.value || 0);
  const m = +($('#gmp_gksm')?.value || 0);
  return (a && k && m) ? (a + k + m) : 0;
}

const autoMap = {
  red: {
      'AKS < 90 mmHg': () => { const s = +($('#gmp_sbp')?.value || 0); return s > 0 && s < 90; },
      'SpO₂ < 90%': () => { const s = +($('#gmp_spo2')?.value || 0); return s > 0 && s < 90; },
      'KD < 8 ar > 30/min': () => { const r = +($('#gmp_rr')?.value || 0); return r > 0 && (r < 8 || r > 30); },
      'ŠSD > 120/min': () => { const h = +($('#gmp_hr')?.value || 0); return h > 120; },
      'GKS < 9': () => { const g = gmpGKS(); return g > 0 && g < 9; }
  }
};

function autoActivateFromGMP(){
  const red = $('#chips_red');
  Object.entries(autoMap.red).forEach(([label,fn])=>{
    const chip = $$('.chip', red).find(c=>c.dataset.value===label);
    if(!chip) return;
    if(fn()){
      setChipActive(chip, true);
      chip.dataset.auto = 'true';
    } else if(chip.dataset.auto === 'true'){
      setChipActive(chip, false);
      delete chip.dataset.auto;
    }
  });
  if($$('.chip.active', red).length){
    const yellow=$('#chips_yellow');
    if(yellow) $$('.chip', yellow).forEach(c=>setChipActive(c,false));
  }
  window.ensureSingleTeam && window.ensureSingleTeam();
  window.updateActivationIndicator && window.updateActivationIndicator();
}

export function initAutoActivate(saveAll){
    ['#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm']
    .forEach(sel=>{
      const el = $(sel);
      if(el) el.addEventListener('input', ()=>{ autoActivateFromGMP(); if(typeof saveAll==='function') saveAll(); });
    });
}

export { autoActivateFromGMP };
