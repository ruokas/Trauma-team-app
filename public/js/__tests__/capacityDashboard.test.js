const handlers = {};

jest.mock('../sessionManager.js', () => ({
  getAuthToken: () => 'token',
  getSocket: () => ({ on: (ev, cb) => { handlers[ev] = cb; } })
}));

describe('capacityDashboard', () => {
  afterEach(() => { delete global.fetch; });

  test('renders initial data and updates on socket events', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ beds:1, ventilators:2, staff:3 }) }));
    document.body.innerHTML = '<section id="capacityDashboard"></section>';
    const { initCapacityDashboard } = require('../capacityDashboard.js');
    initCapacityDashboard();
    // wait for fetch promise
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.getElementById('bedsCount').textContent).toBe('1');
    handlers.resources({ beds:4, ventilators:5, staff:6 });
    expect(document.getElementById('ventilatorsCount').textContent).toBe('5');
  });
});
