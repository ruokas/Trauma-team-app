import { $ } from './utils.js';
import { notify } from './alerts.js';
import { getSessions, saveSessions } from './sessionApi.js';
import { saveAll, setCurrentSessionId, getCurrentSessionId, getAuthToken } from './sessionManager.js';

let showArchived = false;

export function updateUserList(users){
  const el = document.getElementById('userList');
  if(el) el.textContent = users.length ? `Prisijungę: ${users.join(', ')}` : '';
}

export function populateSessionSelect(sel, sessions, { query = '' } = {}){
  sel.innerHTML='';
  const q=query.trim().toLowerCase();
  const list=sessions
    .filter(s=>(showArchived || !s.archived) && (!q || s.name.toLowerCase().includes(q)))
    .slice()
    .sort((a,b)=>(a.created||0)-(b.created||0));
  list.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt); });
  return list;
}

export async function initSessions(){
  const select=$('#sessionSelect');
  if(!select) return;
  const searchInput=$('#patientSearch');
  let sessions=await getSessions();
  let currentSessionId=getCurrentSessionId();
  const patientLabel=$('#patientMenuLabel');
  const deleteBtn=$('#deletePatientBtn');
  const saveBtn=$('#saveBtn');
  const render=()=>{
    const filtered=populateSessionSelect(select, sessions, { query: searchInput?.value || '' });
    if(currentSessionId && filtered.some(s=>s.id===currentSessionId)){
      select.value=currentSessionId;
    }else{
      currentSessionId=filtered[0]?.id||null;
      setCurrentSessionId(currentSessionId);
      if(currentSessionId) select.value=currentSessionId; else select.value='';
    }
    if(patientLabel){
      const current=filtered.find(s=>s.id===currentSessionId);
      patientLabel.textContent=current ? current.name : 'Pacientas';
    }
  };
  searchInput?.addEventListener('input', ()=>render());
  if(!sessions.length){
    const id=Date.now().toString(36);
    sessions=[{id,name:'Pacientas Nr.1', archived:false, created:Date.now()}];
    await saveSessions(sessions);
    currentSessionId=id;
    setCurrentSessionId(id);
  }
  if(!currentSessionId || !sessions.some(s=>s.id===currentSessionId)){
    currentSessionId=sessions.find(s=>!s.archived)?.id || sessions[0].id;
    setCurrentSessionId(currentSessionId);
  }
  render();

  deleteBtn?.addEventListener('click', async () => {
    const id=getCurrentSessionId();
    if(!id) return;
    const session=sessions.find(s=>s.id===id);
    if(!session) return;
    if(!await notify({type:'confirm', message:'Ar tikrai norite ištrinti pacientą?'})) return;
    const token=getAuthToken();
    if(token && typeof fetch==='function'){
      try{ await fetch(`/api/sessions/${id}`, { method:'DELETE', headers:{ 'Authorization':'Bearer '+token } }); }catch(e){ console.error(e); }
    }
    sessions=sessions.filter(s=>s.id!==id);
    await saveSessions(sessions);
    localStorage.removeItem('trauma_v10_'+id);
    render();
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
  });

  saveBtn?.addEventListener('click', () => {
    try{
      saveAll();
      notify({ type:'success', message:'Išsaugota.' });
    }catch(e){
      console.error(e);
      notify({ type:'error', message:'Nepavyko išsaugoti.' });
    }
  });

  $('#btnNewSession').addEventListener('click',async()=>{
    const name=await notify({type:'prompt', message:'Paciento ID'});
    if(!name) return;
    const id=Date.now().toString(36);
    sessions.push({id,name, archived:false, created:Date.now()});
    await saveSessions(sessions);
    currentSessionId=id;
    setCurrentSessionId(id);
    render();
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
  });
  select.addEventListener('change',()=>{
    const id=select.value;
    saveAll();
    currentSessionId=id;
    setCurrentSessionId(id);
    localStorage.setItem('v10_activeTab','Aktyvacija');
    location.reload();
  });
}

