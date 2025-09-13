describe('createChipGroup', () => {
  let createChipGroup;

  beforeAll(() => {
    ({ createChipGroup } = require('../chipGroup.js'));
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="test"></div>';
  });

  test('populates container with chips and indicators', () => {
    createChipGroup('#test', ['A', 'B']);
    const chips = document.querySelectorAll('#test .chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].dataset.value).toBe('A');
    expect(chips[0].querySelector('.chip-status-icon')).not.toBeNull();
    expect(chips[0].querySelector('.chip-status-text')).not.toBeNull();
  });

  test('gracefully handles missing container', () => {
    expect(() => createChipGroup('#missing', ['X'])).not.toThrow();
  });
});
