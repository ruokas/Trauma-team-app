describe('initPatientMenuToggle',()=>{
  const { initPatientMenuToggle } = require('../components/topbar.js');
  let toggle, menu;
  beforeEach(()=>{
    document.body.innerHTML='<button id="patientMenuToggle">Menu</button><div id="sessionBar" hidden></div>';
    toggle=document.getElementById('patientMenuToggle');
    menu=document.getElementById('sessionBar');
    global.matchMedia = jest.fn().mockReturnValue({ matches:false, addEventListener: jest.fn() });
    initPatientMenuToggle(toggle, menu);
  });
  test('toggles menu visibility',()=>{
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hasAttribute('hidden')).toBe(true);
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hasAttribute('hidden')).toBe(false);
  });
});
