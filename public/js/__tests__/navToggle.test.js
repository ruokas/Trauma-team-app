describe('initNavToggle',()=>{
  const { initNavToggle } = require('../components/topbar.js');
  let toggle, nav, tabs;

  function setup(matches){
    document.body.innerHTML=`<button id="navToggle">Menu</button><dialog id="tabs"><a href="#" class="tab">One</a><a href="#" class="tab">Two</a></dialog>`;
    toggle=document.getElementById('navToggle');
    nav=document.getElementById('tabs');
    global.matchMedia = jest.fn().mockReturnValue({ matches, addEventListener: jest.fn(), removeEventListener: jest.fn() });
    initNavToggle(toggle, nav);
    tabs=nav.querySelectorAll('.tab');
  }

  describe('mobile',()=>{
    beforeEach(()=>setup(false));

    test('opens dialog and focuses first tab',()=>{
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(nav.hasAttribute('open')).toBe(true);
      expect(document.activeElement).toBe(tabs[0]);
    });

    test('closes on Escape key',()=>{
      toggle.click();
      nav.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(nav.hasAttribute('open')).toBe(false);
      expect(document.activeElement).toBe(toggle);
    });

    test('closes when tab clicked',()=>{
      toggle.click();
      tabs[0].click();
      expect(nav.hasAttribute('open')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle);
    });
  });

  describe('desktop',()=>{
    beforeEach(()=>setup(true));

    test('does not close when tab clicked',()=>{
      tabs[0].click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(nav.hasAttribute('open')).toBe(true);
    });
  });
});

