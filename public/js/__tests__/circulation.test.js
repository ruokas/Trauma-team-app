import { initCirculationChecks } from '../circulation.js';
import { notify } from '../alerts.js';

jest.mock('../alerts.js', () => ({ notify: jest.fn() }));

describe('circulation thresholds', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="c_hr" />
      <input id="c_sbp" />
      <input id="c_dbp" />
    `;
    initCirculationChecks(() => {});
    notify.mockClear();
  });

  test.each([
    ['#c_hr', '50'],
    ['#c_sbp', '80'],
    ['#c_dbp', '50']
  ])('notifies when %s value %s out of range', (sel, value) => {
    const el = document.querySelector(sel);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(notify).toHaveBeenCalled();
  });
});
