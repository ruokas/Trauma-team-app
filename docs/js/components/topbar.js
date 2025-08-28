import { ACTIONS_LABEL } from '../constants.js';

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

export async function initTopbar(){
  const header=document.getElementById('appHeader');
  if(!header || typeof fetch!=='function') return;
  try{
    const res=await fetch('assets/partials/topbar.html');
    if(res.ok){
      header.innerHTML=await res.text();
    }
  }catch(e){
    console.error('Failed to load topbar', e);
  }
  applyTopbarLocalization(header);
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

  initActionsMenu();
}

function applyTopbarLocalization(root){
  const actionsToggle=root?.querySelector('#actionsToggle');
  if(actionsToggle) actionsToggle.textContent=ACTIONS_LABEL;
}

function initActionsMenu(){
  const container=document.getElementById('mobileActions');
  const toggle=document.getElementById('actionsToggle');
  const menu=document.getElementById('actionsMenu');
  const mobileBars=document.getElementById('mobileBars');
  const arrival=document.getElementById('arrivalBar');
  const session=document.getElementById('sessionBar');
  const centerWrap=document.querySelector('.header-center');
  if(!container || !toggle || !menu || !mobileBars || !arrival || !session || !centerWrap) return;
  const mq=window.matchMedia(`(max-width: ${NAV_BREAKPOINT}px)`);
  const update=()=>{
    if(mq.matches){
      mobileBars.append(arrival, session);
      container.hidden=false;
    }else{
      centerWrap.append(arrival, session);
      container.hidden=true;
      menu.hidden=true;
      toggle.setAttribute('aria-expanded','false');
    }
  };
  mq.addEventListener('change', update);
  update();
  toggle.addEventListener('click', ()=>{
    const expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.hidden=expanded;
  });
  document.addEventListener('click', e=>{
    if(!container.contains(e.target)){
      menu.hidden=true;
      toggle.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      menu.hidden=true;
      toggle.setAttribute('aria-expanded','false');
      toggle.focus();
    }
  });
}
