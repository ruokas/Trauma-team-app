describe('initPatientMenuToggle', () => {
  const { initPatientMenuToggle } = require('../components/topbar.js');

  function setup(matches, menuContent = '') {
    document.body.innerHTML = `<button id="patientMenuToggle">Toggle</button><dialog id="patientMenu"><div class="menu">${menuContent}</div></dialog>`;
    global.matchMedia = jest.fn().mockReturnValue({ matches, addEventListener: jest.fn(), removeEventListener: jest.fn() });
    const menu = document.getElementById('patientMenu');
    initPatientMenuToggle(menu);
    return menu;
  }

  test('opens menu on desktop', () => {
    const menu = setup(true);
    expect(menu.hasAttribute('open')).toBe(true);
  });

    test('toggles search field', () => {
      setup(false, '<button id="patientSearchToggle"></button><input id="patientSearch" class="hidden">');
      const search = document.getElementById('patientSearch');
      const toggle = document.getElementById('patientSearchToggle');
      expect(search.classList.contains('hidden')).toBe(true);
      toggle.click();
      expect(search.classList.contains('hidden')).toBe(false);
      toggle.click();
      expect(search.classList.contains('hidden')).toBe(true);
    });

  test('keeps menu open when toggling search on mobile', () => {
    const menu = setup(false, '<button id="patientSearchToggle"></button><input id="patientSearch" class="hidden">');
    const toggle = document.getElementById('patientSearchToggle');
    menu.showModal ? menu.showModal() : menu.setAttribute('open','');
    toggle.click();
    expect(menu.hasAttribute('open')).toBe(true);
  });

  test('closes on backdrop click on mobile', () => {
    const menu = setup(false);
    menu.showModal ? menu.showModal() : menu.setAttribute('open','');
    menu.dispatchEvent(new Event('click'));
    expect(menu.hasAttribute('open')).toBe(false);
  });

  test('removes previous listeners on reinit', () => {
    const menu = setup(false);
    initPatientMenuToggle(menu);
    const spy = jest.spyOn(menu, 'removeAttribute');
    menu.showModal ? menu.showModal() : menu.setAttribute('open','');
    menu.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
