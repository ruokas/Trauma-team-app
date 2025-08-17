import { initArrivalTimer } from './arrivalTimer.js';

jest.useFakeTimers();

jest.mock('./timeline.js', () => ({ logEvent: jest.fn() }));

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="arrivalTimer"></div>';
});

test('shows elapsed time from arrival', () => {
  const session = 'test';
  const now = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  initArrivalTimer(session);
  expect(document.getElementById('arrivalTimer').textContent).toBe('00:00');
  Date.now.mockReturnValue(now + 61000);
  jest.advanceTimersByTime(61000);
  expect(document.getElementById('arrivalTimer').textContent).toBe('01:01');
  Date.now.mockRestore();
});
