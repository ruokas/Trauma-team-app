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
});
