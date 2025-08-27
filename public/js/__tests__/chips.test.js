describe('chips', () => {
  test('allows toggling chip without input element', () => {
    document.body.innerHTML = `
      <div id="labs_basic"><span class="chip" data-value="Hgb"></span></div>
    `;
    const { initChips, isChipActive } = require('../chips.js');
    initChips();
    const chip = document.querySelector('#labs_basic .chip');
    chip.click();
    expect(isChipActive(chip)).toBe(true);
    chip.click();
    expect(isChipActive(chip)).toBe(false);
  });

  test('sets proper roles and aria-checked for single-selection groups', () => {
    document.body.innerHTML = `
      <div id="multi"><span class="chip" data-value="a"></span><span class="chip" data-value="b"></span></div>
      <div id="single" data-single="true"><span class="chip" data-value="1"></span><span class="chip" data-value="2"></span></div>
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const multi = document.getElementById('multi');
    const single = document.getElementById('single');
    expect(multi.getAttribute('role')).toBe('group');
    expect(single.getAttribute('role')).toBe('radiogroup');
    const [c1, c2] = single.querySelectorAll('.chip');
    expect(c1.getAttribute('role')).toBe('radio');
    expect(c1.getAttribute('aria-checked')).toBe('false');
    expect(c1.getAttribute('aria-pressed')).toBe('false');
    c1.click();
    expect(c1.getAttribute('aria-checked')).toBe('true');
    expect(c1.getAttribute('aria-pressed')).toBe('true');
    expect(c2.getAttribute('aria-checked')).toBe('false');
    expect(c2.getAttribute('aria-pressed')).toBe('false');
    c2.click();
    expect(c1.getAttribute('aria-checked')).toBe('false');
    expect(c1.getAttribute('aria-pressed')).toBe('false');
    expect(c2.getAttribute('aria-checked')).toBe('true');
    expect(c2.getAttribute('aria-pressed')).toBe('true');
  });

  test('assigns role and tabindex to non-button chips', () => {
    document.body.innerHTML = `
      <div id="group"><span class="chip" data-value="x"></span></div>
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const chip = document.querySelector('#group .chip');
    expect(chip.getAttribute('role')).toBe('button');
    expect(chip.getAttribute('tabindex')).toBe('0');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    chip.click();
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });

  test('toggles chip with keyboard interaction', () => {
    document.body.innerHTML = `
      <div id="group"><span class="chip" data-value="x"></span></div>
    `;
    const { initChips, isChipActive } = require('../chips.js');
    initChips();
    const chip = document.querySelector('#group .chip');
    chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isChipActive(chip)).toBe(true);
    chip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(isChipActive(chip)).toBe(false);
  });

  test('navigates and activates chips with arrow keys in radiogroups', () => {
    document.body.innerHTML = `
      <div id="group" data-single="true">
        <span class="chip" data-value="a"></span>
        <span class="chip" data-value="b"></span>
      </div>
    `;
    const { initChips, isChipActive } = require('../chips.js');
    initChips();
    const [chip1, chip2] = document.querySelectorAll('#group .chip');
    chip1.focus();
    chip1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(chip2);
    expect(isChipActive(chip2)).toBe(true);
    expect(isChipActive(chip1)).toBe(false);
  });

  test('moves focus with arrow keys without toggling in multiselect groups', () => {
    document.body.innerHTML = `
      <div id="group">
        <span class="chip" data-value="a"></span>
        <span class="chip" data-value="b"></span>
      </div>
    `;
    const { initChips, isChipActive } = require('../chips.js');
    initChips();
    const [chip1, chip2] = document.querySelectorAll('#group .chip');
    chip1.click(); // activate first chip
    chip1.focus();
    chip1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(chip2);
    expect(isChipActive(chip1)).toBe(true);
    expect(isChipActive(chip2)).toBe(false);
  });

  test('shows hospital field when transfer decision selected', () => {
    document.body.innerHTML = `
      <div id="spr_decision_group" data-single="true">
        <button type="button" class="chip" data-value="Pervežimas į kitą ligoninę" aria-pressed="false"></button>
        <button type="button" class="chip" data-value="Namo" aria-pressed="false"></button>
      </div>
      <div id="spr_skyrius_container" style="display:none;">
        <select id="spr_skyrius"></select>
        <input id="spr_skyrius_kita" />
      </div>
      <div id="spr_ligonine_container" style="display:none;">
        <input id="spr_ligonine" />
      </div>
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const [transferChip, otherChip] = document.querySelectorAll('#spr_decision_group .chip');
    const container = document.getElementById('spr_ligonine_container');
    transferChip.click();
    expect(container.style.display).toBe('block');
    otherChip.click();
    expect(container.style.display).toBe('none');
  });

  test('shows department field when hospitalization decision selected', () => {
    document.body.innerHTML = `
      <div id="spr_decision_group" data-single="true">
        <button type="button" class="chip" data-value="Stacionarizavimas" aria-pressed="false"></button>
        <button type="button" class="chip" data-value="Namo" aria-pressed="false"></button>
      </div>
      <div id="spr_skyrius_container" style="display:none;" class="hidden">
        <select id="spr_skyrius"></select>
        <input id="spr_skyrius_kita" class="hidden" />
      </div>
      <div id="spr_ligonine_container" style="display:none;" class="hidden">
        <input id="spr_ligonine" />
      </div>
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const [hospChip, otherChip] = document.querySelectorAll('#spr_decision_group .chip');
    const container = document.getElementById('spr_skyrius_container');
    hospChip.click();
    expect(container.style.display).toBe('block');
    otherChip.click();
    expect(container.style.display).toBe('none');
  });

  test('shows back note input when changes selected', () => {
    document.body.innerHTML = `
      <div id="e_back_group" data-single="true">
        <button type="button" class="chip" data-value="Be pakitimų" aria-pressed="false"></button>
        <button type="button" class="chip" data-value="Pakitimai" aria-pressed="false"></button>
      </div>
      <input id="e_back_notes" class="hidden" />
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const [noChange, changes] = document.querySelectorAll('#e_back_group .chip');
    const input = document.getElementById('e_back_notes');
    changes.click();
    expect(input.style.display).toBe('block');
    expect(input.classList.contains('hidden')).toBe(false);
    noChange.click();
    expect(input.style.display).toBe('none');
    expect(input.classList.contains('hidden')).toBe(true);
  });

  test('shows other imaging field when "Kita" selected', () => {
    document.body.innerHTML = `
      <div id="imaging_ct">
        <span class="chip" data-value="Galvos KT"></span>
      </div>
      <div id="imaging_other_group">
        <span class="chip" data-value="Kita"></span>
      </div>
      <input id="imaging_other" style="display:none;" />
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const normalChip = document.querySelector('#imaging_ct .chip');
    const otherChip = document.querySelector('#imaging_other_group .chip');
    const box = document.getElementById('imaging_other');
    otherChip.click();
    expect(box.style.display).toBe('block');
    otherChip.click();
    expect(box.style.display).toBe('none');
    normalChip.click();
    expect(box.style.display).toBe('none');
  });

  test('toggles pupil note visibility and clears value when switching options', () => {
    document.body.innerHTML = `
      <div id="d_pupil_left_wrapper" aria-expanded="false">
        <div id="d_pupil_left_group" data-single="true">
          <button type="button" class="chip" data-value="n.y." aria-pressed="false"></button>
          <button type="button" class="chip" data-value="kita" aria-pressed="false"></button>
        </div>
        <label for="d_pupil_left_note" class="hidden" hidden>Pastabos</label>
        <input id="d_pupil_left_note" class="hidden" hidden />
      </div>
    `;
    const { initChips } = require('../chips.js');
    initChips();
    const [nyChip, otherChip] = document.querySelectorAll('#d_pupil_left_group .chip');
    const note = document.getElementById('d_pupil_left_note');
    otherChip.click();
    expect(note.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('d_pupil_left_wrapper').getAttribute('aria-expanded')).toBe('true');
    note.value = 'test';
    nyChip.click();
    expect(note.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('d_pupil_left_wrapper').getAttribute('aria-expanded')).toBe('false');
    expect(note.value).toBe('');
  });

  test('updates status indicator when chip is activated', () => {
    document.body.innerHTML = `
      <div id="group"><span class="chip" data-value="a"></span></div>
    `;
    const { setChipActive } = require('../chips.js');
    const chip = document.querySelector('#group .chip');
    setChipActive(chip, true);
    const icon = chip.querySelector('.chip-status-icon');
    const sr = chip.querySelector('.chip-status-text');
    expect(icon.textContent).toBe('✓');
    expect(sr.textContent).toBe('selected');
    setChipActive(chip, false);
    expect(icon.textContent).toBe('✗');
    expect(sr.textContent).toBe('not selected');
  });
});
