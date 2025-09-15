describe('accessibility',()=>{
  test('header and nav have appropriate roles',()=>{
    document.body.innerHTML=`<header id="appHeader" role="banner"></header><nav id="tabs" aria-label="Primary navigation"></nav>`;
    const header=document.getElementById('appHeader');
    const nav=document.getElementById('tabs');
    expect(header.getAttribute('role')).toBe('banner');
    expect(nav.getAttribute('aria-label')).toBe('Primary navigation');
  });

  test('nav toggle manages aria-expanded and focus',()=>{
    document.body.innerHTML=`<button id="navToggle">Menu</button><nav id="tabs"><a href="#" class="tab">One</a></nav>`;
    const { initNavToggle }=require('../components/topbar.js');
    const toggle=document.getElementById('navToggle');
    const nav=document.getElementById('tabs');
    initNavToggle(toggle,nav);
    expect(toggle.getAttribute('aria-controls')).toBe('tabs');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });
});
