describe('initNavToggle',()=>{
  const { initNavToggle } = require('../components/topbar.js');
  let toggle, nav, tabs, overlay;
  beforeEach(()=>{
    document.body.innerHTML=`<button id="navToggle">Menu</button><nav id="tabs"><a href="#" class="tab">One</a><a href="#" class="tab">Two</a></nav><div class="nav-overlay"></div>`;
    toggle=document.getElementById('navToggle');
    nav=document.getElementById('tabs');
    overlay=document.querySelector('.nav-overlay');
    initNavToggle(toggle, nav);
    tabs=nav.querySelectorAll('.tab');
  });

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

  test('does not focus toggle on init',()=>{
    expect(document.activeElement).not.toBe(toggle);
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

  test('closes when overlay clicked',()=>{
    toggle.click();
    overlay.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('nav-open')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
});
