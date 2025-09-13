import { $, nowHM } from './utils.js';
import { gksSum } from './report.js';
import { saveAll } from './sessionManager.js';

function setupGcsCalc(prefix){
  const panel=$(`#${prefix}_gcs_calc`);
  const selA=$(`#${prefix}_gcs_calc_a`);
  const selK=$(`#${prefix}_gcs_calc_k`);
  const selM=$(`#${prefix}_gcs_calc_m`);
  const apply=$(`#${prefix}_gcs_apply`);
  const total=$(`#${prefix}_gcs_calc_total`);
  const btnClose=$(`#${prefix}_gcs_close`);
  const btn = prefix==='spr' ? $('#btnSprGCSCalc') : $('#btnGCSCalc');
  if(!panel||!selA||!selK||!selM||!apply||!total) return ()=>{};

  const update=()=>{ total.textContent=gksSum(selA.value,selK.value,selM.value); };
  [selA,selK,selM].forEach(sel=>sel.addEventListener('change',update));

  let firstFocusable, lastFocusable;
  const close=()=>{
    panel.classList.add('hidden');
    panel.style.display='none';
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('click',onDocClick);
    if(btn) btn.focus();
  };
  const onKey=e=>{
    if(e.key==='Escape') return close();
    if(e.key==='Tab'){
      if(e.shiftKey && document.activeElement===firstFocusable){
        e.preventDefault();
        lastFocusable.focus();
      }else if(!e.shiftKey && document.activeElement===lastFocusable){
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  const onDocClick=e=>{ if(!panel.contains(e.target) && e.target!==btn) close(); };

  apply.addEventListener('click',()=>{
    if(selA.value) $(`#${prefix}_gksa`).value=selA.value;
    if(selK.value) $(`#${prefix}_gksk`).value=selK.value;
    if(selM.value) $(`#${prefix}_gksm`).value=selM.value;
    ['#'+prefix+'_gksa','#'+prefix+'_gksk','#'+prefix+'_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
    close();
    saveAll();
  });

  if(btnClose) btnClose.addEventListener('click',close);

  return ()=>{
    const hidden=getComputedStyle(panel).display==='none';
    if(hidden){
      panel.classList.remove('hidden');
      panel.style.display='block';
      const focusables=panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable=focusables[0];
      lastFocusable=focusables[focusables.length-1];
      document.addEventListener('keydown',onKey);
      document.addEventListener('click',onDocClick);
      selA.focus();
    }else{
      close();
    }
  };
}

export function initGcs(){
  const btnGcs15=$('#btnGCS15');
  if(btnGcs15) btnGcs15.addEventListener('click',()=>{
    $('#d_gksa').value=4; $('#d_gksk').value=5; $('#d_gksm').value=6;
    ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
    saveAll();
  });

  if($('#d_gcs_calc') && $('#btnGCSCalc')){
    const toggleDGcs=setupGcsCalc('d');
    $('#btnGCSCalc').addEventListener('click',toggleDGcs);
  }
  if($('#spr_gcs_calc') && $('#btnSprGCSCalc')){
    const toggleSprGcs=setupGcsCalc('spr');
    $('#btnSprGCSCalc').addEventListener('click',toggleSprGcs);
  }

  const updateDGksTotal=()=>{
    const el=$('#d_gks_total');
    if(el) el.textContent=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value);
  };
  ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).addEventListener('input', updateDGksTotal));

  const updateGmpGksTotal=()=>{
    const el=$('#gmp_gks_total');
    if(el) el.textContent=gksSum($('#gmp_gksa').value,$('#gmp_gksk').value,$('#gmp_gksm').value);
  };
  ['#gmp_gksa','#gmp_gksk','#gmp_gksm'].forEach(sel=>$(sel).addEventListener('input', updateGmpGksTotal));

  let updateSprGksTotal;
  if($('#spr_gks_total')){
    updateSprGksTotal=()=>{
      const el=$('#spr_gks_total');
      if(el) el.textContent=gksSum($('#spr_gksa').value,$('#spr_gksk').value,$('#spr_gksm').value);
    };
    ['#spr_gksa','#spr_gksk','#spr_gksm'].forEach(sel=>$(sel).addEventListener('input', updateSprGksTotal));
  }

  const btnGmpNow=$('#btnGmpNow');
  if(btnGmpNow) btnGmpNow.addEventListener('click',()=>{ $('#gmp_time').value=nowHM(); saveAll(); });
  const btnSprNow=$('#btnSprNow');
  if(btnSprNow) btnSprNow.addEventListener('click',()=>{ $('#spr_time').value=nowHM(); saveAll(); });

  updateDGksTotal();
  updateGmpGksTotal();
  if(updateSprGksTotal) updateSprGksTotal();
}
