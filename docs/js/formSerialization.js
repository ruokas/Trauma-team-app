import { $$ } from './utils.js';

export const FIELD_SELECTORS = 'input[type="text"],input[type="number"],input[type="time"],input[type="date"],input[type="radio"],input[type="checkbox"],textarea,select';
export const MAX_FIELD_LENGTH = 500;
export const limit = (val, max = MAX_FIELD_LENGTH) => (val || '').toString().slice(0, max);

export function serializeFields(){
  const data = {};
  $$(FIELD_SELECTORS).forEach(el => {
    const key = el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type === 'radio'){
      if(el.checked) data[key + '__' + el.value] = true;
    }else if(el.type === 'checkbox'){
      data[key] = el.checked ? '__checked__' : limit(el.value);
    }else{
      data[key] = limit(el.value);
    }
  });
  return data;
}

export function loadFields(data = {}){
  $$(FIELD_SELECTORS).forEach(el => {
    const key = el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type === 'radio'){
      el.checked = !!data[key + '__' + el.value];
    }else if(el.type === 'checkbox'){
      el.checked = data[key] === '__checked__';
    }else{
      el.value = data[key] ?? '';
    }
  });
}
