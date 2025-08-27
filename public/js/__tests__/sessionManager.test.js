jest.mock('../bodyMap.js', () => ({ __esModule: true, default: { serialize: () => '' } }));

const realFetch = global.fetch;

describe('sessionManager utilities', () => {
  afterEach(() => {
    jest.resetModules();
    localStorage.clear();
    if(realFetch){
      global.fetch = realFetch;
    }else{
      delete global.fetch;
    }
  });

  test('sessionKey returns key with current session id', () => {
    const { sessionKey, setCurrentSessionId } = require('../sessionManager.js');
    setCurrentSessionId('abc');
    expect(sessionKey()).toBe('trauma_v10_abc');
  });

  test('saveAll resolves and updates status text', async () => {
    localStorage.setItem('trauma_current_session', 'test');
    localStorage.setItem('trauma_token', 'token');
    document.body.innerHTML = `
      <input id="field" />
      <div id="saveStatus"></div>
      <div id="pain_meds"></div>
      <div id="bleeding_meds"></div>
      <div id="other_meds"></div>
      <div id="procedures"></div>
    `;
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;
    const { saveAll, setCurrentSessionId } = require('../sessionManager.js');
    setCurrentSessionId('test');
    const promise = saveAll();
    expect(document.getElementById('saveStatus').textContent).toBe('Saving...');
    await promise;
    expect(document.getElementById('saveStatus').textContent).toBe('Saved');
    expect(mockFetch).toHaveBeenCalled();
  });

  test('setAuthToken stores and clears token', () => {
    const { setAuthToken, getAuthToken } = require('../sessionManager.js');
    setAuthToken('abc123');
    expect(getAuthToken()).toBe('abc123');
    expect(localStorage.getItem('trauma_token')).toBe('abc123');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('trauma_token')).toBeNull();
  });
});

