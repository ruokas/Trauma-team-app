import { $ , nowHM } from './utils.js';
import { logEvent } from './timeline.js';

export function initArrivalTimer(sessionId){
  const el = $('#arrivalTimer');
  if(!el || !sessionId) return;
  const key = `arrivalTime_${sessionId}`;
  let arrival = parseInt(localStorage.getItem(key),10);
  if(!arrival){
    arrival = Date.now();
    localStorage.setItem(key, arrival.toString());
    logEvent('system', 'Pacientas atvyko', '', nowHM());
  }
  const update = () => {
    const diff = Date.now() - arrival;
    const mins = Math.floor(diff/60000).toString().padStart(2,'0');
    const secs = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
    el.textContent = `${mins}:${secs}`;
  };
  update();
  setInterval(update, 1000);
}
