import { logEvent, clearTimeline } from '../timeline.js';

describe('timeline timezone', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="timelineList"></div>';
    clearTimeline();
  });

  test('rendered entries include timezone', () => {
    logEvent('test', 'label', 'value', '12:00');
    const text = document.getElementById('timelineList').textContent;
    expect(text).toMatch(/UTC/);
  });
});
