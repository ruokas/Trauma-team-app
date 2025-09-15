import { $, $$ } from './utils.js';
import { IMAGING_GROUPS } from './chipState.js';

function toggleNote({ groupId, noteId, triggerValue, hiddenAttr = false }) {
  const note = $(noteId);
  if (!note) {
    return;
  }

  const selectors = Array.isArray(groupId) ? groupId : [groupId];
  const shouldShow = selectors.some((selector) => {
    const group = $(selector);
    if (!group) {
      return false;
    }

    if (typeof triggerValue === 'function') {
      return Boolean(triggerValue(group));
    }

    if (group.matches('select, input, textarea')) {
      return group.value === triggerValue;
    }

    const activeChips = $$('.chip.active', group);
    if (Array.isArray(triggerValue)) {
      return activeChips.some((chip) => triggerValue.includes(chip.dataset.value));
    }

    return activeChips.some((chip) => chip.dataset.value === triggerValue);
  });

  if (hiddenAttr) {
    note.hidden = !shouldShow;
  } else {
    note.style.display = shouldShow ? 'block' : 'none';
  }

  note.classList.toggle('hidden', !shouldShow);
}

export function updateDomToggles(){
  [
    { groupId: '#e_back_group', noteId: '#e_back_notes', triggerValue: 'Pakitimai' },
    { groupId: '#e_abdomen_group', noteId: '#e_abdomen_notes', triggerValue: 'Pakitimai' },
    { groupId: '#c_skin_color_group', noteId: '#c_skin_color_other', triggerValue: 'Kita', hiddenAttr: true },
    { groupId: '#spr_decision_group', noteId: '#spr_skyrius_container', triggerValue: 'Stacionarizavimas' },
    { groupId: '#spr_decision_group', noteId: '#spr_ligonine_container', triggerValue: 'Pervežimas į kitą ligoninę' },
    { groupId: '#spr_skyrius', noteId: '#spr_skyrius_kita', triggerValue: 'Kita' },
    { groupId: IMAGING_GROUPS, noteId: '#imaging_other', triggerValue: 'Kita' },
    {
      groupId: ['#b_oxygen_liters', '#b_oxygen_type'],
      noteId: '#oxygenFields',
      triggerValue: (field) => field.value,
      hiddenAttr: true,
    },
    {
      groupId: '#b_dpv_fio2',
      noteId: '#dpvFields',
      triggerValue: (field) => field.value,
      hiddenAttr: true,
    },
  ].forEach(toggleNote);
}
