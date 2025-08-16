import { $, $$, nowHM } from './utils.js';
import { initTabs, showTab } from './tabs.js';
import { initChips, listChips, setChipActive, isChipActive } from './chips.js';
import { initAutoActivate } from './autoActivate.js';
import { initActions } from './actions.js';
import { logEvent, initTimeline } from './timeline.js';

let authToken = localStorage.getItem('trauma_token') || null;
let socket = null;

async function ensureLogin(){
  if(authToken || typeof fetch !== 'function' || typeof prompt !== 'function') return;
  try{
    const name = prompt('Įveskite vardą dalyvauti bendroje sesijoje');
    if(!name) return;
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    authToken = data.token;
    localStorage.setItem('trauma_token', authToken);
  }catch(e){
    // ignore
  }
}

function connectSocket(){
  if(typeof io === 'undefined' || socket || !authToken) return;
  socket = io({ auth: { token: authToken } });
  socket.on('sessions', list => {
    const sel = $('#sessionSelect');
    if(sel) populateSessionSelect(sel, list);
  });
  socket.on('sessionData', ({id}) => {
    if(id === currentSessionId) loadAll();
  });
}

/* ===== Sessions ===== */
let currentSessionId = localStorage.getItem('trauma_current_session') || null;
const sessionKey = () => 'trauma_v10_' + currentSessionId;

async function getSessions(){
  if(authToken && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/sessions', { headers: { 'Authorization': authToken } });
      if(res.ok){
        const data = await res.json();
        localStorage.setItem('trauma_sessions', JSON.stringify(data));
        return data;
      }
    }catch(e){ /* ignore */ }
  }
  try{ return JSON.parse(localStorage.getItem('trauma_sessions')||'[]'); }catch(e){ return []; }
}
function saveSessions(list){
  localStorage.setItem('trauma_sessions', JSON.stringify(list));
  if(authToken && typeof fetch === 'function'){
    fetch('/api/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify(list)
    }).catch(()=>{});
  }
}
function populateSessionSelect(sel, sessions){
  sel.innerHTML='';
  sessions.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt); });
}
async function initSessions(){
  const select=$('#sessionSelect');
  let sessions=await getSessions();
  if(!sessions.length){
    const id=Date.now().toString(36);
    sessions=[{id,name:'Case 1'}];
    saveSessions(sessions);
    currentSessionId=id;
    localStorage.setItem('trauma_current_session', id);
  }
  if(!currentSessionId || !sessions.some(s=>s.id===currentSessionId)){
    currentSessionId=sessions[0].id;
    localStorage.setItem('trauma_current_session', currentSessionId);
  }
  populateSessionSelect(select, sessions);
  select.value=currentSessionId;

  $('#btnNewSession').addEventListener('click',()=>{
    const name=prompt('Sesijos pavadinimas');
    if(!name) return;
    const id=Date.now().toString(36);
    sessions.push({id,name});
    saveSessions(sessions);
    localStorage.setItem('trauma_current_session', id);
    currentSessionId=id;
    populateSessionSelect(select, sessions);
    select.value=id;
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
  });
  $('#btnRenameSession').addEventListener('click',()=>{
    const sess=sessions.find(s=>s.id===select.value);
    if(!sess) return;
    const name=prompt('Naujas pavadinimas', sess.name);
    if(!name) return;
    sess.name=name;
    saveSessions(sessions);
    populateSessionSelect(select, sessions);
    select.value=currentSessionId;
  });
  select.addEventListener('change',()=>{
    const id=select.value;
    saveAll();
    localStorage.setItem('trauma_current_session', id);
    currentSessionId=id;
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
  });
}

/* ===== Imaging / Labs / Team ===== */
const IMG_CT=['Galvos KT','Kaklo KT','Viso kūno KT'];
const IMG_XRAY=['Krūtinės Ro','Dubens Ro'];
const LABS=['BKT','Biocheminis tyrimas','Krešumai','Fibrinogenas','ROTEM','Kraujo grupė','Kraujo dujos'];
const BLOOD_GROUPS=['0-','0+','A-','A+','B-','B+','AB-','AB+'];
const TEAM_ROLES=['Komandos vadovas','Raštininkas','ED gydytojas 1','ED gydytojas 2','Slaugytoja 1','Slaugytoja 2','Anesteziologas','Chirurgas','Ortopedas'];

const imgCtWrap=$('#imaging_ct'); IMG_CT.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgCtWrap.appendChild(s);});
const imgXrayWrap=$('#imaging_xray'); IMG_XRAY.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgXrayWrap.appendChild(s);});
const imgOtherWrap=$('#imaging_other_group'); ['Kita'].forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgOtherWrap.appendChild(s);});
const labsWrap=$('#labs_basic'); LABS.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; labsWrap.appendChild(s);});
const bloodGroupWrap=$('#bloodGroup'); if(bloodGroupWrap){ BLOOD_GROUPS.forEach(g=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=g; s.textContent=g; bloodGroupWrap.appendChild(s);}); }
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
    labsWrap.appendChild(chip);
    setChipActive(chip,true);
    saveAll();
    bloodUnitsInput.value='';
    $$('.chip',bloodGroupWrap).forEach(c=>setChipActive(c,false));
  });
}
const IMAGING_GROUPS=['#imaging_ct','#imaging_xray','#imaging_other_group'];
const CHIP_GROUPS=['#chips_red','#chips_yellow',...IMAGING_GROUPS,'#labs_basic','#a_airway_group','#b_breath_left_group','#b_breath_right_group','#d_pupil_left_group','#d_pupil_right_group','#spr_decision_group'];
const fastAreas=['Perikardas','Dešinė pleura','Kairė pleura','RUQ','LUQ','Dubuo']; const fastWrap=$('#fastGrid');
fastAreas.forEach(a=>{const box=document.createElement('div'); box.innerHTML=`<label>${a}</label><div class="row"><label class="pill"><input type="radio" name="fast_${a}" value="Yra"> Yra</label><label class="pill"><input type="radio" name="fast_${a}" value="Nėra"> Nėra</label></div>`; fastWrap.appendChild(box);});
const teamWrap=$('#teamGrid'); TEAM_ROLES.forEach(r=>{
  const slug=r.replace(/\s+/g,'_');
  const box=document.createElement('div');
  box.innerHTML=`<label>${r}</label><input type="text" data-team="${r}" data-field="team_${slug}" placeholder="Vardas Pavardė">`;
  teamWrap.appendChild(box);
});

/* ===== SVG Body Map (no canvas) ===== */
const BodySVG=(function(){
  const svg=$('#bodySvg'); const front=$('#layer-front'), back=$('#layer-back'), marks=$('#marks');
  const btnSide=$('#btnSide'), btnUndo=$('#btnUndo'), btnClear=$('#btnClearMap'), btnExport=$('#btnExportSvg');
  const tools=$$('.map-toolbar .tool[data-tool]'); let activeTool='Ž', side='front';
  function setTool(t){ activeTool=t; tools.forEach(b=>b.classList.toggle('active', b.dataset.tool===t)); }
  tools.forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool))); setTool('Ž');

  btnSide.addEventListener('click',()=>{ side=(side==='front')?'back':'front'; front.classList.toggle('hidden', side!=='front'); back.classList.toggle('hidden', side!=='back'); btnSide.textContent='↺ Rodyti: '+(side==='front'?'Priekis':'Nugara'); saveAll(); });

  function svgPoint(evt){
    const pt=svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function addMark(x,y,t,s){
    let use=document.createElementNS('http://www.w3.org/2000/svg','use');
    if(t==='Ž') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-wound');
    if(t==='S') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-bruise');
    if(t==='N') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-burn');
    use.setAttribute('transform',`translate(${x},${y})`);
    use.dataset.type=t; use.dataset.side=s;
    marks.appendChild(use); saveAll();
  }
  ['front-shape','back-shape'].forEach(id=>{
    $('#'+id).addEventListener('click',evt=>{
      const p=svgPoint(evt); addMark(p.x,p.y,activeTool,side);
    });
  });

  btnUndo.addEventListener('click',()=>{
    const list=[...marks.querySelectorAll('use')].filter(u=>u.dataset.side===side);
    const last=list.pop(); if(last){ last.remove(); saveAll(); }
  });
  btnClear.addEventListener('click',()=>{ if(confirm('Išvalyti visas žymas (priekis ir nugara)?')){ marks.innerHTML=''; saveAll(); }});

  btnExport.addEventListener('click',()=>{
    const clone=svg.cloneNode(true);
    (clone.querySelector('#layer-front')).classList.toggle('hidden', side!=='front');
    (clone.querySelector('#layer-back')).classList.toggle('hidden', side!=='back');
    const ser=new XMLSerializer(); const src=ser.serializeToString(clone);
    const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
    const a=document.createElement('a'); a.href=url; a.download=('kuno-zemelapis-'+side+'.svg'); a.click();
  });

  function serialize(){
    const arr=[...marks.querySelectorAll('use')].map(u=>{
      const tr=u.getAttribute('transform'); const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(tr)||[0,0,0];
      return {x:+m[1], y:+m[2], type:u.dataset.type, side:u.dataset.side};
    });
    return JSON.stringify({side,tool:activeTool,marks:arr});
  }
  function load(raw){
    try{
      const o=typeof raw==='string'?JSON.parse(raw):raw;
      side=o.side||'front'; activeTool=o.tool||'Ž';
      front.classList.toggle('hidden', side!=='front'); back.classList.toggle('hidden', side!=='back');
      btnSide.textContent='↺ Rodyti: '+(side==='front'?'Priekis':'Nugara');
      setTool(activeTool);
      marks.innerHTML='';
      (o.marks||[]).forEach(m=>addMark(m.x,m.y,m.type,m.side));
    }catch(e){}
  }
  function counts(){
    const arr=[...marks.querySelectorAll('use')].map(u=>({type:u.dataset.type, side:u.dataset.side}));
    const cnt={front:{Ž:0,S:0,N:0}, back:{Ž:0,S:0,N:0}};
    arr.forEach(m=>{ if(cnt[m.side] && (m.type in cnt[m.side])) cnt[m.side][m.type]++; });
    return cnt;
  }

  return {serialize,load,counts,get side(){return side;},get tool(){return activeTool;}};
})();

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
const FIELD_SELECTORS='input[type="text"],input[type="number"],input[type="time"],input[type="date"],textarea,select,#patient_name,#patient_age,#patient_sex,#patient_id';
let fields=[];
const getFields=()=>fields.length?fields:(fields=$$(FIELD_SELECTORS));

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

export function saveAll(){
  if(!currentSessionId) return;
  const data={};
  getFields().forEach(el=>{
    const key=el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type==='radio'){ if(el.checked) data[key+'__'+el.value]=true; }
    else if(el.type==='checkbox'){ data[key]=el.checked?'__checked__':(el.value||''); }
    else{ data[key]=el.value; }
  });
  CHIP_GROUPS.forEach(sel=>{ const arr=$$('.chip.active',$(sel)).map(c=>c.dataset.value); data['chips:'+sel]=arr; });
  function pack(container){ return Array.from(container.children).map(card=>({ name:(card.querySelector('.act_custom_name')?card.querySelector('.act_custom_name').value:card.querySelector('.act_name').textContent.trim()), on:card.querySelector('.act_chk').checked, time:card.querySelector('.act_time').value, dose:(card.querySelector('.act_dose')?card.querySelector('.act_dose').value:''), note:card.querySelector('.act_note').value }));}
  data['pain_meds']=pack($('#pain_meds')); data['bleeding_meds']=pack($('#bleeding_meds')); data['other_meds']=pack($('#other_meds')); data['procs']=pack($('#procedures'));
  data['bodymap_svg']=BodySVG.serialize();
  localStorage.setItem(sessionKey(), JSON.stringify(data));
  if(authToken && typeof fetch === 'function'){
    fetch(`/api/sessions/${currentSessionId}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify(data)
    }).catch(()=>{});
  }
}
export function loadAll(){
  if(!currentSessionId) return;
  const apply=data=>{
    getFields().forEach(el=>{
      const key=el.dataset.field || el.id || el.name;
      if(!key) return;
      if(el.type==='radio'){ if(data[key+'__'+el.value]) el.checked=true; }
      else if(el.type==='checkbox'){ el.checked=(data[key]==='__checked__'); }
      else{ if(data[key]!=null) el.value=data[key]; }
    });
    CHIP_GROUPS.forEach(sel=>{ const arr=data['chips:'+sel]||[]; $$('.chip',$(sel)).forEach(c=>c.classList.toggle('active',arr.includes(c.dataset.value))); });
    const labsArr=data['chips:#labs_basic']||[];
    const labsContainer=$('#labs_basic');
    labsArr.forEach(val=>{
      if(!$$('.chip',labsContainer).some(c=>c.dataset.value===val)){
        const chip=document.createElement('span');
        chip.className='chip';
        chip.dataset.value=val;
        chip.textContent=val;
        labsContainer.appendChild(chip);
      }
    });
    $$('.chip',labsContainer).forEach(c=>c.classList.toggle('active',labsArr.includes(c.dataset.value)));
    function unpack(container,records){ if(!Array.isArray(records)) return; Array.from(container.children).forEach((card,i)=>{ const r=records[i]; if(!r) return; card.querySelector('.act_chk').checked=!!r.on; card.querySelector('.act_time').value=r.time||''; const d=card.querySelector('.act_dose'); if(d) d.value=r.dose||''; card.querySelector('.act_note').value=r.note||''; const cn=card.querySelector('.act_custom_name'); if(cn) cn.value=r.name||'';});}
    unpack($('#pain_meds'),data['pain_meds']); unpack($('#bleeding_meds'),data['bleeding_meds']); unpack($('#other_meds'),data['other_meds']); unpack($('#procedures'),data['procs']);
    if(data['bodymap_svg']) BodySVG.load(data['bodymap_svg']);
    $('#d_pupil_left_note').style.display = ($$('.chip.active', $('#d_pupil_left_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
    $('#d_pupil_right_note').style.display = ($$('.chip.active', $('#d_pupil_right_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
    $('#oxygenFields').style.display = ($('#b_oxygen_liters').value || $('#b_oxygen_type').value) ? 'flex' : 'none';
    $('#dpvFields').style.display = $('#b_dpv_fio2').value ? 'flex' : 'none';
    $('#spr_skyrius_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Stacionarizavimas'))?'block':'none';
    $('#spr_ligonine_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Pervežimas į kitą ligoninę'))?'block':'none';
    $('#spr_skyrius_kita').style.display = ($('#spr_skyrius').value === 'Kita') ? 'block' : 'none';
    $('#imaging_other').style.display = (IMAGING_GROUPS.some(sel=>$$('.chip.active', $(sel)).some(c=>c.dataset.value==='Kita')))?'block':'none';
    ensureSingleTeam();
    updateActivationIndicator();
    expandOutput();
  };
  const fallback=()=>{
    const raw=localStorage.getItem(sessionKey()); if(!raw) return; try{ apply(JSON.parse(raw)); }catch(e){}
  };
  if(authToken && typeof fetch === 'function'){
    fetch(`/api/sessions/${currentSessionId}/data`, { headers:{ 'Authorization': authToken }})
      .then(r=>r.json()).then(d=>{ localStorage.setItem(sessionKey(), JSON.stringify(d)); apply(d); })
      .catch(fallback);
  } else {
    fallback();
  }
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
  const btn = prefix==='spr' ? $('#btnSprGCSCalc') : $('#btnGCSCalc');
  if(!panel||!selA||!selK||!selM||!apply||!total) return ()=>{};

  const update=()=>{ total.textContent=gksSum(selA.value,selK.value,selM.value); };
  [selA,selK,selM].forEach(sel=>sel.addEventListener('change',update));

  const close=()=>{
    panel.style.display='none';
    document.removeEventListener('keydown',onKey);
    document.removeEventListener('click',onDocClick);
    if(btn) btn.focus();
  };
  const onKey=e=>{ if(e.key==='Escape') close(); };
  const onDocClick=e=>{ if(!panel.contains(e.target) && e.target!==btn) close(); };

  apply.addEventListener('click',()=>{
    if(selA.value) $(`#${prefix}_gksa`).value=selA.value;
    if(selK.value) $(`#${prefix}_gksk`).value=selK.value;
    if(selM.value) $(`#${prefix}_gksm`).value=selM.value;
    ['#'+prefix+'_gksa','#'+prefix+'_gksk','#'+prefix+'_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
    close();
    saveAll();
  });

  return ()=>{
    const hidden=panel.style.display==='none';
    if(hidden){
      panel.style.display='block';
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
$('#e_back_ny').addEventListener('change',e=>{ $('#e_back_notes').disabled=e.target.checked; if(e.target.checked) $('#e_back_notes').value=''; saveAll();});

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

function showInlineError(el,msg){
  let err = el.nextElementSibling;
  if(!err || !err.classList.contains('input-error')){
    err = document.createElement('span');
    err.className = 'input-error';
    err.style.color = 'var(--danger)';
    err.style.fontSize = '12px';
    err.style.marginLeft = '4px';
    el.insertAdjacentElement('afterend', err);
  }
  err.textContent = msg;
  err.style.display = msg ? 'inline' : 'none';
}

export function validateVitals(){
  const fields=['#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm','#d_gksa','#d_gksk','#d_gksm'];
  fields.forEach(sel=>{
    const el=$(sel);
    if(!el) return;
    const val=el.value.trim();
    let msg='';
    if(val!==''){
      const num=parseFloat(val);
      const min=el.getAttribute('min');
      const max=el.getAttribute('max');
      if((min!==null && num<parseFloat(min)) || (max!==null && num>parseFloat(max))){
        msg=`Leistina ${min}–${max}`;
      }
    }
    showInlineError(el,msg);
  });
  return true;
}
window.validateVitals=validateVitals;

/* ===== Init modules ===== */
async function init(){
  await ensureLogin();
  connectSocket();
  await initSessions();
  initTabs();
  initChips(saveAllDebounced);
  initAutoActivate(saveAllDebounced);
  initActions(saveAllDebounced);
  initTimeline();
  setupActivationControls();
  fields = $$(FIELD_SELECTORS);
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
    const vitalSelectors=['#gmp_hr','#gmp_rr','#gmp_spo2','#gmp_sbp','#gmp_dbp','#gmp_gksa','#gmp_gksk','#gmp_gksm','#d_gksa','#d_gksk','#d_gksm'];
    vitalSelectors.forEach(sel=>{ const el=$(sel); if(el) el.addEventListener('input', validateVitals); });
    loadAll();
    clampNumberInputs();
    validateVitals();
    updateDGksTotal();
    updateGmpGksTotal();
  }
  window.addEventListener('DOMContentLoaded', init);

/* ===== Report ===== */
function gksSum(a,k,m){ a=+a||0;k=+k||0;m=+m||0; return (a&&k&&m)?(a+k+m):''; }
const getSingleValue=sel=>listChips(sel)[0]||'';
function bodymapSummary(){
  try{
    const data=JSON.parse(localStorage.getItem(sessionKey())||'{}'); if(!data.bodymap_svg) return '';
    const o=JSON.parse(data.bodymap_svg); const cnt={front:{Ž:0,S:0,N:0}, back:{Ž:0,S:0,N:0}};
    (o.marks||[]).forEach(m=>{ if(cnt[m.side] && cnt[m.side][m.type]!=null) cnt[m.side][m.type]++; });
    const total=(cnt.front.Ž+cnt.front.S+cnt.front.N)+(cnt.back.Ž+cnt.back.S+cnt.back.N);
    if(!total) return '';
    const pack=side=>`(${cnt[side]['Ž']} Ž, ${cnt[side]['S']} S, ${cnt[side]['N']} N)`;
    return `Žemėlapis: Priekis ${pack('front')}, Nugara ${pack('back')} — viso ${total} žymos.`;
  }catch(e){ return ''; }
}

export function generateReport(){
  const out=[];
  const patient={ name:$('#patient_name').value, age:$('#patient_age').value, sex:$('#patient_sex').value, id:$('#patient_id').value };
  const patientLine=[patient.name?`Vardas: ${patient.name}`:null, patient.age?`Amžius ${patient.age}`:null, patient.sex?`Lytis ${patient.sex}`:null, patient.id?`ID ${patient.id}`:null].filter(Boolean).join('; ');
  if(patientLine){ out.push('--- Pacientas ---'); out.push(patientLine); }
  const red=listChips('#chips_red'), yellow=listChips('#chips_yellow');
  const gmp={ hr:$('#gmp_hr').value, rr:$('#gmp_rr').value, spo2:$('#gmp_spo2').value, sbp:$('#gmp_sbp').value, dbp:$('#gmp_dbp').value, gksa:$('#gmp_gksa').value, gksk:$('#gmp_gksk').value, gksm:$('#gmp_gksm').value, time:$('#gmp_time').value, mechanism:$('#gmp_mechanism').value, notes:$('#gmp_notes').value };
  const gksGMP=gksSum(gmp.gksa,gmp.gksk,gmp.gksm);
  const gmpMeta=[gmp.time?`GMP ${gmp.time}`:null, gmp.mechanism?`Mechanizmas: ${gmp.mechanism}`:null].filter(Boolean).join('; ');
  const gmpLine=[gmp.hr?`ŠSD ${gmp.hr}/min`:null, gmp.rr?`KD ${gmp.rr}/min`:null, gmp.spo2?`SpO₂ ${gmp.spo2}%`:null, (gmp.sbp||gmp.dbp)?`AKS ${gmp.sbp}/${gmp.dbp}`:null, gksGMP?`GKS ${gksGMP} (A${gmp.gksa}-K${gmp.gksk}-M${gmp.gksm})`:null].filter(Boolean).join('; ');
  out.push('--- Aktyvacija ---'); if(gmpMeta) out.push(gmpMeta); if(gmpLine) out.push(gmpLine); if(gmp.notes) out.push('Pastabos: '+gmp.notes); if(red.length) out.push('RAUDONA: '+red.join(', ')); if(yellow.length) out.push('GELTONA: '+yellow.join(', '));

  out.push('\n--- A Kvėpavimo takai ---'); out.push(['Takai: '+(getSingleValue('#a_airway_group')||'-'), $('#a_notes').value?('Pastabos: '+$('#a_notes').value):null].filter(Boolean).join(' | '));

  out.push('\n--- B Kvėpavimas ---'); out.push([
    $('#b_rr').value?('KD '+$('#b_rr').value+'/min'):null,
    $('#b_spo2').value?('SpO₂ '+$('#b_spo2').value+'%'):null,
    'Alsavimas kairė '+(getSingleValue('#b_breath_left_group')||'–')+', dešinė '+(getSingleValue('#b_breath_right_group')||'–'),
    ($('#b_oxygen_liters').value||$('#b_oxygen_type').value)?('O2 '+($('#b_oxygen_liters').value?$('#b_oxygen_liters').value+' L/min ':'')+($('#b_oxygen_type').value?$('#b_oxygen_type').value:'')):null,
    $('#b_dpv_fio2').value?('DPV FiO₂ '+$('#b_dpv_fio2').value):null
  ].filter(Boolean).join('; '));

  out.push('\n--- C Kraujotaka ---'); out.push([$('#c_hr').value?('ŠSD '+$('#c_hr').value+'/min'):null, ($('#c_sbp').value||$('#c_dbp').value)?('AKS '+$('#c_sbp').value+'/'+$('#c_dbp').value):null, $('#c_caprefill').value?('KPL '+$('#c_caprefill').value+'s'):null].filter(Boolean).join('; '));

  const dgks=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value); const left=getSingleValue('#d_pupil_left_group'); const right=getSingleValue('#d_pupil_right_group');
  out.push('\n--- D Sąmonė ---'); out.push([dgks?('GKS '+dgks+' (A'+$('#d_gksa').value+'-K'+$('#d_gksk').value+'-M'+$('#d_gksm').value+')'):null, left?('Vyzdžiai kairė: '+left+ (left==='kita'&&$('#d_pupil_left_note').value?(' ('+$('#d_pupil_left_note').value+')'):'') ):null, right?('Vyzdžiai dešinė: '+right+ (right==='kita'&&$('#d_pupil_right_note').value?(' ('+$('#d_pupil_right_note').value+')'):'') ):null, $('#d_notes').value?('Pastabos: '+$('#d_notes').value):null].filter(Boolean).join(' | '));

  out.push('\n--- E Kita ---'); out.push([$('#e_temp').value?('T '+$('#e_temp').value+'°C'):null, $('#e_back_ny').checked?'Nugara: n.y.':($('#e_back_notes').value?('Nugara: '+$('#e_back_notes').value):null), $('#e_other').value?('Kita: '+$('#e_other').value):null, bodymapSummary()].filter(Boolean).join(' | '));

  function collect(container){ return Array.from(container.children).map(card=>{ const on=card.querySelector('.act_chk').checked; if(!on) return null; const nameInput=card.querySelector('.act_custom_name'); const base=card.querySelector('.act_name').textContent.trim(); const customName=nameInput?nameInput.value.trim():''; const name=nameInput?customName:base; if(nameInput && !customName) return null; const time=card.querySelector('.act_time').value; const doseInput=card.querySelector('.act_dose'); const dose=doseInput?doseInput.value:''; const note=card.querySelector('.act_note').value; return [name, time?('laikas '+time):null, dose?('dozė '+dose):null, note?('pastabos '+note):null].filter(Boolean).join(' | '); }).filter(Boolean);}
  const pain=collect($('#pain_meds')), bleeding=collect($('#bleeding_meds')), other=collect($('#other_meds')), procs=collect($('#procedures'));
  if(pain.length||bleeding.length||other.length||procs.length){
    out.push('\n--- Intervencijos ---');
    if(pain.length) out.push('Medikamentai (skausmo kontrolė):\n'+pain.join('\n'));
    if(bleeding.length) out.push('Medikamentai (kraujavimo kontrolė):\n'+bleeding.join('\n'));
    if(other.length) out.push('Medikamentai (kita):\n'+other.join('\n'));
    if(procs.length) out.push('Procedūros:\n'+procs.join('\n'));
  }

  let imgs=[...listChips('#imaging_ct'), ...listChips('#imaging_xray')];
  if(listChips('#imaging_other_group').includes('Kita')){
    const other=$('#imaging_other').value.trim();
    if(other) imgs.push(other);
  }
  const fr=fastAreas.map(a=>{ const y=document.querySelector('input[name="fast_'+a+'"][value="Yra"]')?.checked; const n=document.querySelector('input[name="fast_'+a+'"][value="Nėra"]')?.checked; return y? a+': skystis Yra' : (n? a+': skystis Nėra' : null); }).filter(Boolean);
  if(imgs.length||fr.length){ out.push('\n--- Vaizdiniai tyrimai ---'); if(imgs.length) out.push('Užsakyta: '+imgs.join(', ')); if(fr.length) out.push('FAST: '+fr.join(' | ')); }

  const labs=listChips('#labs_basic'); if(labs.length){ out.push('\n--- Laboratorija ---'); out.push(labs.join(', ')); }

  const team=TEAM_ROLES.map(r=>{ const el=document.querySelector('input[data-team="'+r+'"]'); const v=el?.value?.trim(); return v? r+': '+v : null; }).filter(Boolean); if(team.length){ out.push('\n--- Komanda ---'); out.push(team.join(' | ')); }

    const sprDecision=getSingleValue('#spr_decision_group');
    const sprSkyrius = sprDecision==='Stacionarizavimas'
      ? ($('#spr_skyrius').value==='Kita' ? $('#spr_skyrius_kita').value : $('#spr_skyrius').value)
      : '';
    const sprLigonine = sprDecision==='Pervežimas į kitą ligoninę'
      ? $('#spr_ligonine').value
      : '';
    const sprGks=gksSum($('#spr_gksa').value,$('#spr_gksk').value,$('#spr_gksm').value);
    const sprVitals=[
      $('#spr_hr').value?('ŠSD '+$('#spr_hr').value+'/min'):null,
      $('#spr_rr').value?('KD '+$('#spr_rr').value+'/min'):null,
      $('#spr_spo2').value?('SpO₂ '+$('#spr_spo2').value+'%'):null,
      ($('#spr_sbp').value||$('#spr_dbp').value)?('AKS '+$('#spr_sbp').value+'/'+$('#spr_dbp').value):null,
      sprGks?(`GKS ${sprGks} (A${$('#spr_gksa').value}-K${$('#spr_gksk').value}-M${$('#spr_gksm').value})`):null
    ].filter(Boolean).join('; ');
    if(sprDecision || $('#spr_time').value || sprVitals){
      out.push('\n--- Sprendimas ---');
      const meta=[
        $('#spr_time').value?('Laikas '+$('#spr_time').value):null,
        sprDecision?('Sprendimas: '+sprDecision):null,
        sprDecision==='Stacionarizavimas' && sprSkyrius?('Skyrius: '+sprSkyrius):null,
        sprDecision==='Pervežimas į kitą ligoninę' && sprLigonine?('Ligoninė: '+sprLigonine):null
      ].filter(Boolean).join(' | ');
      if(meta) out.push(meta);
      if(sprVitals) out.push(sprVitals);
    }

    $('#output').value=out.filter(Boolean).join('\n');
    expandOutput();
    showTab('Ataskaita');
    saveAll();
}
document.getElementById('btnGen').addEventListener('click', generateReport);

document.getElementById('btnCopy').addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText($('#output').value||''); alert('Nukopijuota.'); }catch(e){ alert('Nepavyko nukopijuoti.'); }});
document.getElementById('btnSave').addEventListener('click',()=>{ saveAll(); alert('Išsaugota naršyklėje.');});
document.getElementById('btnClear').addEventListener('click',()=>{ if(confirm('Išvalyti viską?')){ localStorage.removeItem(sessionKey()); location.reload(); }});
document.getElementById('btnPdf').addEventListener('click',async()=>{
  generateReport();
  const text=$('#output').value||'';
  const { jsPDF } = await import('../node_modules/jspdf/dist/jspdf.umd.min.js');
  const doc=new jsPDF();
  const lines=doc.splitTextToSize(text,180);
  doc.text(lines,10,10);
  doc.save('report.pdf');
});
document.getElementById('btnPrint').addEventListener('click',()=>{
  const prevTab=localStorage.getItem('v10_activeTab');
  document.getElementById('btnGen').click();
  window.print();
  if(prevTab) showTab(prevTab);
});
