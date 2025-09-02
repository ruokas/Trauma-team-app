describe('initPatientMenuToggle', () => {
  const { initPatientMenuToggle } = require('../components/topbar.js');

  test('opens menu on desktop', () => {
    document.body.innerHTML = '<details id="patientMenu"><summary class="btn">Menu</summary><div class="menu"></div></details>';
    global.matchMedia = jest.fn().mockReturnValue({ matches: true, addEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    initPatientMenuToggle(menu);
    expect(menu.hasAttribute('open')).toBe(true);
  });

  test('toggles search field', () => {
    document.body.innerHTML = '<details id="patientMenu"><summary class="btn">Menu</summary><div class="menu"><button id="patientSearchToggle"></button><input id="patientSearch" class="hidden"></div></details>';
    global.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    const search = document.getElementById('patientSearch');
    const toggle = document.getElementById('patientSearchToggle');
    initPatientMenuToggle(menu);
    expect(search.classList.contains('hidden')).toBe(true);
    toggle.click();
    expect(search.classList.contains('hidden')).toBe(false);
    toggle.click();
    expect(search.classList.contains('hidden')).toBe(true);
  });
});
