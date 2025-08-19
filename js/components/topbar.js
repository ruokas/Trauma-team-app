export function initNavToggle(toggle, nav){
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

  initActionsMenu();
}

function initActionsMenu(){
  const container=document.getElementById('mobileActions');
  const toggle=document.getElementById('actionsToggle');
  const menu=document.getElementById('actionsMenu');
  const arrival=document.getElementById('arrivalBar');
  const session=document.getElementById('sessionBar');
  const actionsWrap=document.querySelector('.header-actions');
  if(!container || !toggle || !menu || !arrival || !session || !actionsWrap) return;
  const mq=window.matchMedia('(max-width: 480px)');
  const update=()=>{
    if(mq.matches){
      menu.appendChild(arrival);
      menu.appendChild(session);
      container.hidden=false;
    }else{
      actionsWrap.insertBefore(arrival, container);
      actionsWrap.insertBefore(session, container);
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
