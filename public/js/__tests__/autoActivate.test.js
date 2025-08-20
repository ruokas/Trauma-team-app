describe('autoActivateFromGMP', () => {
  test('activates and deactivates chip based on GMP values', () => {
    document.body.innerHTML = `
      <input id="gmp_sbp" />
      <div id="chips_red">
        <button type="button" class="chip red" data-value="AKS < 90 mmHg" aria-pressed="false"></button>
      </div>
    `;
    const { autoActivateFromGMP } = require('../autoActivate.js');
    const { isChipActive } = require('../chips.js');
    const input = document.getElementById('gmp_sbp');
    const chip = document.querySelector('#chips_red .chip');
    input.value = '80';
    autoActivateFromGMP();
    expect(isChipActive(chip)).toBe(true);
    expect(chip.dataset.auto).toBe('true');
    input.value = '120';
    autoActivateFromGMP();
    expect(isChipActive(chip)).toBe(false);
    expect(chip.dataset.auto).toBeUndefined();
  });
});
