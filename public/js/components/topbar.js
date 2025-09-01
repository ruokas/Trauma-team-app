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
  const overlay=document.querySelector('.nav-overlay');
  const focusableSel='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let focusToggle=false;
  function close(){
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded','false');
    nav.setAttribute('aria-hidden','true');
    nav.setAttribute('hidden','');
    if(overlay) overlay.hidden=true;
    document.body.style.overflow='';
    document.removeEventListener('keydown', trap);
    if(focusToggle){
      toggle.focus();
      focusToggle=false;
    }
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
      focusToggle=true;
      close();
    }
  }
  function open(){
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded','true');
    nav.removeAttribute('aria-hidden');
    nav.removeAttribute('hidden');
    if(!navMq || navMq.matches){
      if(overlay) overlay.hidden=false;
      document.body.style.overflow='hidden';
    }
    const items=nav.querySelectorAll(focusableSel);
    if(items.length) items[0].focus();
    document.addEventListener('keydown', trap);
  }
  toggle.addEventListener('click',()=>{
    if(document.body.classList.contains('nav-open')){
      focusToggle=true;
      close();
    }else{
      open();
    }
  });
  if(overlay){
    overlay.addEventListener('click', ()=>{ focusToggle=true; close(); });
  }
  nav.addEventListener('click',e=>{
    if(e.target.closest('.tab')){ focusToggle=true; close(); }
  });
  navMq=typeof matchMedia==='function' ? matchMedia(`(max-width: ${NAV_BREAKPOINT - 1}px)`) : null;
  if(navMq){
    navMqListener=e=>{ e.matches ? close() : open(); };
    navMq.addEventListener('change', navMqListener);
    navMq.matches ? close() : open();
  }else{
    close();
  }
}

export function initPatientMenuToggle(toggle, menu){
  if(!toggle || !menu) return;
  const overlay=document.querySelector('.patient-menu-overlay');
  const focusableSel='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const mq=typeof matchMedia==='function' ? matchMedia(`(min-width: ${NAV_BREAKPOINT}px)`) : null;
  let focusToggle=false;
  function close(){
    document.body.classList.remove('patient-menu-open');
    toggle.setAttribute('aria-expanded','false');
    menu.setAttribute('hidden','');
    menu.setAttribute('aria-hidden','true');
    if(overlay) overlay.hidden=true;
    document.body.style.overflow='';
    document.removeEventListener('keydown', trap);
    if(focusToggle){
      toggle.focus();
      focusToggle=false;
    }
  }
  function trap(e){
    if(e.key==='Tab'){
      const items=menu.querySelectorAll(focusableSel);
      if(!items.length) return;
      const first=items[0];
      const last=items[items.length-1];
      if(e.shiftKey){
        if(document.activeElement===first){ e.preventDefault(); last.focus(); }
      }else{
        if(document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
    }else if(e.key==='Escape'){
      focusToggle=true;
      close();
    }
  }
  function open(){
    document.body.classList.add('patient-menu-open');
    toggle.setAttribute('aria-expanded','true');
    menu.removeAttribute('hidden');
    menu.removeAttribute('aria-hidden');
    if(overlay) overlay.hidden=false;
    document.body.style.overflow='hidden';
    const items=menu.querySelectorAll(focusableSel);
    if(items.length) items[0].focus();
    document.addEventListener('keydown', trap);
  }
  toggle.addEventListener('click',()=>{
    if(document.body.classList.contains('patient-menu-open')){
      focusToggle=true;
      close();
    }else{
      open();
    }
  });
  if(overlay){ overlay.addEventListener('click', ()=>{ focusToggle=true; close(); }); }
  const update=()=>{ if(mq && mq.matches) open(); else close(); };
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
