import { $, $$ } from './utils.js';
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
import { generateReport } from './report.js';
import { setupHeaderActions } from './headerActions.js';
import { TEAM_ROLES } from './constants.js';
import { initCirculation } from './circulation.js';
import { setupActivationControls, ensureSingleTeam, updateActivationIndicator } from './activation.js';
import { initGcs } from './gcs.js';
import { IMG_CT, IMG_XRAY, LABS, BLOOD_GROUPS, FAST_AREAS } from './config.js';
import { initCapacityDashboard } from './capacityDashboard.js';
export { validateVitals, createChipGroup };

/* ===== Imaging / Labs / Team ===== */
const LS_MECHANISM_KEY='traumos_mechanizmai';
function createChipGroup(selector, values){
  const wrap=$(selector);
  if(!wrap) return null;
  values.forEach(val=>{
    const chip=document.createElement('span');
    chip.className='chip';
    chip.dataset.value=val;
    chip.textContent=val;
    addChipIndicators(chip);
    wrap.appendChild(chip);
  });
  return wrap;
}

createChipGroup('#imaging_ct', IMG_CT);
createChipGroup('#imaging_xray', IMG_XRAY);
createChipGroup('#imaging_other_group', ['Kita']);
const labsWrap=createChipGroup('#labs_basic', LABS);
const bloodGroupWrap=createChipGroup('#bloodGroup', BLOOD_GROUPS);
const bloodUnitsInput=$('#bloodUnits');
const addBloodOrderBtn=$('#addBloodOrder');
if(bloodUnitsInput && bloodGroupWrap && addBloodOrderBtn){
  const addOrder=e=>{
    e.preventDefault();
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
  };
  addBloodOrderBtn.addEventListener('click',addOrder);
  bloodUnitsInput.addEventListener('keydown',e=>{ if(e.key==='Enter') addOrder(e); });
}
const fastWrap=$('#fastGrid');
FAST_AREAS.forEach(({name,marker})=>{
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

function initMechanismList(){
  const list=$('#gmp_mechanism_list');
  const input=$('#gmp_mechanism');
  if(!list||!input) return;
  const existing=new Set(Array.from(list.options).map(o=>o.value));
  const stored=JSON.parse(localStorage.getItem(LS_MECHANISM_KEY)||'[]');
  stored.forEach(v=>{
    if(!existing.has(v)){
      const opt=document.createElement('option');
      opt.value=v;
      list.appendChild(opt);
      existing.add(v);
    }
  });
  input.addEventListener('change',()=>{
    const val=input.value.trim();
    if(!val||existing.has(val)) return;
    const opt=document.createElement('option');
    opt.value=val;
    list.appendChild(opt);
    existing.add(val);
    stored.push(val);
    localStorage.setItem(LS_MECHANISM_KEY, JSON.stringify(stored));
  });
}

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
initGcs();
/* ===== Other UI ===== */

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
  initCapacityDashboard();
  if(document.getElementById('tabs')){
    initTabs();
    initCollapsibles();
  }
  bodyMap.init(saveAllDebounced);
  initChips(saveAllDebounced);
  initAutoActivate(saveAllDebounced);
  initActions(saveAllDebounced);
  initTimeline();
  setupActivationControls();
  initMechanismList();
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

  initCirculation();
  const btnOxygen=$('#btnOxygen');
  if(btnOxygen) btnOxygen.addEventListener('click',()=>{
    const box=$('#oxygenFields');
    box.classList.toggle('hidden');
    saveAll();
  });
  const btnDPV=$('#btnDPV');
  if(btnDPV) btnDPV.addEventListener('click',()=>{
    const box=$('#dpvFields');
    box.classList.toggle('hidden');
    saveAll();
  });
    $('#spr_skyrius').addEventListener('change', e=>{
      const show = e.target.value === 'Kita';
      const field = $('#spr_skyrius_kita');
      field.style.display = show ? 'block' : 'none';
      field.classList.toggle('hidden', !show);
      if(!show) field.value='';
      saveAll();
    });
    $('#output').addEventListener('input', expandOutput);
    loadAll();
    if(document.getElementById('chips_red') && document.getElementById('chips_yellow')){
      ensureSingleTeam();
      updateActivationIndicator();
    }
    expandOutput();
    clampNumberInputs();
    initValidation();
    validateVitals();
  }
  if(document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

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
