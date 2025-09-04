import zones, { mirrorPath } from '../bodyMapZones.js';

describe('mirrorPath symmetry', () => {
  test('mirrors absolute cubic curves', () => {
    const input = 'M1 2 C3 4 5 6 7 8';
    const expected = 'M47 2 C45 4 43 6 41 8';
    expect(mirrorPath(input)).toBe(expected);
  });

  test('mirrors relative cubic curves', () => {
    const input = 'M10 10 c1 2 3 4 5 6';
    const expected = 'M38 10 c-1 2 -3 4 -5 6';
    expect(mirrorPath(input)).toBe(expected);
  });

  test('upper-arm path is symmetrical', () => {
    const left = zones.find(z => z.id === 'front-left-upper-arm');
    const right = zones.find(z => z.id === 'front-right-upper-arm');
    expect(right.path).toBe(mirrorPath(left.path));
  });
});
