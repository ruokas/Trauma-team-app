describe('initNavToggle',()=>{
  const { initNavToggle } = require('../components/topbar.js');
  let toggle, nav, tabs;

  function setup(matches){
    document.body.innerHTML=`<button id="navToggle">Menu</button><nav id="tabs"><a href="#" class="tab">One</a><a href="#" class="tab">Two</a></nav>`;
    toggle=document.getElementById('navToggle');
    nav=document.getElementById('tabs');
    global.matchMedia = jest.fn().mockReturnValue({ matches, addEventListener: jest.fn(), removeEventListener: jest.fn() });
    initNavToggle(toggle, nav);
    tabs=nav.querySelectorAll('.tab');
  }

  describe('mobile',()=>{
    beforeEach(()=>setup(false));

    test('opens menu and traps focus',()=>{
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(nav.hasAttribute('aria-hidden')).toBe(false);
      expect(document.body.classList.contains('nav-open')).toBe(true);
      expect(document.activeElement).toBe(tabs[0]);
      tabs[1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab'}));
      expect(document.activeElement).toBe(tabs[0]);
    });

    test('closes on Escape key',()=>{
      toggle.click();
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(nav.getAttribute('aria-hidden')).toBe('true');
      expect(document.body.classList.contains('nav-open')).toBe(false);
      expect(document.activeElement).toBe(toggle);
    });

    test('closes when tab clicked',()=>{
      toggle.click();
      tabs[0].click();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(nav.getAttribute('aria-hidden')).toBe('true');
      expect(document.body.classList.contains('nav-open')).toBe(false);
      expect(document.activeElement).toBe(toggle);
    });
  });

  describe('desktop',()=>{
    beforeEach(()=>setup(true));

    test('does not close when tab clicked',()=>{
      tabs[0].click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(nav.hasAttribute('aria-hidden')).toBe(false);
      expect(document.body.classList.contains('nav-open')).toBe(true);
    });
  });
});

