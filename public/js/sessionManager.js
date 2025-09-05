import { $ } from './utils.js';
import bodyMap from './bodyMap.js';
import { serializeFields, loadFields, limit } from './formSerialization.js';
import { serializeChips, loadChips, CHIP_GROUPS } from './chipState.js';
import { updateDomToggles } from './domToggles.js';

let authToken = localStorage.getItem('trauma_token') || null;
let currentSessionId = localStorage.getItem('trauma_current_session') || null;
let theme = localStorage.getItem('trauma_theme') || 'light';

export function setTheme(t){
  theme = t === 'light' ? 'light' : 'dark';
  localStorage.setItem('trauma_theme', theme);
  const root=document.documentElement;
  root.classList.remove('light','dark');
  root.classList.add(theme);
  root.style.colorScheme=theme;
  const meta=document.querySelector('meta[name="color-scheme"]');
  if(meta) meta.content=theme==='dark'?'dark light':'light dark';
}

export function initTheme(){
  setTheme(theme);
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

export async function saveAll(){
  if(!currentSessionId) return;
  const data={
    ...serializeFields(),
    ...serializeChips(CHIP_GROUPS)
  };
  function pack(container){ return Array.from(container.children).map(card=>({ name:limit(card.querySelector('.act_custom_name')?card.querySelector('.act_custom_name').value:card.querySelector('.act_name').textContent.trim()), on:card.querySelector('.act_chk').checked, time:limit(card.querySelector('.act_time').value), dose:limit(card.querySelector('.act_dose')?card.querySelector('.act_dose').value:''), note:limit(card.querySelector('.act_note').value) }));}
  data['pain_meds']=pack($('#pain_meds'));
  data['bleeding_meds']=pack($('#bleeding_meds'));
  data['other_meds']=pack($('#other_meds'));
  data['procs']=pack($('#procedures_it')).concat(pack($('#procedures_other')));
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
      if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
        const msg = { type: 'queue-session', id: currentSessionId, data, token: authToken };
        navigator.serviceWorker.ready.then(reg => {
          reg.active?.postMessage(msg);
          reg.sync.register('sync-sessions');
        });
      }
      if(statusEl){ statusEl.textContent='Save failed'; statusEl.classList.add('offline'); }
    }
  } else if(statusEl){
    statusEl.textContent='Saved';
  }
}

export function loadAll(){
  if(!currentSessionId) return;
  const apply=data=>{
    loadFields(data);
    loadChips(data, CHIP_GROUPS);
    loadRecords(data);
    loadBodyMap(data);
    updateDomToggles();
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

function loadRecords(data){
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
  unpack($('#pain_meds'),data['pain_meds']);
  unpack($('#bleeding_meds'),data['bleeding_meds']);
  unpack($('#other_meds'),data['other_meds']);
  const procsArr=Array.isArray(data['procs'])?data['procs']:[];
  const itCount=$('#procedures_it').children.length;
  unpack($('#procedures_it'),procsArr.slice(0,itCount));
  unpack($('#procedures_other'),procsArr.slice(itCount));
}

function loadBodyMap(data){
  bodyMap.load(data['bodymap_svg']||'{}');
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
