import { $ } from './utils.js';
import { notify } from './alerts.js';
import { getSessions, saveSessions } from './sessionApi.js';
import { saveAll, setCurrentSessionId, getCurrentSessionId, getAuthToken } from './sessionManager.js';

let showArchived = false;

export function updateUserList(users){
  const el = document.getElementById('userList');
  if(el) el.textContent = users.length ? `Prisijungę: ${users.join(', ')}` : '';
}

export function populateSessionSelect(sel, sessions, { query = '', sortBy = 'created' } = {}){
  sel.innerHTML='';
  const q=query.trim().toLowerCase();
  let list=sessions.filter(s=>(showArchived || !s.archived) && (!q || s.name.toLowerCase().includes(q)));
  list=list.slice();
  if(sortBy==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else list.sort((a,b)=>(a.created||0)-(b.created||0));
  list.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt); });
  return list;
}

export async function initSessions(){
  const select=$('#sessionSelect');
  if(!select) return;
  const searchInput=$('#sessionSearch');
  const sortSelect=$('#sessionSort');
  let sessions=await getSessions();
  let currentSessionId=getCurrentSessionId();
  let modal=$('#sessionManagerModal');
  let modalContent;
  if(!modal){
    modal=document.createElement('div');
    modal.id='sessionManagerModal';
    modal.className='modal';
    modalContent=document.createElement('div');
    modalContent.className='modal-content';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }else{
    modalContent=modal.querySelector('.modal-content');
  }
  let delWrap=$('#sessionDeleteList');
  if(!delWrap){
    delWrap=document.createElement('div');
    delWrap.id='sessionDeleteList';
    modalContent.appendChild(delWrap);
  }
  let toggleArchived=$('#toggleArchivedSessions');
  if(!toggleArchived){
    toggleArchived=document.createElement('button');
    toggleArchived.id='toggleArchivedSessions';
    toggleArchived.type='button';
    toggleArchived.className='btn ghost';
    toggleArchived.textContent='Show archived';
    modalContent.insertBefore(toggleArchived, delWrap);
  }
  let manageBtn=$('#btnManageSessions');
  if(!manageBtn){
    manageBtn=document.createElement('button');
    manageBtn.type='button';
    manageBtn.id='btnManageSessions';
    manageBtn.className='btn';
    manageBtn.textContent='Manage patients';
    const btnNew=$('#btnNewSession');
    btnNew.parentNode.insertBefore(manageBtn, btnNew.nextSibling);
  }
  manageBtn.addEventListener('click',()=>{
    modal.classList.toggle('open');
  });
  function renderDeleteButtons(focusId){
    delWrap.innerHTML='';
    const q=(searchInput?.value||'').trim().toLowerCase();
    sessions.filter(s=>(showArchived || !s.archived) && (!q || s.name.toLowerCase().includes(q))).forEach(s=>{
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
          render(s.id);
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
      archive.className='btn ghost';
      archive.innerHTML='<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>';
      archive.setAttribute('aria-label', s.archived ? 'Išarchyvuoti' : 'Archyvuoti');
      archive.title = s.archived ? 'Išarchyvuoti' : 'Archyvuoti';
      archive.addEventListener('click', async () => {
        const token=getAuthToken();
        if(token && typeof fetch==='function'){
          try{
            await fetch(`/api/sessions/${s.id}/archive`, {
              method: 'PATCH',
              headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ archived: !s.archived })
            });
          }catch(e){ console.error(e); }
        }
        s.archived=!s.archived;
        await saveSessions(sessions);
        if(s.archived && currentSessionId===s.id){
          currentSessionId=sessions.find(x=>!x.archived)?.id||null;
          setCurrentSessionId(currentSessionId);
        }
        render();
      });
      const btn=document.createElement('button');
      btn.type='button';
      btn.textContent='✖';
      btn.className='btn ghost';
      btn.setAttribute('aria-label','Delete session');
      btn.addEventListener('click',async()=>{
        if(!await notify({type:'confirm', message:'Ar tikrai norite ištrinti pacientą?'})) return;
        const token=getAuthToken();
        if(token && typeof fetch==='function'){
          try{ await fetch(`/api/sessions/${s.id}`, { method:'DELETE', headers:{ 'Authorization': 'Bearer ' + token } }); }catch(e){ console.error(e); }
        }
        const wasCurrent=currentSessionId===s.id;
        sessions=sessions.filter(x=>x.id!==s.id);
        localStorage.removeItem('trauma_v10_'+s.id);
        localStorage.setItem('trauma_sessions', JSON.stringify(sessions));
        render();
        if(wasCurrent){
          localStorage.setItem('v10_activeTab','Aktyvacija');
          location.reload();
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
  const render=(focusId)=>{
      const filtered=populateSessionSelect(select, sessions, { query: searchInput?.value || '', sortBy: sortSelect?.value || 'created' });
      if(currentSessionId && filtered.some(s=>s.id===currentSessionId)){
        select.value=currentSessionId;
      }else{
        currentSessionId=filtered[0]?.id||null;
        setCurrentSessionId(currentSessionId);
        if(currentSessionId) select.value=currentSessionId; else select.value='';
      }
      renderDeleteButtons(focusId);
    };
    toggleArchived.addEventListener('click', () => {
      showArchived = !showArchived;
      toggleArchived.textContent = showArchived ? 'Hide archived' : 'Show archived';
      if (!showArchived && sessions.some(s => s.id === currentSessionId && s.archived)) {
        currentSessionId = sessions.find(s => !s.archived)?.id || null;
        setCurrentSessionId(currentSessionId);
      }
      render();
    });
    searchInput?.addEventListener('input', ()=>render());
    sortSelect?.addEventListener('change', ()=>render());
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

