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

  test('does not close on outside click on desktop', () => {
    document.body.innerHTML = '<details id="patientMenu"><summary class="btn">Menu</summary><div class="menu"></div></details><div id="outside"></div>';
    global.matchMedia = jest.fn().mockReturnValue({ matches: true, addEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    const outside = document.getElementById('outside');
    initPatientMenuToggle(menu);
    expect(menu.hasAttribute('open')).toBe(true);
    outside.click();
    expect(menu.hasAttribute('open')).toBe(true);
  });

  test('closes on outside click on mobile', () => {
    document.body.innerHTML = '<details id="patientMenu"><summary class="btn">Menu</summary><div class="menu"></div></details><div id="outside"></div>';
    global.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    const outside = document.getElementById('outside');
    initPatientMenuToggle(menu);
    menu.setAttribute('open', '');
    outside.click();
    expect(menu.hasAttribute('open')).toBe(false);
  });

  test('removes previous listeners on reinit', () => {
    document.body.innerHTML = '<details id="patientMenu"><summary class="btn">Menu</summary><div class="menu"></div></details><div id="outside"></div>';
    global.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    const outside = document.getElementById('outside');
    initPatientMenuToggle(menu);
    initPatientMenuToggle(menu);
    menu.setAttribute('open','');
    const spy = jest.spyOn(menu, 'removeAttribute');
    outside.click();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
