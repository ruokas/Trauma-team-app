import { $, $$ } from './utils.js';
import { notify } from './alerts.js';
import bodyMap from './bodyMap.js';
/* global io */

let authToken = localStorage.getItem('trauma_token') || null;
let socket = null;
const socketEndpoint = window.socketEndpoint || window.SOCKET_URL;
let currentSessionId = localStorage.getItem('trauma_current_session') || null;
let showArchived = false;

const MAX_FIELD_LENGTH = 500;
const limit = (val, max = MAX_FIELD_LENGTH) => (val || '').toString().slice(0, max);

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
  socket.on('connect_error', err => {
    console.error('Socket connection error:', err);
    notify({ type: 'error', message: 'Connection error. Retrying...' });
    setTimeout(() => socket.connect(), 1000);
  });
  socket.on('disconnect', reason => {
    console.warn('Socket disconnected:', reason);
    notify({ type: 'error', message: 'Disconnected from server' });
  });
  socket.on('reconnect', attempt => {
    console.log('Socket reconnected after', attempt, 'attempts');
    notify({ type: 'success', message: 'Reconnected to server' });
  });
  socket.on('sessions', list => {
    const sel = $('#sessionSelect');
    if(sel) populateSessionSelect(sel, list);
  });
  socket.on('sessionData', ({id}) => {
    if(id === currentSessionId) loadAll();
  });
  socket.on('users', list=>updateUserList(list));
}

export function reconnectSocket(){
  if(socket){
    socket.disconnect();
    socket = null;
  }
  connectSocket();
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
        const normalized = data.map(s => ({ ...s, archived: !!s.archived }));
        localStorage.setItem('trauma_sessions', JSON.stringify(normalized));
        return normalized;
      }
    }catch(e){ console.error(e); }
  }
  try{
    return JSON.parse(localStorage.getItem('trauma_sessions')||'[]').map(s=>({ ...s, archived:!!s.archived }));
  }catch(e){ return []; }
}

async function saveSessions(list){
  localStorage.setItem('trauma_sessions', JSON.stringify(list));
  if(authToken && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify(list)
      });
      if(!res.ok) throw new Error(res.status);
    }catch(e){
      console.error(e);
      notify({ type:'error', message:'Failed to save sessions' });
    }
  }
}

function populateSessionSelect(sel, sessions){
  sel.innerHTML='';
  sessions.filter(s=>showArchived || !s.archived).forEach(s=>{
    const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt);
  });
}

export async function initSessions(){
  const select=$('#sessionSelect');
  if(!select) return;
  let sessions=await getSessions();
  let delWrap=$('#sessionDeleteList');
  if(!delWrap){
    delWrap=document.createElement('div');
    delWrap.id='sessionDeleteList';
    select.parentNode.appendChild(delWrap);
  }
  let toggleArchived=$('#toggleArchivedSessions');
  if(!toggleArchived){
    toggleArchived=document.createElement('button');
    toggleArchived.id='toggleArchivedSessions';
    toggleArchived.type='button';
    toggleArchived.className='btn ghost';
    toggleArchived.textContent='Show archived';
    select.parentNode.insertBefore(toggleArchived, delWrap);
  }
  toggleArchived.addEventListener('click', () => {
    showArchived = !showArchived;
    toggleArchived.textContent = showArchived ? 'Hide archived' : 'Show archived';
    if (!showArchived && sessions.some(s => s.id === currentSessionId && s.archived)) {
      currentSessionId = sessions.find(s => !s.archived)?.id || null;
      if (currentSessionId) localStorage.setItem('trauma_current_session', currentSessionId); else localStorage.removeItem('trauma_current_session');
    }
    renderDeleteButtons();
    populateSessionSelect(select, sessions);
    if (currentSessionId) select.value = currentSessionId;
  });
  function renderDeleteButtons(focusId){
    delWrap.innerHTML='';
    sessions.filter(s=>showArchived || !s.archived).forEach(s=>{
      const row=document.createElement('div');
      row.className='session-item';
      row.dataset.sessionId=s.id;
      const label=document.createElement('span');
      label.className='session-label';
      label.textContent=s.name;
      label.tabIndex=0;

      const startRename=()=>{
        const input=document.createElement('input');
        input.type='text';
        input.value=s.name;
        input.className='session-rename-input';
        let cancelled=false;
        const cancel=()=>{ cancelled=true; input.replaceWith(label); label.focus(); };
        const attemptSave=async()=>{
          const newName=input.value.trim();
          if(!newName){
            notify({ type:'error', message:'Pavadinimas negali būti tuščias.' });
            input.focus();
            return;
          }
          if(newName===s.name){ cancel(); return; }
          const newNameLower=newName.toLowerCase();
          if(sessions.some(x=>x.id!==s.id && x.name.trim().toLowerCase()===newNameLower)){
            notify({ type:'error', message:'Pacientas su tokiu pavadinimu jau egzistuoja.' });
            input.focus();
            return;
          }
          s.name=newName;
          await saveSessions(sessions);
          populateSessionSelect(select, sessions);
          if(currentSessionId) select.value=currentSessionId;
          renderDeleteButtons(s.id);
        };
        input.addEventListener('blur', async()=>{ if(!cancelled) await attemptSave(); });
        input.addEventListener('keydown', e=>{
          if(e.key==='Enter'){ e.preventDefault(); input.blur(); }
          else if(e.key==='Escape'){ e.preventDefault(); cancel(); }
        });
        label.replaceWith(input);
        input.focus();
        input.select();
      };

      label.addEventListener('click', startRename);
      label.addEventListener('keydown', e=>{ if(e.key==='Enter') startRename(); });

      const archive=document.createElement('button');
      archive.type='button';
      archive.textContent=s.archived?'Unarchive':'Archive';
      archive.className='btn ghost';
      archive.setAttribute('aria-label', s.archived ? 'Unarchive session' : 'Archive session');
      archive.addEventListener('click', async () => {
        if(authToken && typeof fetch==='function'){
          try{ await fetch(`/api/sessions/${s.id}/${s.archived?'unarchive':'archive'}`, { method:'POST', headers:{ 'Authorization': 'Bearer ' + authToken } }); }catch(e){ console.error(e); }
        }
        s.archived=!s.archived;
        await saveSessions(sessions);
        if(s.archived && currentSessionId===s.id){
          currentSessionId=sessions.find(x=>!x.archived)?.id||null;
          if(currentSessionId) localStorage.setItem('trauma_current_session', currentSessionId); else localStorage.removeItem('trauma_current_session');
        }
        populateSessionSelect(select, sessions);
        if(currentSessionId) select.value=currentSessionId; else select.value='';
        renderDeleteButtons();
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
      row.appendChild(archive);
      row.appendChild(btn);
      delWrap.appendChild(row);
    });
    if(focusId){
      const focusEl=delWrap.querySelector(`.session-item[data-session-id="${focusId}"] .session-label`);
      if(focusEl) focusEl.focus();
    }
  }
  if(!sessions.length){
    const id=Date.now().toString(36);
    sessions=[{id,name:'Pacientas Nr.1', archived:false}];
    await saveSessions(sessions);
    currentSessionId=id;
    localStorage.setItem('trauma_current_session', id);
  }
  if(!currentSessionId || !sessions.some(s=>s.id===currentSessionId)){
    currentSessionId=sessions.find(s=>!s.archived)?.id || sessions[0].id;
    if(currentSessionId) localStorage.setItem('trauma_current_session', currentSessionId);
  }
  populateSessionSelect(select, sessions);
  select.value=currentSessionId;
  renderDeleteButtons();

  $('#btnNewSession').addEventListener('click',async()=>{
    const name=await notify({type:'prompt', message:'Paciento ID'});
    if(!name) return;
    const id=Date.now().toString(36);
    sessions.push({id,name, archived:false});
    await saveSessions(sessions);
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
