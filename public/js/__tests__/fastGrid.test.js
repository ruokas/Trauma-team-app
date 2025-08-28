import { FAST_AREAS } from '../config.js';

describe('fastGrid', () => {
  let init;

  beforeEach(() => {
    document.body.innerHTML = '<div id="fastGrid"></div>';
    ({ init } = require('../fastGrid.js'));
  });

  test('renders a box for each FAST area', () => {
    init();
    expect(document.querySelectorAll('#fastGrid > div')).toHaveLength(FAST_AREAS.length);
  });

  test('handles missing container gracefully', () => {
    document.body.innerHTML = '';
    expect(() => init()).not.toThrow();
  });
});

