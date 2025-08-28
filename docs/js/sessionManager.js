import { $, $$ } from './utils.js';
import bodyMap from './bodyMap.js';

let authToken = localStorage.getItem('trauma_token') || null;
let currentSessionId = localStorage.getItem('trauma_current_session') || null;

const MAX_FIELD_LENGTH = 500;
const limit = (val, max = MAX_FIELD_LENGTH) => (val || '').toString().slice(0, max);

export function initTheme(){
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
}

export function sessionKey(){
  return 'trauma_v10_' + currentSessionId;
}

export function setCurrentSessionId(id){
  currentSessionId = id;
  if(id) localStorage.setItem('trauma_current_session', id);
  else localStorage.removeItem('trauma_current_session');
}

export function getCurrentSessionId(){
  return currentSessionId;
}

const IMAGING_GROUPS=['#imaging_ct','#imaging_xray','#imaging_other_group'];
const CHIP_GROUPS=['#chips_red','#chips_yellow',...IMAGING_GROUPS,'#labs_basic','#a_airway_group','#b_breath_left_group','#b_breath_right_group','#c_pulse_radial_group','#c_pulse_femoral_group','#c_skin_temp_group','#c_skin_color_group','#d_pupil_left_group','#d_pupil_right_group','#spr_decision_group'];
const FIELD_SELECTORS='input[type="text"],input[type="number"],input[type="time"],input[type="date"],textarea,select';

export async function saveAll(){
  if(!currentSessionId) return;
  const data={};
  $$(FIELD_SELECTORS).forEach(el=>{
    const key=el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type==='radio'){ if(el.checked) data[key+'__'+el.value]=true; }
    else if(el.type==='checkbox'){ data[key]=el.checked?'__checked__':limit(el.value); }
    else{ data[key]=limit(el.value); }
  });
  CHIP_GROUPS.forEach(sel=>{ const arr=$$('.chip.active',$(sel)).map(c=>c.dataset.value); data['chips:'+sel]=arr; });
  function pack(container){ return Array.from(container.children).map(card=>({ name:limit(card.querySelector('.act_custom_name')?card.querySelector('.act_custom_name').value:card.querySelector('.act_name').textContent.trim()), on:card.querySelector('.act_chk').checked, time:limit(card.querySelector('.act_time').value), dose:limit(card.querySelector('.act_dose')?card.querySelector('.act_dose').value:''), note:limit(card.querySelector('.act_note').value) }));}
  data['pain_meds']=pack($('#pain_meds')); data['bleeding_meds']=pack($('#bleeding_meds')); data['other_meds']=pack($('#other_meds')); data['procs']=pack($('#procedures'));
  data['bodymap_svg']=limit(bodyMap.serialize(), 200000);
  localStorage.setItem(sessionKey(), JSON.stringify(data));
  const statusEl = $('#saveStatus');
  if(statusEl){
    statusEl.textContent='Saving...';
    statusEl.classList.remove('offline');
  }
  if(authToken && typeof fetch === 'function'){
    try{
      const res = await fetch(`/api/sessions/${currentSessionId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify(data)
      });
      if(!res.ok) throw new Error(res.status);
      if(statusEl){ statusEl.textContent='Saved'; statusEl.classList.remove('offline'); }
    }catch(e){
      if(statusEl){ statusEl.textContent='Save failed'; statusEl.classList.add('offline'); }
    }
  } else if(statusEl){
    statusEl.textContent='Saved';
  }
}

export function loadAll(){
  if(!currentSessionId) return;
  const apply=data=>{
    $$(FIELD_SELECTORS).forEach(el=>{
      const key=el.dataset.field || el.id || el.name;
      if(!key) return;
      if(el.type==='radio'){ el.checked=!!data[key+'__'+el.value]; }
      else if(el.type==='checkbox'){ el.checked=(data[key]==='__checked__'); }
      else{ el.value = data[key] ?? ''; }
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
    function unpack(container,records){
      const arr=Array.isArray(records)?records:[];
      Array.from(container.children).forEach((card,i)=>{
        const r=arr[i]||{};
        card.querySelector('.act_chk').checked=!!r.on;
        card.querySelector('.act_time').value=r.time||'';
        const d=card.querySelector('.act_dose'); if(d) d.value=r.dose||'';
        card.querySelector('.act_note').value=r.note||'';
        const cn=card.querySelector('.act_custom_name'); if(cn) cn.value=r.name||'';
      });
    }
    unpack($('#pain_meds'),data['pain_meds']); unpack($('#bleeding_meds'),data['bleeding_meds']); unpack($('#other_meds'),data['other_meds']); unpack($('#procedures'),data['procs']);
    bodyMap.load(data['bodymap_svg']||'{}');
      const showLeftNote = $$('.chip.active', $('#d_pupil_left_group')).some(c=>c.dataset.value==='kita');
      const leftNote = $('#d_pupil_left_note');
      const leftLabel = $('#d_pupil_left_wrapper label[for="d_pupil_left_note"]');
      leftNote.hidden = !showLeftNote;
      leftNote.classList.toggle('hidden', !showLeftNote);
      if(leftLabel){ leftLabel.hidden = !showLeftNote; leftLabel.classList.toggle('hidden', !showLeftNote); }
      const leftWrapper = $('#d_pupil_left_wrapper');
      if(leftWrapper) leftWrapper.setAttribute('aria-expanded', showLeftNote);
      const showRightNote = $$('.chip.active', $('#d_pupil_right_group')).some(c=>c.dataset.value==='kita');
      const rightNote = $('#d_pupil_right_note');
      const rightLabel = $('#d_pupil_right_wrapper label[for="d_pupil_right_note"]');
      rightNote.hidden = !showRightNote;
      rightNote.classList.toggle('hidden', !showRightNote);
      if(rightLabel){ rightLabel.hidden = !showRightNote; rightLabel.classList.toggle('hidden', !showRightNote); }
      const rightWrapper = $('#d_pupil_right_wrapper');
      if(rightWrapper) rightWrapper.setAttribute('aria-expanded', showRightNote);
      const showBack = $$('.chip.active', $('#e_back_group')).some(c=>c.dataset.value==='Pakitimai');
      const backNote = $('#e_back_notes');
      backNote.style.display = showBack ? 'block' : 'none';
      backNote.classList.toggle('hidden', !showBack);
      const showAbdomen = $$('.chip.active', $('#e_abdomen_group')).some(c=>c.dataset.value==='Pakitimai');
      const abdomenNote = $('#e_abdomen_notes');
      abdomenNote.style.display = showAbdomen ? 'block' : 'none';
      abdomenNote.classList.toggle('hidden', !showAbdomen);
      const showSkinColorOther = $$('.chip.active', $('#c_skin_color_group')).some(c=>c.dataset.value==='Kita');
      const skinColorOther = $('#c_skin_color_other');
      skinColorOther.hidden = !showSkinColorOther;
      skinColorOther.classList.toggle('hidden', !showSkinColorOther);
      $('#oxygenFields').classList.toggle('hidden', !($('#b_oxygen_liters').value || $('#b_oxygen_type').value));
      $('#dpvFields').classList.toggle('hidden', !$('#b_dpv_fio2').value);
    const showSky = $$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Stacionarizavimas');
    const skyBox = $('#spr_skyrius_container');
    skyBox.style.display = showSky ? 'block' : 'none';
    skyBox.classList.toggle('hidden', !showSky);
    const showHosp = $$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Pervežimas į kitą ligoninę');
    const hospBox = $('#spr_ligonine_container');
    hospBox.style.display = showHosp ? 'block' : 'none';
    hospBox.classList.toggle('hidden', !showHosp);
    const showSkyOther = ($('#spr_skyrius').value === 'Kita');
    const skyOther = $('#spr_skyrius_kita');
    skyOther.style.display = showSkyOther ? 'block' : 'none';
    skyOther.classList.toggle('hidden', !showSkyOther);
    const showImgOther = (IMAGING_GROUPS.some(sel=>$$('.chip.active', $(sel)).some(c=>c.dataset.value==='Kita')));
    const imgOther = $('#imaging_other');
    imgOther.style.display = showImgOther ? 'block' : 'none';
    imgOther.classList.toggle('hidden', !showImgOther);
  };
  const fallback=()=>{
    const raw=localStorage.getItem(sessionKey());
    if(!raw){ apply({}); return; }
    try{ apply(JSON.parse(raw)); }catch(e){ console.error(e); }
  };
  if(authToken && typeof fetch === 'function'){
    fetch(`/api/sessions/${currentSessionId}/data`, { headers:{ 'Authorization': 'Bearer ' + authToken }})
      .then(r=>r.json()).then(d=>{ localStorage.setItem(sessionKey(), JSON.stringify(d)); apply(d); })
      .catch(fallback);
  } else {
    fallback();
  }
}

export function getAuthToken(){ return authToken; }

export function setAuthToken(token){
  authToken = token;
  if(token) localStorage.setItem('trauma_token', token);
  else localStorage.removeItem('trauma_token');
}

export async function logout(){
  if(authToken && typeof fetch==='function'){
    try{ await fetch('/api/logout',{ method:'POST', headers:{ 'Authorization':'Bearer '+authToken } }); }catch(e){ console.error(e); }
  }
  authToken=null;
  localStorage.removeItem('trauma_token');
  location.reload();
}
