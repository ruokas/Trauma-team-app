import { $, $$, nowHM } from './utils.js';
import { initTabs } from './tabs.js';
import { initChips, setChipActive, isChipActive, addChipIndicators } from './chips.js';
import { initAutoActivate } from './autoActivate.js';
import { initActions } from './actions.js';
import { logEvent, initTimeline } from './timeline.js';
import './components/toast.js';
import './components/modal.js';
import { initValidation, validateVitals } from './validation.js';
import { initTopbar } from './components/topbar.js';
import { initCollapsibles } from './sections.js';
import { connectSocket, initSessions, fetchUsers, initTheme, saveAll, loadAll } from './sessionManager.js';
import bodyMap from './bodyMap.js';
import { generateReport, gksSum } from './report.js';
import { setupHeaderActions } from './headerActions.js';
import { TEAM_ROLES } from './constants.js';
import { initCirculationChecks } from './circulation.js';
export { validateVitals };

/* ===== Imaging / Labs / Team ===== */
const IMG_CT=['Galvos KT','Kaklo KT','Viso kūno KT'];
const IMG_XRAY=['Krūtinės Ro','Dubens Ro'];
const LABS=['BKT','Biocheminis tyrimas','Krešumai','Fibrinogenas','ROTEM','Kraujo grupė','Kraujo dujos'];
const BLOOD_GROUPS=['0-','0+','A-','A+','B-','B+','AB-','AB+'];

const imgCtWrap=$('#imaging_ct'); IMG_CT.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; addChipIndicators(s); imgCtWrap.appendChild(s);});
const imgXrayWrap=$('#imaging_xray'); IMG_XRAY.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; addChipIndicators(s); imgXrayWrap.appendChild(s);});
const imgOtherWrap=$('#imaging_other_group'); ['Kita'].forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; addChipIndicators(s); imgOtherWrap.appendChild(s);});
const labsWrap=$('#labs_basic'); LABS.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; addChipIndicators(s); labsWrap.appendChild(s);});
const bloodGroupWrap=$('#bloodGroup'); if(bloodGroupWrap){ BLOOD_GROUPS.forEach(g=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=g; s.textContent=g; addChipIndicators(s); bloodGroupWrap.appendChild(s);}); }
const bloodUnitsInput=$('#bloodUnits');
const addBloodOrderBtn=$('#addBloodOrder');
if(bloodUnitsInput && bloodGroupWrap && addBloodOrderBtn){
  addBloodOrderBtn.addEventListener('click',()=>{
    const units=bloodUnitsInput.value.trim();
    const groupEl=$$('.chip',bloodGroupWrap).find(c=>isChipActive(c));
    const group=groupEl?.dataset.value||'';
    if(!units||!group) return;
    const val=`Kraujo užsakymas: ${units} vnt ${group}`;
    const chip=document.createElement('span');
    chip.className='chip';
    chip.dataset.value=val;
    chip.textContent=val;
    addChipIndicators(chip);
    labsWrap.appendChild(chip);
    setChipActive(chip,true);
    saveAll();
    bloodUnitsInput.value='';
    $$('.chip',bloodGroupWrap).forEach(c=>setChipActive(c,false));
  });
}
const fastAreas=[
  {name:'Perikardas', marker:'skystis'},
  {name:'Dešinė pleura', marker:'skystis ar oras'},
  {name:'Kairė pleura', marker:'skystis ar oras'},
  {name:'RUQ', marker:'skystis'},
  {name:'LUQ', marker:'skystis'},
  {name:'Dubuo', marker:'skystis'}
];
const fastWrap=$('#fastGrid');
fastAreas.forEach(({name,marker})=>{
  const box=document.createElement('div');
  box.innerHTML=`<label>${name} (${marker})</label><div class="row"><label class="pill red"><input type="radio" name="fast_${name}" value="Yra"> Yra</label><label class="pill"><input type="radio" name="fast_${name}" value="Nėra"> Nėra</label></div>`;
  fastWrap.appendChild(box);
});
const teamWrap=$('#teamGrid'); TEAM_ROLES.forEach(r=>{
  const slug=r.replace(/\s+/g,'_');
  const box=document.createElement('div');
  box.innerHTML=`<label>${r}</label><input type="text" data-team="${r}" data-field="team_${slug}" placeholder="Vardas Pavardė">`;
  teamWrap.appendChild(box);
});

/* ===== Activation indicator ===== */
function ensureSingleTeam(){
  const red=$('#chips_red');
  const yellow=$('#chips_yellow');
  const redActive=$$('.chip.active', red).length>0;
  const yellowActive=$$('.chip.active', yellow).length>0;
  if(redActive && yellowActive){
    $$('.chip', yellow).forEach(c=>setChipActive(c,false));
  }
}
function updateActivationIndicator(){
  const dot=$('#activationIndicator');
  const redActive=$$('.chip.active', $('#chips_red')).length>0;
  const yellowActive=$$('.chip.active', $('#chips_yellow')).length>0;
  dot.classList.remove('red','yellow');
  dot.style.display='none';
  if(redActive){ dot.classList.add('red'); dot.style.display='inline-block'; }
  else if(yellowActive){ dot.classList.add('yellow'); dot.style.display='inline-block'; }
}
function setupActivationControls(){
  const redGroup=$('#chips_red');
  const yellowGroup=$('#chips_yellow');
  redGroup.addEventListener('click',e=>{
    const chip=e.target.closest('.chip');
    if(!chip) return;
    if(isChipActive(chip)){
      $$('.chip', yellowGroup).forEach(c=>setChipActive(c,false));
    }
    ensureSingleTeam();
    updateActivationIndicator();
    saveAll();
  });
  yellowGroup.addEventListener('click',e=>{
    const chip=e.target.closest('.chip');
    if(!chip) return;
    if(isChipActive(chip)){
      $$('.chip', redGroup).forEach(c=>setChipActive(c,false));
    }
    ensureSingleTeam();
    updateActivationIndicator();
    saveAll();
  });
}
window.updateActivationIndicator=updateActivationIndicator;
window.ensureSingleTeam=ensureSingleTeam;

/* ===== Save / Load ===== */
function expandOutput(){
  const ta = $('#output');
  if(!ta) return;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function debounce(fn, delay){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args),delay);
  };
}
const saveAllDebounced = debounce(saveAll, 300);
/* ===== Other UI ===== */
$('#btnGCS15').addEventListener('click',()=>{
  $('#d_gksa').value=4; $('#d_gksk').value=5; $('#d_gksm').value=6;
  ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
  saveAll();
});
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
    const hidden=panel.style.display==='none';
    if(hidden){
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
if($('#d_gcs_calc') && $('#btnGCSCalc')){
  const toggleDGcs=setupGcsCalc('d');
  $('#btnGCSCalc').addEventListener('click',toggleDGcs);
}
if($('#spr_gcs_calc') && $('#btnSprGCSCalc')){
  const toggleSprGcs=setupGcsCalc('spr');
  $('#btnSprGCSCalc').addEventListener('click',toggleSprGcs);
}

function clampNumberInputs(){
  const clamp=el=>{
    if(el.value==='') return;
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    const step=parseFloat(el.getAttribute('step')) || 1;
    let val=parseFloat(el.value);
    if(isNaN(val)) return;
    if(min!==null && val<parseFloat(min)) val=parseFloat(min);
    if(max!==null && val>parseFloat(max)) val=parseFloat(max);
    val=Math.round(val/step)*step;
    const decimals=(step.toString().split('.')[1]||'').length;
    el.value=val.toFixed(decimals);
  };
  $$('input[type="number"]').forEach(el=>{
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    if(min!==null || max!==null){
      ['input','change'].forEach(evt=>el.addEventListener(evt,()=>clamp(el)));
      clamp(el);
    }
  });
}


/* ===== Init modules ===== */
async function init(){
  initTheme();
  await initTopbar();
    setupHeaderActions({ validateForm, saveAll });
  connectSocket();
  await fetchUsers();
  await initSessions();
  initTabs();
  initCollapsibles();
  bodyMap.init(saveAllDebounced);
  initChips(saveAllDebounced);
  initAutoActivate(saveAllDebounced);
  initActions(saveAllDebounced);
  initTimeline();
  setupActivationControls();
  document.addEventListener('input', saveAllDebounced);

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
  Object.entries(vitals).forEach(([sel,label])=>{
    const el=$(sel);
    if(el) el.addEventListener('change',()=>{ if(el.value) logEvent('vital', label, el.value); });
  });

  const chipVitals = {
    '#c_pulse_radial_group': 'Radialinis pulsas',
    '#c_pulse_femoral_group': 'Femoralis pulsas',
    '#c_skin_temp_group': 'Odos temp.',
    '#c_skin_color_group': 'Odos spalva'
  };
  Object.entries(chipVitals).forEach(([sel,label])=>{
    const group=$(sel);
    if(group) group.addEventListener('click',e=>{
      const chip=e.target.closest('.chip');
      if(chip && isChipActive(chip)) logEvent('vital', label, chip.dataset.value);
    });
  });
  const updateCirculationMetrics=()=>{
    const hr=parseFloat($('#c_hr')?.value);
    const sbp=parseFloat($('#c_sbp')?.value);
    const dbp=parseFloat($('#c_dbp')?.value);
    const mapEl=$('#c_map');
    const siEl=$('#c_si');
    const map=!isNaN(sbp)&&!isNaN(dbp)?Math.round((sbp+2*dbp)/3):'';
    const si=!isNaN(hr)&&!isNaN(sbp)&&sbp>0?(hr/sbp).toFixed(2):'';
    if(mapEl) mapEl.textContent=map;
    if(siEl) siEl.textContent=si;
  };
  initCirculationChecks(updateCirculationMetrics);
  updateCirculationMetrics();
    const updateDGksTotal=()=>{
      $('#d_gks_total').textContent=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value);
    };
    ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).addEventListener('input', updateDGksTotal));
    const updateGmpGksTotal=()=>{
      $('#gmp_gks_total').textContent=gksSum($('#gmp_gksa').value,$('#gmp_gksk').value,$('#gmp_gksm').value);
    };
    ['#gmp_gksa','#gmp_gksk','#gmp_gksm'].forEach(sel=>$(sel).addEventListener('input', updateGmpGksTotal));
    if($('#spr_gks_total')){
      const updateSprGksTotal=()=>{
        $('#spr_gks_total').textContent=gksSum($('#spr_gksa').value,$('#spr_gksk').value,$('#spr_gksm').value);
      };
      ['#spr_gksa','#spr_gksk','#spr_gksm'].forEach(sel=>$(sel).addEventListener('input', updateSprGksTotal));
    }
    $('#btnGmpNow').addEventListener('click', ()=>{ $('#gmp_time').value=nowHM(); saveAll(); });
    $('#btnSprNow').addEventListener('click', ()=>{ $('#spr_time').value=nowHM(); saveAll(); });
  $('#btnOxygen').addEventListener('click', ()=>{
    const box = $('#oxygenFields');
    const show = getComputedStyle(box).display === 'none';
    box.style.display = show ? 'flex' : 'none';
    saveAll();
  });
  $('#btnDPV').addEventListener('click', ()=>{
    const box = $('#dpvFields');
    const show = getComputedStyle(box).display === 'none';
    box.style.display = show ? 'flex' : 'none';
    saveAll();
  });
    $('#spr_skyrius').addEventListener('change', e=>{
      const show = e.target.value === 'Kita';
      $('#spr_skyrius_kita').style.display = show ? 'block' : 'none';
      if(!show) $('#spr_skyrius_kita').value='';
      saveAll();
    });
    $('#output').addEventListener('input', expandOutput);
    loadAll();
    ensureSingleTeam();
    updateActivationIndicator();
    expandOutput();
    clampNumberInputs();
    initValidation();
    validateVitals();
    updateDGksTotal();
    updateGmpGksTotal();
  }
  window.addEventListener('DOMContentLoaded', init);

function validateForm(){
  const fields=[
    {el:$('#patient_age'),check:e=>e.value!=='' && +e.value>=0 && +e.value<=120,msg:'Amžius 0-120'},
    {el:$('#patient_sex'),check:e=>e.value!=='',msg:'Pasirinkite lytį'},
    {el:$('#patient_history'),check:e=>e.value.trim()!=='',msg:'Ligos istorijos nr. privalomas'}
  ];
  let ok=true;
  fields.forEach(({el,check,msg})=>{
    if(!el) return;
    if(!el.dataset.hint && el.getAttribute('aria-describedby')) el.dataset.hint=el.getAttribute('aria-describedby');
    let err=document.getElementById(el.id+'_error');
    const hintId=el.dataset.hint||'';
    if(!check(el)){
      ok=false;
      if(!err){
        err=document.createElement('div');
        err.id=el.id+'_error';
        err.className='error-msg';
        err.textContent=msg;
        el.parentElement.appendChild(err);
      }
      el.classList.add('invalid');
      el.setAttribute('aria-invalid','true');
      el.setAttribute('aria-describedby', (hintId+' '+err.id).trim());
    }else{
      if(err) err.remove();
      el.classList.remove('invalid');
      el.removeAttribute('aria-invalid');
      if(hintId) el.setAttribute('aria-describedby', hintId); else el.removeAttribute('aria-describedby');
    }
  });
  if(!validateVitals()) ok=false;
  return ok;
}


document.addEventListener('tabShown', e => {
  if(e.detail==='Santrauka'){
    if(validateForm()){
      generateReport();
      expandOutput();
      saveAll();
    }
  }
});
