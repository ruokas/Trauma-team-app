const fieldConfig={
  patient_age:{min:0,max:120,msg:'Amžius 0-120',required:true},
  gmp_hr:{min:0,max:300,msg:'ŠSD 0-300'},
  gmp_rr:{min:0,max:100,msg:'KD 0-100'},
  gmp_spo2:{min:0,max:100,msg:'SpO₂ 0-100'},
  gmp_sbp:{min:0,max:300,msg:'AKS 0-300'},
  gmp_dbp:{min:0,max:200,msg:'AKS 0-200'},
  spr_hr:{min:0,max:300,msg:'ŠSD 0-300'},
  spr_rr:{min:0,max:100,msg:'KD 0-100'},
  spr_spo2:{min:0,max:100,msg:'SpO₂ 0-100'},
  spr_sbp:{min:0,max:300,msg:'AKS 0-300'},
  spr_dbp:{min:0,max:200,msg:'AKS 0-200'}
};

function showError(el,cfg){
  let err=document.getElementById(el.id+'_error');
  const hintId=el.dataset.hint||'';
  if(!err){
    err=document.createElement('div');
    err.id=el.id+'_error';
    err.className='error-msg';
    el.parentElement.appendChild(err);
  }
  err.textContent=cfg.msg;
  el.classList.add('invalid');
  el.setAttribute('aria-invalid','true');
  el.setAttribute('aria-describedby',(hintId+' '+err.id).trim());
}

function clearError(el){
  let err=document.getElementById(el.id+'_error');
  const hintId=el.dataset.hint||'';
  if(err) err.remove();
  el.classList.remove('invalid');
  el.removeAttribute('aria-invalid');
  if(hintId) el.setAttribute('aria-describedby',hintId); else el.removeAttribute('aria-describedby');
}

export function validateField(el){
  const cfg=fieldConfig[el.id];
  if(!cfg) return true;
  const val=el.value;
  const num=Number(val);
  const valid = cfg.required? (val!=='' && !isNaN(num) && num>=cfg.min && num<=cfg.max)
                            : (val==='' || (!isNaN(num) && num>=cfg.min && num<=cfg.max));
  if(!el.dataset.hint && el.getAttribute('aria-describedby')) el.dataset.hint=el.getAttribute('aria-describedby');
  if(!valid) showError(el,cfg); else clearError(el);
  return valid;
}

export function validateAll(){
  return Object.keys(fieldConfig).map(id=>{
    const el=document.getElementById(id);
    return el?validateField(el):true;
  }).every(Boolean);
}

export function initValidation(){
  Object.keys(fieldConfig).forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(!el.dataset.hint && el.getAttribute('aria-describedby')) el.dataset.hint=el.getAttribute('aria-describedby');
    const handler=()=>validateField(el);
    el.addEventListener('input',handler);
    el.addEventListener('change',handler);
  });
}

export default {initValidation, validateAll, validateField};
