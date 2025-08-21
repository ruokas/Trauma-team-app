export const TABS = [
  { name: 'Aktyvacija', icon: '🚨', path: '/' },
  { name: 'A – Kvėpavimo takai', path: '/airway' },
  { name: 'B – Kvėpavimas', path: '/breathing' },
  { name: 'C – Kraujotaka', path: '/circulation' },
  { name: 'D – Sąmonė', path: '/consciousness' },
  { name: 'E – Kita', path: '/other' },
  { name: 'Intervencijos', icon: '💉', path: '/interventions' },
  { name: 'Vaizdiniai tyrimai', icon: '☢️', path: '/imaging' },
  { name: 'Laboratorija', icon: '🧪', path: '/labs' },
  { name: 'Komanda', icon: '👥', path: '/team' },
  { name: 'Sprendimas', icon: '⚖️', path: '/decision' },
  { name: 'Laiko juosta', icon: '🕒', path: '/timeline' },
  { name: 'Ataskaita', icon: '📝', path: '/report' }
];

export const TAB_NAMES = TABS.map(t => t.name);

export function showTab(name){
  document.querySelectorAll('nav .tab').forEach(b=>{
    const active = b.dataset.tab === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.view').forEach(v=>v.style.display = (v.dataset.tab===name)?'block':'none');
  localStorage.setItem('v10_activeTab', name);
  const tab=TABS.find(t=>t.name===name);
  if(tab&&tab.path){
    history.replaceState(null,'',tab.path);
  }
  document.dispatchEvent(new CustomEvent('tabShown',{detail:name}));
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
    b.innerHTML = `<span class="tab-icon">${t.icon ? t.icon : ''}</span><span class="tab-label">${label}</span>`;
    b.setAttribute('role','tab');
    b.setAttribute('tabindex','0');
    b.setAttribute('aria-selected', i===0 ? 'true' : 'false');
    const view = document.querySelector(`.view[data-tab="${t.name}"]`);
    const viewId = view?.id || `view-${i}`;
    b.id = `tab-${viewId.replace(/^view-/, '')}`;
    b.setAttribute('aria-controls', viewId);
    if(view){
      if(!view.id) view.id = viewId;
      view.setAttribute('aria-labelledby', b.id);
      view.setAttribute('role','tabpanel');
    }
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

  const pathSeg=window.location.pathname.split('/').filter(Boolean).pop()||'';
  const pathTab=TABS.find(t=>t.path.replace(/^\//,'')===pathSeg);
  const savedTab = localStorage.getItem('v10_activeTab');
  if(pathTab) showTab(pathTab.name);
  else if(savedTab && TAB_NAMES.includes(savedTab)) showTab(savedTab);
}
