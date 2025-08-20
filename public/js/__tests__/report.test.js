import { gksSum } from '../report.js';

describe('gksSum', () => {
  test('sums three values when all present', () => {
    expect(gksSum(1,2,3)).toBe(6);
  });
  test('returns empty string if any value missing', () => {
    expect(gksSum(1,0,3)).toBe('');
  });
});
