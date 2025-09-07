import { notify } from '../alerts.js';

const NAV_BREAKPOINT = 768;
let navMq;
let navMqListener;

export function initNavToggle(toggle, nav){
  if(navMq && navMqListener){
    navMq.removeEventListener('change', navMqListener);
  }
  if(!toggle || !nav) return;
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded','false');
  const focusableSel='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const close=()=>{
    if(typeof nav.close==='function') nav.close(); else nav.removeAttribute('open');
    toggle.setAttribute('aria-expanded','false');
    if(!navMq || !navMq.matches) toggle.focus();
  };
  const open=()=>{
    const mobile=!navMq || !navMq.matches;
    if(mobile){
      if(typeof nav.showModal==='function'){ nav.showModal(); } else { nav.setAttribute('open',''); }
      nav.querySelector(focusableSel)?.focus();
    }else{
      if(typeof nav.show==='function'){ nav.show(); } else { nav.setAttribute('open',''); }
    }
    toggle.setAttribute('aria-expanded','true');
  };
  toggle.addEventListener('click',()=>{
    nav.hasAttribute('open') ? close() : open();
  });
  nav.addEventListener('close',()=>{
    toggle.setAttribute('aria-expanded','false');
    if(!navMq || !navMq.matches) toggle.focus();
  });
  nav.addEventListener('click',e=>{
    if(e.target===nav) return close();
    const mobile=!navMq || !navMq.matches;
    if(mobile && e.target.closest('a')) close();
  });
  if(!('showModal' in nav)){
    nav.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
  }
  navMq=typeof matchMedia==='function'?matchMedia(`(min-width: ${NAV_BREAKPOINT}px)`):null;
  if(navMq){
    navMqListener=e=>{ e.matches ? open() : close(); };
    navMq.addEventListener('change', navMqListener);
    navMq.matches ? open() : close();
  }else{
    close();
  }
}

let patientMenuMq;
let patientMenuMqListener;
let patientMenuSearchListener;
let patientMenuSearchToggle;

export function initPatientMenuToggle(menu){
  if(patientMenuMq && patientMenuMqListener){
    if(typeof patientMenuMq.removeEventListener==='function'){
      patientMenuMq.removeEventListener('change', patientMenuMqListener);
    }
    patientMenuMqListener=null;
  }
  if(patientMenuSearchToggle && patientMenuSearchListener){
    patientMenuSearchToggle.removeEventListener('click', patientMenuSearchListener);
    patientMenuSearchToggle=null;
    patientMenuSearchListener=null;
  }
  if(!menu) return;
  const toggle=document.getElementById('patientMenuToggle');
  const search=menu.querySelector('#patientSearch');
  const searchToggle=document.getElementById('patientSearchToggle');
  patientMenuMq=typeof matchMedia==='function'?matchMedia('(min-width: 769px)'):null;
  const update=()=>{
    if(patientMenuMq && patientMenuMq.matches){
      if(typeof menu.show==='function') menu.show(); else menu.setAttribute('open','');
    }else{
      if(typeof menu.close==='function') menu.close(); else menu.removeAttribute('open');
    }
  };
  update();
  if(patientMenuMq){
    patientMenuMqListener=update;
    patientMenuMq.addEventListener('change', patientMenuMqListener);
  }
  toggle?.addEventListener('click',()=>{
    menu.hasAttribute('open') ? (menu.close?menu.close():menu.removeAttribute('open')) : (menu.showModal?menu.showModal():menu.setAttribute('open',''));
  });
  menu.addEventListener('click',e=>{ if(e.target===menu) (menu.close?menu.close():menu.removeAttribute('open')); });
  menu.addEventListener('close',()=>{ search?.classList.add('hidden'); });
  patientMenuSearchListener=e=>{
    e.stopPropagation();
    e.preventDefault();
    search?.classList.toggle('hidden');
    if(!search?.classList.contains('hidden')){
      requestAnimationFrame(()=>{ search.focus(); });
    }else if(search){
      search.value='';
    }
  };
  if(searchToggle){
    searchToggle.addEventListener('click', patientMenuSearchListener);
    patientMenuSearchToggle=searchToggle;
  }
}

export async function initTopbar(){
  const header=document.getElementById('appHeader');
  if(!header || typeof fetch!=='function') return;
  try{
    const res=await fetch(new URL('assets/partials/topbar.html', document.baseURI).href);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    header.innerHTML=await res.text();
  }catch(e){
    console.error('Failed to load topbar', e);
    notify({type:'error', message:'Failed to load topbar'});
    header.innerHTML='<div class="wrap"><button type="button" class="btn" id="retryTopbar">Retry</button></div>';
    header.querySelector('#retryTopbar')?.addEventListener('click', initTopbar);
  }
  if(typeof ResizeObserver==='function'){
    const updateHeight=entries=>{
      for(const entry of entries){
        document.documentElement.style.setProperty('--header-height', entry.contentRect.height+'px');
      }
    };
    const ro=new ResizeObserver(updateHeight);
    ro.observe(header);
  }
  const toggle=document.getElementById('navToggle');
  const nav=document.getElementById('navDialog');
  initNavToggle(toggle, nav);
  const patientMenu=document.getElementById('patientMenu');
  initPatientMenuToggle(patientMenu);
}
