export const TABS = [
  { name: 'Aktyvacija', icon: 'alarm' },
  { name: 'A – Kvėpavimo takai' },
  { name: 'B – Kvėpavimas' },
  { name: 'C – Kraujotaka' },
  { name: 'D – Sąmonė' },
  { name: 'E – Kita' },
  { name: 'Intervencijos', icon: 'syringe' },
  { name: 'Vaizdiniai tyrimai', icon: 'radiation' },
  { name: 'Laboratorija', icon: 'lab' },
  { name: 'Komanda', icon: 'team' },
  { name: 'Sprendimas', icon: 'scale' },
  { name: 'Santrauka', icon: 'note' }
];

export const TAB_NAMES = TABS.map(t => t.name);

export function showTab(name){
  document.querySelectorAll('nav .tab').forEach(b=>{
    const active = b.dataset.tab === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.view').forEach(v=>{
    const visible = v.dataset.tab === name;
    v.classList.toggle('visible', visible);
    v.classList.toggle('hidden', !visible);
  });
  localStorage.setItem('v10_activeTab', name);
  document.dispatchEvent(new CustomEvent('tabShown',{detail:name}));
}

export function initTabs(){
  const nav = document.getElementById('tabs');
  nav.setAttribute('role','tablist');
  const iconCache = {};
  TABS.forEach((t,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='tab'+(i===0?' active':'');
    b.dataset.tab = t.name;
    const label = t.name;
    b.innerHTML = '<span class="tab-icon"></span><span class="tab-label">'+label+'</span>';
    if(t.icon && typeof fetch === 'function'){
      if(!iconCache[t.icon]){
        iconCache[t.icon] = fetch(`assets/icons/${t.icon}.svg`).then(r=>r.text()).catch(()=> '');
      }
      iconCache[t.icon].then(svg=>{
        const span = b.querySelector('.tab-icon');
        if(span && svg) span.innerHTML = svg;
      });
    }
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
  document.querySelectorAll('.view').forEach((v, i) => {
    if (i === 0) {
      v.classList.add('visible');
      v.classList.remove('hidden');
    } else {
      v.classList.add('hidden');
      v.classList.remove('visible');
    }
  });

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

  const savedTab = localStorage.getItem('v10_activeTab');
  if(savedTab && TAB_NAMES.includes(savedTab)) showTab(savedTab);
}
