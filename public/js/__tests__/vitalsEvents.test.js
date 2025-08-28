jest.mock('../timeline.js', () => ({ logEvent: jest.fn() }));
jest.mock('../chips.js', () => ({ isChipActive: jest.fn() }));

describe('vitalsEvents', () => {
  let init;
  const { logEvent } = require('../timeline.js');
  const { isChipActive } = require('../chips.js');

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<input id="gmp_hr"><div id="c_pulse_radial_group"><span class="chip" data-value="Present"></span></div>';
    ({ init } = require('../vitalsEvents.js'));
  });

  test('logs vital input changes', () => {
    init();
    const input = document.getElementById('gmp_hr');
    input.value = '80';
    input.dispatchEvent(new Event('change'));
    expect(logEvent).toHaveBeenCalledWith('vital', 'GMP ŠSD', '80');
  });

  test('logs chip vital when active', () => {
    isChipActive.mockReturnValue(true);
    init();
    const chip = document.querySelector('#c_pulse_radial_group .chip');
    chip.dispatchEvent(new Event('click', { bubbles: true }));
    expect(logEvent).toHaveBeenCalledWith('vital', 'Radialinis pulsas', 'Present');
  });
});

