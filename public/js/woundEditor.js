const STRINGS = {
  location: 'Lokacija',
  length: 'Ilgis',
  contamination: 'Kontaminacija',
  traumaType: 'Traumos tipas',
  notes: 'Pastabos',
  save: 'Išsaugoti',
  cancel: 'Atšaukti'
};

function createInput(id, labelText, type = 'text') {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  label.appendChild(input);
  return { label, input };
}

function createTextarea(id, labelText) {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  const textarea = document.createElement('textarea');
  textarea.id = id;
  label.appendChild(textarea);
  return { label, textarea };
}

/**
 * Open wound editor modal populated from mark.dataset
 * @param {HTMLElement} mark element holding wound data in dataset
 * @returns {Promise<object|null>} resolves with updated data or null if cancelled
 */
export function open(mark) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    const form = document.createElement('form');

    const { label: locLabel, input: locInput } = createInput('wound-location', STRINGS.location);
    const { label: lenLabel, input: lenInput } = createInput('wound-length', STRINGS.length, 'number');
    const { label: conLabel, input: conInput } = createInput('wound-contamination', STRINGS.contamination);
    const { label: typeLabel, input: typeInput } = createInput('wound-trauma', STRINGS.traumaType);
    const { label: noteLabel, textarea: noteInput } = createTextarea('wound-notes', STRINGS.notes);

    form.append(
      locLabel,
      lenLabel,
      conLabel,
      typeLabel,
      noteLabel
    );

    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn';
    btnCancel.textContent = STRINGS.cancel;
    const btnSave = document.createElement('button');
    btnSave.type = 'submit';
    btnSave.className = 'btn primary';
    btnSave.textContent = STRINGS.save;
    actions.append(btnCancel, btnSave);
    form.appendChild(actions);
    box.appendChild(form);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const existing = mark.dataset.details ? JSON.parse(mark.dataset.details) : {};
    locInput.value = existing.location || '';
    lenInput.value = existing.length || '';
    conInput.value = existing.contamination || '';
    typeInput.value = existing.traumaType || '';
    noteInput.value = existing.notes || '';

    const focusable = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function trap(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Escape') { e.preventDefault(); close(null); }
    }

    function close(val) {
      overlay.remove();
      document.removeEventListener('keydown', trap, true);
      prev?.focus();
      resolve(val);
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = {
        location: locInput.value.trim(),
        length: lenInput.value.trim(),
        contamination: conInput.value.trim(),
        traumaType: typeInput.value.trim(),
        notes: noteInput.value.trim()
      };
      mark.dataset.details = JSON.stringify(data);
      close(data);
    });

    btnCancel.addEventListener('click', () => close(null));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', trap, true);
    first.focus();
  });
}

export function init(bodyMap){
  if(!bodyMap) return;

  const edit = async mark => {
    const data = await open(mark);
    if(data && typeof bodyMap.saveCb === 'function') bodyMap.saveCb();
  };

  const origAddMark = bodyMap.addMark.bind(bodyMap);
  bodyMap.addMark = function(...args){
    const mark = origAddMark(...args);
    edit(mark);
    return mark;
  };

  bodyMap.marksLayer?.addEventListener('click', e => {
    const mark = e.target.closest('use');
    if(mark) edit(mark);
  });
}

export default { open, init };
