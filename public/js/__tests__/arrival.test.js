import { recordArrivalTime, startArrivalTimer } from '../arrival.js';

jest.useFakeTimers('modern');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<span id="arrivalTimer"></span>';
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

test('timer can be reset', () => {
  const fixed = new Date('2023-01-01T00:00:00Z');
  jest.setSystemTime(fixed);
  startArrivalTimer(true);
  jest.advanceTimersByTime(3000);
  expect(document.getElementById('arrivalTimer').textContent).toBe('00:00:03');
  const later = new Date('2023-01-01T00:01:00Z');
  jest.setSystemTime(later);
  startArrivalTimer(true);
  expect(localStorage.getItem('arrival_time')).toBe('2023-01-01T00:01:00.000Z');
  jest.advanceTimersByTime(2000);
  expect(document.getElementById('arrivalTimer').textContent).toBe('00:00:02');
});
