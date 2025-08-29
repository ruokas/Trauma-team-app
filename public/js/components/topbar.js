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
  nav.setAttribute('aria-hidden','true');
  const overlay=document.querySelector('.nav-overlay');
  const focusableSel='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  function close(){
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded','false');
    nav.setAttribute('aria-hidden','true');
    if(overlay) overlay.hidden=true;
    document.body.style.overflow='';
    document.removeEventListener('keydown', trap);
    toggle.focus();
  }
  function trap(e){
    if(e.key==='Tab'){
      const items=nav.querySelectorAll(focusableSel);
      if(!items.length) return;
      const first=items[0];
      const last=items[items.length-1];
      if(e.shiftKey){
        if(document.activeElement===first){ e.preventDefault(); last.focus(); }
      }else{
        if(document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
    }else if(e.key==='Escape'){
      close();
    }
  }
  function open(){
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded','true');
    nav.removeAttribute('aria-hidden');
    if(overlay) overlay.hidden=false;
    document.body.style.overflow='hidden';
    const items=nav.querySelectorAll(focusableSel);
    if(items.length) items[0].focus();
    document.addEventListener('keydown', trap);
  }
  toggle.addEventListener('click',()=>{
    document.body.classList.contains('nav-open') ? close() : open();
  });
  nav.addEventListener('click',e=>{
    if(e.target.closest('.tab')) close();
  });
  navMq=typeof matchMedia==='function' ? matchMedia(`(min-width: ${NAV_BREAKPOINT}px)`) : null;
  if(navMq){
    navMqListener=e=>{ if(e.matches) close(); };
    navMq.addEventListener('change', navMqListener);
    if(navMq.matches) close();
  }
}

export function initPatientMenuToggle(toggle, menu){
  if(!toggle || !menu) return;
  const mq=typeof matchMedia==='function' ? matchMedia(`(min-width: ${NAV_BREAKPOINT}px)`) : null;
  const update=()=>{
    if(mq && mq.matches){
      menu.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded','true');
    }else{
      menu.setAttribute('hidden','');
      toggle.setAttribute('aria-expanded','false');
    }
  };
  toggle.addEventListener('click',()=>{
    const expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    if(expanded) menu.setAttribute('hidden','');
    else menu.removeAttribute('hidden');
  });
  if(mq){ mq.addEventListener('change', update); }
  update();
}

export async function initTopbar(){
  const header=document.getElementById('appHeader');
  if(!header || typeof fetch!=='function') return;
  try{
    const res=await fetch('assets/partials/topbar.html');
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
  const nav=document.querySelector('nav');
  initNavToggle(toggle, nav);
  const patientToggle=document.getElementById('patientMenuToggle');
  const sessionBar=document.getElementById('sessionBar');
  initPatientMenuToggle(patientToggle, sessionBar);
}
