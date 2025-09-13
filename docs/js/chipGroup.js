import { $ } from './utils.js';
import { addChipIndicators } from './chips.js';

/**
 * Create a chip group from given selector and values.
 * @param {string} selector CSS selector for the container element.
 * @param {string[]} values Chip labels/values.
 * @returns {HTMLElement|null} Wrapper element or null if not found.
 */
export function createChipGroup(selector, values){
  const wrap=$(selector);
  if(!wrap) return null;
  values.forEach(val=>{
    const chip=document.createElement('span');
    chip.className='chip';
    chip.dataset.value=val;
    chip.textContent=val;
    addChipIndicators(chip);
    wrap.appendChild(chip);
  });
  return wrap;
}
