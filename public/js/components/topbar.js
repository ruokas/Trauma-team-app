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
  let navOpen=false;
  let trapActive=false;
  function close(){
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded','false');
    nav.setAttribute('aria-hidden','true');
    nav.setAttribute('hidden','');
    if(overlay) overlay.hidden=true;
    document.body.style.overflow='';
    if(trapActive){
      document.removeEventListener('keydown', trap);
      trapActive=false;
    }
    navOpen=false;
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
    const mobile=!navMq || !navMq.matches;
    const wasClosed=!navOpen;
    navOpen=true;
    document.body.classList.toggle('nav-open', mobile);
    toggle.setAttribute('aria-expanded','true');
    nav.removeAttribute('aria-hidden');
    nav.removeAttribute('hidden');
    if(mobile){
      if(overlay) overlay.hidden=false;
      document.body.style.overflow='hidden';
      const items=nav.querySelectorAll(focusableSel);
      if(wasClosed && items.length) items[0].focus();
      if(!trapActive){
        document.addEventListener('keydown', trap);
        trapActive=true;
      }
    }else{
      if(overlay) overlay.hidden=true;
      document.body.style.overflow='';
      if(trapActive){
        document.removeEventListener('keydown', trap);
        trapActive=false;
      }
    }
  }
  toggle.addEventListener('click',()=>{
    navOpen ? close() : open();
  });
  if(overlay){
    overlay.addEventListener('click', close);
  }
  nav.addEventListener('click', () => {
    const mobile=!navMq || !navMq.matches;
    if(mobile){
      close();
    }else{
      setTimeout(()=>{
        if(nav.hasAttribute('hidden')) open();
      });
    }
  });
  navMq=typeof matchMedia==='function' ? matchMedia(`(min-width: ${NAV_BREAKPOINT}px)`) : null;
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
let patientMenuDocListener;
let patientMenuSearchListener;
let patientMenuSearchToggle;

export function initPatientMenuToggle(menu){
  if(patientMenuMq && patientMenuMqListener){
    if(typeof patientMenuMq.removeEventListener==='function'){
      patientMenuMq.removeEventListener('change', patientMenuMqListener);
    }
    patientMenuMqListener=null;
  }
  if(patientMenuDocListener){
    document.removeEventListener('click', patientMenuDocListener);
    patientMenuDocListener=null;
  }
  if(patientMenuSearchToggle && patientMenuSearchListener){
    patientMenuSearchToggle.removeEventListener('click', patientMenuSearchListener);
    patientMenuSearchToggle=null;
    patientMenuSearchListener=null;
  }
  if(!menu) return;
  const search=menu.querySelector('#patientSearch');
  const searchToggle=menu.querySelector('#patientSearchToggle');
  patientMenuMq=typeof matchMedia==='function' ? matchMedia('(min-width: 769px)') : null;
  const update=()=>{ if(patientMenuMq && patientMenuMq.matches) menu.setAttribute('open',''); else menu.removeAttribute('open'); };
  update();
  if(patientMenuMq){
    patientMenuMqListener=update;
    patientMenuMq.addEventListener('change', patientMenuMqListener);
  }
  patientMenuDocListener=e=>{
    if(menu.hasAttribute('open') && (!patientMenuMq || !patientMenuMq.matches) && !menu.contains(e.target)){
      menu.removeAttribute('open');
      search?.classList.add('hidden');
    }
  };
  document.addEventListener('click', patientMenuDocListener);
  patientMenuSearchListener=e=>{
    e.stopPropagation();
    e.preventDefault();
    search?.classList.toggle('hidden');
    menu.setAttribute('open','');
    if(!search?.classList.contains('hidden')){
      requestAnimationFrame(()=>{
        search.focus();
        menu.setAttribute('open','');
      });
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
  const nav=document.querySelector('nav');
  nav?.removeAttribute('hidden');
  const toggle=document.getElementById('navToggle');
  if(toggle && nav) initNavToggle(toggle, nav);
  const patientMenu=document.getElementById('patientMenu');
  initPatientMenuToggle(patientMenu);
}
