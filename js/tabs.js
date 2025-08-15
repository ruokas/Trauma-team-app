import { $ } from './utils.js';

export const TABS = [
  'Aktyvacija (EMS)','A – Kvėpavimo takai','B – Kvėpavimas','C – Kraujotaka',
  'D – Sąmonė','E – Kita','Intervencijos','Vaizdiniai tyrimai','Laboratorija','Komanda','Ataskaita'
];

export function showTab(name){
  document.querySelectorAll('nav .tab').forEach(b=>b.classList.toggle('active', b.textContent===name));
  document.querySelectorAll('.view').forEach(v=>v.style.display = (v.dataset.tab===name)?'block':'none');
  localStorage.setItem('v9_activeTab', name);
}

export function initTabs(){
  const nav = document.getElementById('tabs');
  TABS.forEach((t,i)=>{
    const b=document.createElement('button');
    b.className='tab'+(i===0?' active':'');
    b.textContent=t;
    b.onclick=()=>showTab(t);
    nav.appendChild(b);
  });
  document.querySelectorAll('.view').forEach((v,i)=>v.style.display=(i===0)?'block':'none');
  const savedTab = localStorage.getItem('v9_activeTab');
  if(savedTab && TABS.includes(savedTab)) showTab(savedTab);
}
