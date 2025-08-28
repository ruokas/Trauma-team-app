jest.mock('../app.js', () => ({
  createChipGroup: jest.fn((selector, values) => {
    const container = global.document.querySelector(selector);
    if (!container) return null;
    values.forEach(val => {
      const chip = global.document.createElement('span');
      chip.className = 'chip';
      chip.dataset.value = val;
      chip.textContent = val;
      container.appendChild(chip);
    });
    return container;
  })
}));

const { buildChipGroup, initChipGroups, CHIP_DATA } = require('../chipData.js');
const { createChipGroup } = require('../app.js');

describe('chipData buildChipGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="a_airway_group"></div><div id="b_breath_left_group"></div>';
    jest.clearAllMocks();
  });

  test('clears container and prevents reinitialization', () => {
    const container = document.querySelector('#a_airway_group');
    container.innerHTML = '<span class="chip">old</span>';
    buildChipGroup('a_airway_group', CHIP_DATA.a_airway_group);
    expect(container.querySelectorAll('.chip')).toHaveLength(CHIP_DATA.a_airway_group.length);
    expect(container.dataset.initialized).toBe('true');
    buildChipGroup('a_airway_group', CHIP_DATA.a_airway_group);
    expect(createChipGroup).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.chip')).toHaveLength(CHIP_DATA.a_airway_group.length);
  });

  test('initChipGroups runs once without duplicating chips', () => {
    initChipGroups();
    const firstCount = document.querySelectorAll('#a_airway_group .chip').length;
    initChipGroups();
    const secondCount = document.querySelectorAll('#a_airway_group .chip').length;
    expect(firstCount).toBe(CHIP_DATA.a_airway_group.length);
    expect(secondCount).toBe(firstCount);
    expect(createChipGroup).toHaveBeenCalledTimes(2);
  });
});
