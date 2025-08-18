export function initNavToggle(toggle, nav){
  if(!toggle || !nav) return;
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded','false');
  nav.setAttribute('aria-hidden','true');
  const focusableSel='a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  function close(){
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded','false');
    nav.setAttribute('aria-hidden','true');
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
  const setHeight=()=>{
    const h=header.offsetHeight+'px';
    header.style.setProperty('--header-height', h);
    document.documentElement.style.setProperty('--header-height', h);
  };
  setHeight();
  window.addEventListener('resize', setHeight);
  const toggle=document.getElementById('navToggle');
  const nav=document.querySelector('nav');
  initNavToggle(toggle, nav);
}
