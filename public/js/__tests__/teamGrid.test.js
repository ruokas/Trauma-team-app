import { TEAM_ROLES } from '../constants.js';

describe('teamGrid', () => {
  let init;

  beforeEach(() => {
    document.body.innerHTML = '<div id="teamGrid"></div>';
    ({ init } = require('../teamGrid.js'));
  });

  test('renders inputs for all team roles', () => {
    init();
    expect(document.querySelectorAll('#teamGrid > div')).toHaveLength(TEAM_ROLES.length);
  });

  test('handles missing container gracefully', () => {
    document.body.innerHTML = '';
    expect(() => init()).not.toThrow();
  });
});

