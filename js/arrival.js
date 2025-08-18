import { $ } from './utils.js';

let arrivalTime = null;

export function recordArrivalTime(){
  const stored = localStorage.getItem('arrival_time');
  if(stored){
    arrivalTime = new Date(stored);
  }else{
    arrivalTime = new Date();
    localStorage.setItem('arrival_time', arrivalTime.toISOString());
  }
  return arrivalTime;
}

function formatElapsed(ms){
  const pad = n => String(n).padStart(2,'0');
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function startArrivalTimer(){
  const el = $('#arrivalTimer');
  if(!el) return;
  recordArrivalTime();
  const update = () => {
    if(!arrivalTime) return;
    const diff = Date.now() - arrivalTime.getTime();
    el.textContent = formatElapsed(diff);
  };
  update();
  setInterval(update, 1000);
}
