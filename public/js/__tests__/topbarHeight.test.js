jest.mock('../alerts.js', () => ({ notify: jest.fn() }));
const { initTopbar } = require('../components/topbar.js');

describe('topbar header height', () => {
  beforeEach(() => {
    document.body.innerHTML = '<header id="appHeader"></header><nav></nav>';
    window.matchMedia = window.matchMedia || function(){
      return { matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} };
    };
    global.ResizeObserver = class {
      constructor(cb){ this.cb = cb; }
      observe(){ this.cb([{ contentRect: { height: 40 } }]); }
      unobserve(){}
      disconnect(){}
    };
    const url = new URL('assets/partials/topbar.html', document.baseURI).href;
    global.fetch = jest.fn(u => {
      expect(u).toBe(url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve('<div class="wrap" style="height:40px"></div>') });
    });
  });

  afterEach(() => {
    delete global.fetch;
    delete global.ResizeObserver;
  });

  test('updates --header-height variable', async () => {
    await initTopbar();
    expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('40px');
  });
});
