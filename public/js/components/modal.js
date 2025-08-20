import { register } from '../alerts.js';

function promptHandler({ message, defaultValue = '' }) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const p = document.createElement('p');
    p.id = 'modalMsg';
    p.textContent = message;
    box.setAttribute('aria-labelledby', p.id);
    box.appendChild(p);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    box.appendChild(input);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnOk = document.createElement('button');
    btnOk.textContent = 'OK';
    btnOk.className = 'btn primary';
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    btnCancel.className = 'btn';
    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const focusable = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function trap(e){
      if(e.key === 'Tab'){
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      } else if(e.key === 'Escape'){ e.preventDefault(); close(null); }
    }
    function close(val){
      overlay.remove();
      document.removeEventListener('keydown', trap, true);
      prev?.focus();
      resolve(val);
    }
    btnOk.addEventListener('click',()=>close(input.value.trim()||null));
    btnCancel.addEventListener('click',()=>close(null));
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(null); });
    document.addEventListener('keydown', trap, true);
    input.addEventListener('keydown',e=>{ if(e.key==='Enter') btnOk.click(); });
    first.focus();
  });
}

function confirmHandler({ message }){
  return new Promise(resolve => {
    const prev = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const p = document.createElement('p');
    p.id = 'modalMsg';
    p.textContent = message;
    box.setAttribute('aria-labelledby', p.id);
    box.appendChild(p);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnOk = document.createElement('button');
    btnOk.textContent = 'OK';
    btnOk.className = 'btn primary';
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    btnCancel.className = 'btn';
    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const focusable = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function trap(e){
      if(e.key==='Tab'){
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }else if(e.key==='Escape'){e.preventDefault();close(false);}
    }
    function close(val){
      overlay.remove();
      document.removeEventListener('keydown',trap,true);
      prev?.focus();
      resolve(val);
    }
    btnOk.addEventListener('click',()=>close(true));
    btnCancel.addEventListener('click',()=>close(false));
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(false); });
    document.addEventListener('keydown',trap,true);
    first.focus();
  });
}

register('prompt', promptHandler);
register('confirm', confirmHandler);
