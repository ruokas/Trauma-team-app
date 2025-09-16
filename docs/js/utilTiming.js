import { $$ } from './utils.js';

/**
 * Returns a debounced wrapper that waits for a pause before invoking `fn`.
 * @param {Function} fn - Target function to call after the delay.
 * @param {number} delay - Delay in milliseconds before firing `fn`.
 * @returns {Function} Debounced handler.
 */
export function debounce(fn, delay = 0){
  let timeoutId;
  return (...args)=>{
    clearTimeout(timeoutId);
    timeoutId=setTimeout(()=>fn(...args), delay);
  };
}

/**
 * Clamp numeric input values according to their min/max/step attributes.
 * Call again if dynamic inputs are added to the DOM.
 */
export function clampNumberInputs(){
  const clamp = el => {
    if(el.value==='') return;
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    const step=parseFloat(el.getAttribute('step')) || 1;
    let val=parseFloat(el.value);
    if(Number.isNaN(val)) return;
    if(min!==null && val<parseFloat(min)) val=parseFloat(min);
    if(max!==null && val>parseFloat(max)) val=parseFloat(max);
    val=Math.round(val/step)*step;
    const decimals=(step.toString().split('.')[1]||'').length;
    el.value=val.toFixed(decimals);
  };

  $$('input[type="number"]').forEach(el=>{
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    if(min!==null || max!==null){
      ['input','change'].forEach(evt=>el.addEventListener(evt,()=>clamp(el)));
      clamp(el);
    }
  });
}
