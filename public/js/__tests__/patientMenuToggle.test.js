describe('initPatientMenuToggle',()=>{
  const { initPatientMenuToggle } = require('../components/topbar.js');
  let toggle, menu;
  describe('mobile',()=>{
    beforeEach(()=>{
      document.body.innerHTML='<button id="patientMenuToggle">Menu</button><div id="sessionBar" hidden aria-hidden="true"></div><div class="patient-menu-overlay" hidden></div>';
      toggle=document.getElementById('patientMenuToggle');
      menu=document.getElementById('sessionBar');
      global.matchMedia = jest.fn().mockReturnValue({ matches:false, addEventListener: jest.fn() });
      initPatientMenuToggle(toggle, menu);
    });
    test('toggles menu visibility',()=>{
      expect(document.body.classList.contains('patient-menu-open')).toBe(false);
      expect(menu.hasAttribute('hidden')).toBe(true);
      toggle.click();
      expect(document.body.classList.contains('patient-menu-open')).toBe(true);
      expect(menu.hasAttribute('hidden')).toBe(false);
      toggle.click();
      expect(document.body.classList.contains('patient-menu-open')).toBe(false);
      expect(menu.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('desktop',()=>{
    beforeEach(()=>{
      document.body.innerHTML='<button id="patientMenuToggle">Menu</button><div id="sessionBar" aria-hidden="false"></div><div class="patient-menu-overlay" hidden></div>';
      toggle=document.getElementById('patientMenuToggle');
      menu=document.getElementById('sessionBar');
      global.matchMedia = jest.fn().mockReturnValue({ matches:true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
      initPatientMenuToggle(toggle, menu);
    });
    test('does not lock scroll',()=>{
      expect(menu.hasAttribute('hidden')).toBe(false);
      expect(document.body.classList.contains('patient-menu-open')).toBe(false);
    });
  });
});
