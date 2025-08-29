import { notify } from './alerts.js';
import { getAuthToken } from './sessionManager.js';
/* global io */

let socket = null;
const socketEndpoint = window.socketEndpoint || window.SOCKET_URL;
const INITIAL_DELAY = 1000;
const MAX_DELAY = 16000;
let reconnectDelay = INITIAL_DELAY;
function resetDelay(){ reconnectDelay = INITIAL_DELAY; }

export async function fetchUsers(){
  const token = getAuthToken();
  if(token && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/users',{ headers:{ 'Authorization':'Bearer '+token } });
      if(res.ok){
        return await res.json();
      }
    }catch(e){ console.error(e); }
  }
  return [];
}

export async function getSessions(){
  const token = getAuthToken();
  if(token && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/sessions',{ headers:{ 'Authorization':'Bearer '+token } });
      if(res.ok){
        const data = await res.json();
        const normalized = data.map(s=>({ ...s, archived:!!s.archived }));
        localStorage.setItem('trauma_sessions', JSON.stringify(normalized));
        return normalized;
      }
    }catch(e){ console.error(e); }
  }
  try{
    return JSON.parse(localStorage.getItem('trauma_sessions')||'[]').map(s=>({ ...s, archived:!!s.archived }));
  }catch(e){ return []; }
}

export async function saveSessions(list){
  localStorage.setItem('trauma_sessions', JSON.stringify(list));
  const token = getAuthToken();
  if(token && typeof fetch === 'function'){
    try{
      const res = await fetch('/api/sessions', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
        body: JSON.stringify(list)
      });
      if(!res.ok) throw new Error(res.status);
    }catch(e){
      console.error(e);
      notify({ type:'error', message:'Failed to save sessions' });
    }
  }
}

export function connectSocket({ onSessions, onSessionData, onUsers }={}){
  const token = getAuthToken();
  if(typeof io === 'undefined' || socket || !token) return;
  socket = io(socketEndpoint || undefined,{ auth:{ token:'Bearer '+token } });
  socket.on('connect', resetDelay);
  socket.on('connect_error', err => {
    console.error('Socket connection error:', err);
    notify({ type:'error', message:'Connection error. Retrying...' });
    setTimeout(() => socket.connect(), reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
  });
  socket.on('disconnect', reason => {
    console.warn('Socket disconnected:', reason);
    notify({ type:'error', message:'Disconnected from server' });
  });
  socket.on('reconnect', attempt => {
    console.log('Socket reconnected after', attempt, 'attempts');
    notify({ type:'success', message:'Reconnected to server' });
    resetDelay();
  });
  if(onSessions) socket.on('sessions', onSessions);
  if(onSessionData) socket.on('sessionData', onSessionData);
  if(onUsers) socket.on('users', onUsers);
}

export function reconnectSocket(callbacks){
  if(socket){
    socket.disconnect();
    socket = null;
  }
  connectSocket(callbacks);
}

