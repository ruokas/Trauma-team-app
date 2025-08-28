jest.mock('../alerts.js', () => ({ notify: jest.fn() }));
const { initTopbar } = require('../components/topbar.js');

describe('initTopbar fallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '<header id="appHeader"></header>';
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('renders fallback header on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
    await initTopbar();
    expect(document.getElementById('retryTopbar')).not.toBeNull();
  });
});
