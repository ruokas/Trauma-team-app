import { $, $$ } from './utils.js';
import { notify } from './alerts.js';
import bodyMap from './bodyMap.js';
/* global io */

let authToken = localStorage.getItem('trauma_token') || null;
let socket = null;
const socketEndpoint = window.socketEndpoint || window.SOCKET_URL;
let currentSessionId = localStorage.getItem('trauma_current_session') || null;

function updateUserList(users){
  const el=document.getElementById('userList');
  if(el) el.textContent=users.length?`Prisijungę: ${users.join(', ')}`:'';
}

export async function fetchUsers(){
  if(authToken && typeof fetch==='function'){
    try{
      const res=await fetch('/api/users',{ headers:{ 'Authorization':'Bearer '+authToken } });
      if(res.ok){
        const data=await res.json();
        updateUserList(data);
      }
    }catch(e){ console.error(e); }
  }
}

export function initTheme(){
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
}

export function connectSocket(){
  if(typeof io === 'undefined' || socket || !authToken) return;
  socket = io(socketEndpoint || undefined, { auth: { token: 'Bearer ' + authToken } });
  socket.on('sessions', list => {
    const sel = $('#sessionSelect');
    if(sel) populateSessionSelect(sel, list);
  });
  socket.on('sessionData', ({id}) => {
    if(id === currentSessionId) loadAll();
  });
  socket.on('users', list=>updateUserList(list));
}

export function sessionKey(){
  return 'trauma_v10_' + currentSessionId;
}

export function setCurrentSessionId(id){
  currentSessionId = id;
  if(id) localStorage.setItem('trauma_current_session', id);
  else localStorage.removeItem('trauma_current_session');
}

async function getSessions(){
  if(authToken && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/sessions', { headers: { 'Authorization': 'Bearer ' + authToken } });
      if(res.ok){
        const data = await res.json();
        localStorage.setItem('trauma_sessions', JSON.stringify(data));
        return data;
      }
    }catch(e){ console.error(e); }
  }
  try{ return JSON.parse(localStorage.getItem('trauma_sessions')||'[]'); }catch(e){ return []; }
}

function saveSessions(list){
  localStorage.setItem('trauma_sessions', JSON.stringify(list));
  if(authToken && typeof fetch === 'function'){
    fetch('/api/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify(list)
    }).catch(()=>{});
  }
}

function populateSessionSelect(sel, sessions){
  sel.innerHTML='';
  sessions.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt); });
}

export async function initSessions(){
  const select=$('#sessionSelect');
  let sessions=await getSessions();
  let delWrap=$('#sessionDeleteList');
  if(!delWrap){
    delWrap=document.createElement('div');
    delWrap.id='sessionDeleteList';
    select.parentNode.appendChild(delWrap);
  }
  function renderDeleteButtons(){
    delWrap.innerHTML='';
    sessions.forEach(s=>{
      const row=document.createElement('div');
      row.className='session-item';
      const label=document.createElement('span');
      label.textContent=s.name;
      const rename=document.createElement('button');
      rename.type='button';
      rename.textContent='✎';
      rename.className='btn ghost';
      rename.setAttribute('aria-label','Rename session');
      rename.addEventListener('click',async()=>{
        const name=await notify({type:'prompt', message:'Naujas pavadinimas', defaultValue:s.name});
        if(!name) return;
        s.name=name;
        localStorage.setItem('trauma_sessions', JSON.stringify(sessions));
        populateSessionSelect(select, sessions);
        if(currentSessionId){ select.value=currentSessionId; }
        renderDeleteButtons();
        if(authToken && typeof fetch==='function'){
          try{
            await fetch(`/api/sessions/${s.id}`, {
              method:'PUT',
              headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+authToken },
              body:JSON.stringify({name})
            });
          }catch(e){ console.error(e); }
        }
      });
      const btn=document.createElement('button');
      btn.type='button';
      btn.textContent='✖';
      btn.className='btn ghost';
      btn.setAttribute('aria-label','Delete session');
      btn.addEventListener('click',async()=>{
        if(!await notify({type:'confirm', message:'Ar tikrai norite ištrinti pacientą?'})) return;
        if(authToken && typeof fetch==='function'){
          try{ await fetch(`/api/sessions/${s.id}`, { method:'DELETE', headers:{ 'Authorization': 'Bearer ' + authToken } }); }catch(e){ console.error(e); }
        }
        const wasCurrent=currentSessionId===s.id;
        sessions=sessions.filter(x=>x.id!==s.id);
        localStorage.removeItem('trauma_v10_'+s.id);
        localStorage.setItem('trauma_sessions', JSON.stringify(sessions));
        if(wasCurrent){
          currentSessionId=sessions[0]?.id||null;
          if(currentSessionId) localStorage.setItem('trauma_current_session', currentSessionId); else localStorage.removeItem('trauma_current_session');
        }
        populateSessionSelect(select, sessions);
        if(currentSessionId){ select.value=currentSessionId; } else { select.value=''; }
        if(wasCurrent){
          localStorage.setItem('v10_activeTab','Aktyvacija');
          location.reload();
        }else{
          renderDeleteButtons();
        }
      });
      row.appendChild(label);
      row.appendChild(rename);
      row.appendChild(btn);
      delWrap.appendChild(row);
    });
  }
  if(!sessions.length){
    const id=Date.now().toString(36);
    sessions=[{id,name:'Pacientas Nr.1'}];
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
  renderDeleteButtons();

  $('#btnNewSession').addEventListener('click',async()=>{
    const name=await notify({type:'prompt', message:'Paciento ID'});
    if(!name) return;
    const id=Date.now().toString(36);
    sessions.push({id,name});
    saveSessions(sessions);
    localStorage.setItem('trauma_current_session', id);
    currentSessionId=id;
    populateSessionSelect(select, sessions);
    select.value=id;
    renderDeleteButtons();
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
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

const IMAGING_GROUPS=['#imaging_ct','#imaging_xray','#imaging_other_group'];
const CHIP_GROUPS=['#chips_red','#chips_yellow',...IMAGING_GROUPS,'#labs_basic','#a_airway_group','#b_breath_left_group','#b_breath_right_group','#d_pupil_left_group','#d_pupil_right_group','#spr_decision_group'];
const FIELD_SELECTORS='input[type="text"],input[type="number"],input[type="time"],input[type="date"],textarea,select';

export function saveAll(){
  if(!currentSessionId) return;
  const data={};
  $$(FIELD_SELECTORS).forEach(el=>{
    const key=el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type==='radio'){ if(el.checked) data[key+'__'+el.value]=true; }
    else if(el.type==='checkbox'){ data[key]=el.checked?'__checked__':(el.value||''); }
    else{ data[key]=el.value; }
  });
  CHIP_GROUPS.forEach(sel=>{ const arr=$$('.chip.active',$(sel)).map(c=>c.dataset.value); data['chips:'+sel]=arr; });
  function pack(container){ return Array.from(container.children).map(card=>({ name:(card.querySelector('.act_custom_name')?card.querySelector('.act_custom_name').value:card.querySelector('.act_name').textContent.trim()), on:card.querySelector('.act_chk').checked, time:card.querySelector('.act_time').value, dose:(card.querySelector('.act_dose')?card.querySelector('.act_dose').value:''), note:card.querySelector('.act_note').value }));}
  data['pain_meds']=pack($('#pain_meds')); data['bleeding_meds']=pack($('#bleeding_meds')); data['other_meds']=pack($('#other_meds')); data['procs']=pack($('#procedures'));
  data['bodymap_svg']=bodyMap.serialize();
  localStorage.setItem(sessionKey(), JSON.stringify(data));
  const statusEl = $('#saveStatus');
  if(statusEl){
    statusEl.textContent='Saving...';
    statusEl.classList.remove('offline');
  }
  if(authToken && typeof fetch === 'function'){
    fetch(`/api/sessions/${currentSessionId}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify(data)
    }).then(res => {
      if(!res.ok) throw new Error(res.status);
      if(statusEl){ statusEl.textContent='Saved'; statusEl.classList.remove('offline'); }
    }).catch(() => {
      if(statusEl){ statusEl.textContent='Save failed'; statusEl.classList.add('offline'); }
    });
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
    if(data['bodymap_svg']) bodyMap.load(data['bodymap_svg']);
      $('#d_pupil_left_note').style.display = ($$('.chip.active', $('#d_pupil_left_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
      $('#d_pupil_right_note').style.display = ($$('.chip.active', $('#d_pupil_right_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
      $('#e_back_notes').style.display = ($$('.chip.active', $('#e_back_group')).some(c=>c.dataset.value==='Pakitimai'))?'block':'none';
      $('#oxygenFields').style.display = ($('#b_oxygen_liters').value || $('#b_oxygen_type').value) ? 'flex' : 'none';
    $('#dpvFields').style.display = $('#b_dpv_fio2').value ? 'flex' : 'none';
    $('#spr_skyrius_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Stacionarizavimas'))?'block':'none';
    $('#spr_ligonine_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Pervežimas į kitą ligoninę'))?'block':'none';
    $('#spr_skyrius_kita').style.display = ($('#spr_skyrius').value === 'Kita') ? 'block' : 'none';
    $('#imaging_other').style.display = (IMAGING_GROUPS.some(sel=>$$('.chip.active', $(sel)).some(c=>c.dataset.value==='Kita')))?'block':'none';
  };
  const fallback=()=>{
    const raw=localStorage.getItem(sessionKey()); if(!raw) return; try{ apply(JSON.parse(raw)); }catch(e){ console.error(e); }
  };
  if(authToken && typeof fetch === 'function'){
    fetch(`/api/sessions/${currentSessionId}/data`, { headers:{ 'Authorization': 'Bearer ' + authToken }})
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(d=>{ localStorage.setItem(sessionKey(), JSON.stringify(d)); apply(d); })
      .catch(fallback);
  } else {
    fallback();
  }
}

export function getAuthToken(){ return authToken; }

export async function logout(){
  if(authToken && typeof fetch==='function'){
    try{ await fetch('/api/logout',{ method:'POST', headers:{ 'Authorization':'Bearer '+authToken } }); }catch(e){ console.error(e); }
  }
  authToken=null;
  localStorage.removeItem('trauma_token');
  location.reload();
}
