describe('tabs', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  test('moves focus with arrow keys and activates tab on Enter', () => {
    document.body.innerHTML = `
      <nav id="tabs"></nav>
      <div class="view" data-tab="Aktyvacija"></div>
      <div class="view" data-tab="A – Kvėpavimo takai"></div>
    `;
    const setSpy = jest.spyOn(Storage.prototype, 'setItem');
    const tabs = require('./tabs.js');
    tabs.initTabs();

    const nav = document.getElementById('tabs');
    const buttons = nav.querySelectorAll('.tab');
    buttons[0].focus();

    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(document.activeElement).toBe(buttons[1]);

    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(document.activeElement).toBe(buttons[0]);

    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(setSpy).toHaveBeenCalledWith('v10_activeTab', tabs.TABS[1].name);
  });

  test('showTab saves active tab and initTabs restores it', () => {
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn((k, v) => { store[k] = v; }),
        getItem: jest.fn(k => store[k]),
      },
      writable: true,
    });

    document.body.innerHTML = `
      <nav id="tabs"></nav>
      <div class="view" data-tab="Aktyvacija"></div>
      <div class="view" data-tab="A – Kvėpavimo takai"></div>
    `;

    const tabs = require('./tabs.js');

    tabs.initTabs();
    tabs.showTab('A – Kvėpavimo takai');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('v10_activeTab', 'A – Kvėpavimo takai');

    document.body.innerHTML = `
      <nav id="tabs"></nav>
      <div class="view" data-tab="Aktyvacija"></div>
      <div class="view" data-tab="A – Kvėpavimo takai"></div>
    `;

    tabs.initTabs();
    expect(window.localStorage.getItem).toHaveBeenCalledWith('v10_activeTab');
    const active = document.querySelector('nav .tab.active');
    expect(active.dataset.tab).toBe('A – Kvėpavimo takai');
  });
});
