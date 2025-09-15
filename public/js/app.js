import { $, $$ } from './utils.js';
import { initTabs } from './tabs.js';
import { initChips, setChipActive, isChipActive, addChipIndicators } from './chips.js';
import { initAutoActivate } from './autoActivate.js';
import { initActions } from './actions.js';
import './components/toast.js';
import './components/modal.js';
import { initValidation, validateVitals } from './validation.js';
import { initTopbar } from './components/topbar.js';
import { initCollapsibles } from './sections.js';
import { initTheme, saveAll, loadAll, getCurrentSessionId } from './sessionManager.js';
import { connectSocket, fetchUsers } from './sessionApi.js';
import { notify } from './alerts.js';
import { initSessions, populateSessionSelect, updateUserList } from './sessionUI.js';
import bodyMap from './bodyMap.js';
import { generateReport } from './report.js';
import { setupHeaderActions } from './headerActions.js';
import { initCirculation } from './circulation.js';
import { setupActivationControls, ensureSingleTeam, updateActivationIndicator } from './activation.js';
import { initGcs } from './gcs.js';
import { IMG_CT, IMG_XRAY, LABS, BLOOD_GROUPS } from './config.js';
import { init as initFastGrid } from './fastGrid.js';
import { init as initTeamGrid } from './teamGrid.js';
import { init as initMechanismList } from './mechanismList.js';
import { initChipGroups } from './chipData.js';
import woundEditor from './woundEditor.js';
export { validateVitals, createChipGroup };

initTheme();

/* ===== Imaging / Labs / Team ===== */
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

initChipGroups();

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
  if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
    // Use a relative path so the service worker is correctly located when the
    // site is served from a subdirectory (e.g. GitHub Pages project sites).
    navigator.serviceWorker.register('./sw.js');
  }
  try{
    await initTopbar();
    setupHeaderActions({ validateForm });
    await connectSocket({
      onSessions: list => {
        const sel = $('#sessionSelect');
        if(sel) populateSessionSelect(sel, list);
      },
      onSessionData: ({ id }) => {
        if(id === getCurrentSessionId()) loadAll();
      },
      onUsers: updateUserList
    });
    const users = await fetchUsers();
    updateUserList(users);
    await initSessions();
  }catch(err){
    console.error(err);
    notify({ type:'error', message:'Nepavyko inicijuoti programos' });
  }finally{
    if(document.getElementById('tabs')){
      initTabs();
      initCollapsibles();
    }
  }
  bodyMap.init(saveAllDebounced);
  bodyMap.setMarkScale(0.35);
  woundEditor.init(bodyMap);
  const brushSlider = $('#brushSize');
  if(brushSlider) brushSlider.addEventListener('input', e => bodyMap.setBrushSize(e.target.value));
  initChips(saveAllDebounced);
  initAutoActivate(saveAllDebounced);
  initActions(saveAllDebounced);
  setupActivationControls();
  initFastGrid();
  initTeamGrid();
  initMechanismList();
  document.addEventListener('input', saveAllDebounced);
  initCirculation();
  const toolBtns=$$('.map-toolbar .tool[data-tool]');
  toolBtns.forEach(btn=>{
    if(btn.dataset.tool===bodyMap.activeTool) btn.classList.add('active');
    btn.addEventListener('click',()=>{
      bodyMap.setTool(btn.dataset.tool);
      toolBtns.forEach(b=>b.classList.toggle('active', b===btn));
    });
  });
  const btnUndo=$('#btnUndo');
  if(btnUndo) btnUndo.addEventListener('click',()=>{ bodyMap.undo(); saveAllDebounced(); });
  const btnRedo=$('#btnRedo');
  if(btnRedo) btnRedo.addEventListener('click',()=>{ bodyMap.redo(); saveAllDebounced(); });
  const btnClearMap=$('#btnClearMap');
  if(btnClearMap) btnClearMap.addEventListener('click',()=>{
    bodyMap.clear();
    saveAllDebounced();
  });
  const btnExport=$('#btnExportSvg');
  if(btnExport) btnExport.addEventListener('click',async()=>{
    try{
      const svg=$('#bodySvg')?.cloneNode(true);
      if(!svg) return;
      await bodyMap.embedSilhouettes(svg);
      const xml=new XMLSerializer().serializeToString(svg);
      const blob=new Blob([xml],{type:'image/svg+xml'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='bodymap.svg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(err){ console.error('SVG export failed', err); }
  });
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
    {el:$('#patient_sex'),check:e=>e.value!=='',msg:'Pasirinkite lytį'}
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
