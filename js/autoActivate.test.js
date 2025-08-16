describe('autoActivateFromEMS', () => {
  test('activates and deactivates chip based on EMS values', () => {
    document.body.innerHTML = `
      <input id="ems_sbp" />
      <div id="chips_red">
        <button type="button" class="chip red" data-value="AKS < 90 mmHg" aria-pressed="false"></button>
      </div>
    `;
    const { autoActivateFromEMS } = require('./autoActivate.js');
    const { isChipActive } = require('./chips.js');
    const input = document.getElementById('ems_sbp');
    const chip = document.querySelector('#chips_red .chip');
    input.value = '80';
    autoActivateFromEMS();
    expect(isChipActive(chip)).toBe(true);
    expect(chip.dataset.auto).toBe('true');
    input.value = '120';
    autoActivateFromEMS();
    expect(isChipActive(chip)).toBe(false);
    expect(chip.dataset.auto).toBeUndefined();
  });
});
