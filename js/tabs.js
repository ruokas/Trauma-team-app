import { $ } from './utils.js';

export const TABS = [
  { name: 'Aktyvacija', icon: '🚨' },
  { name: 'A – Kvėpavimo takai' },
  { name: 'B – Kvėpavimas' },
  { name: 'C – Kraujotaka' },
  { name: 'D – Sąmonė' },
  { name: 'E – Kita' },
  { name: 'Intervencijos', icon: '💉' },
  { name: 'Vaizdiniai tyrimai', icon: '☢️' },
  { name: 'Laboratorija', icon: '🧪' },
  { name: 'Komanda', icon: '👥' },
  { name: 'Ataskaita', icon: '📝' },
  { name: 'Sprendimas', icon: '⚖️' }
];

export const TAB_NAMES = TABS.map(t => t.name);

export function showTab(name){
  document.querySelectorAll('nav .tab').forEach(b=>{
    const active = b.dataset.tab === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.view').forEach(v=>v.style.display = (v.dataset.tab===name)?'block':'none');
  localStorage.setItem('v9_activeTab', name);
}

export function initTabs(){
  const nav = document.getElementById('tabs');
  nav.setAttribute('role','tablist');
  TABS.forEach((t,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='tab'+(i===0?' active':'');
    b.dataset.tab = t.name;
    const label = t.name;
    b.innerHTML = t.icon ? `${t.icon} ${label}` : label;
    b.setAttribute('role','tab');
    b.setAttribute('tabindex','0');
    b.setAttribute('aria-selected', i===0 ? 'true' : 'false');
    b.onclick=()=>showTab(t.name);
    nav.appendChild(b);
  });
  document.querySelectorAll('.view').forEach((v,i)=>v.style.display=(i===0)?'block':'none');

  nav.addEventListener('keydown', e=>{
    const tabs = Array.from(nav.querySelectorAll('.tab'));
    const currentIndex = tabs.indexOf(document.activeElement);
    if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
      e.preventDefault();
      let newIndex = currentIndex + (e.key === 'ArrowRight' ? 1 : -1);
      if(newIndex < 0) newIndex = tabs.length - 1;
      if(newIndex >= tabs.length) newIndex = 0;
      tabs[newIndex].focus();
    } else if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      document.activeElement.click();
    }
  });

  const savedTab = localStorage.getItem('v9_activeTab');
  if(savedTab && TAB_NAMES.includes(savedTab)) showTab(savedTab);
}
