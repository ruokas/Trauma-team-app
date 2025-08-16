describe('chips', () => {
  test('allows toggling chip without input element', () => {
    document.body.innerHTML = `
      <div id="labs_basic"><span class="chip" data-value="Hgb"></span></div>
    `;
    const { initChips, isChipActive } = require('./chips.js');
    initChips();
    const chip = document.querySelector('#labs_basic .chip');
    chip.click();
    expect(isChipActive(chip)).toBe(true);
    chip.click();
    expect(isChipActive(chip)).toBe(false);
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
    const { initChips } = require('./chips.js');
    initChips();
    const [transferChip, otherChip] = document.querySelectorAll('#spr_decision_group .chip');
    const container = document.getElementById('spr_ligonine_container');
    transferChip.click();
    expect(container.style.display).toBe('block');
    otherChip.click();
    expect(container.style.display).toBe('none');
  });

  test('shows other imaging field when "Kita" selected', () => {
    document.body.innerHTML = `
      <div id="imaging_basic">
        <span class="chip" data-value="Galvos KT"></span>
        <span class="chip" data-value="Kita"></span>
      </div>
      <input id="imaging_other" style="display:none;" />
    `;
    const { initChips } = require('./chips.js');
    initChips();
    const [normalChip, otherChip] = document.querySelectorAll('#imaging_basic .chip');
    const box = document.getElementById('imaging_other');
    otherChip.click();
    expect(box.style.display).toBe('block');
    otherChip.click();
    expect(box.style.display).toBe('none');
    normalChip.click();
    expect(box.style.display).toBe('none');
  });
});
