import { initTopbar } from '../components/topbar.js';

describe('initTopbar path resolution', () => {
  beforeEach(() => {
    document.body.innerHTML = '<header id="appHeader"></header>';
  });

  afterEach(() => {
    delete global.fetch;
    window.history.replaceState({}, '', '/');
  });

  test('fetches topbar relative to current directory', async () => {
    window.history.replaceState({}, '', '/docs/index.html');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<div></div>') });
    await initTopbar();
    expect(global.fetch).toHaveBeenCalledWith('/docs/assets/partials/topbar.html');
  });
});
