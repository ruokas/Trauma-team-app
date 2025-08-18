import { recordArrivalTime, startArrivalTimer } from './arrival.js';

jest.useFakeTimers('modern');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="arrivalTimer"></div>';
});

afterAll(() => {
  jest.useRealTimers();
});

test('records arrival time and updates timer', () => {
  const fixed = new Date('2023-01-01T00:00:00Z');
  jest.setSystemTime(fixed);
  recordArrivalTime();
  startArrivalTimer();
  jest.advanceTimersByTime(5000);
  expect(localStorage.getItem('arrival_time')).toBe('2023-01-01T00:00:00.000Z');
  expect(document.getElementById('arrivalTimer').textContent).toBe('00:00:05');
});
