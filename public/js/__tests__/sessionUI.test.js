jest.mock('../sessionApi.js', () => ({
  getSessions: jest.fn(() => Promise.resolve([{ id: '1', name: 'One', archived: false, created: 1 }])),
  saveSessions: jest.fn()
}));

jest.mock('../alerts.js', () => ({ notify: jest.fn() }));

jest.mock('../sessionManager.js', () => ({
  saveAll: jest.fn(),
  setCurrentSessionId: jest.fn(),
  getCurrentSessionId: jest.fn(() => null),
  getAuthToken: jest.fn(() => 'token')
}));

afterEach(() => {
  jest.resetModules();
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('sessionUI', () => {
  test('populateSessionSelect renders options', () => {
    const { populateSessionSelect } = require('../sessionUI.js');
    const sel = document.createElement('select');
    populateSessionSelect(sel, [{ id: '1', name: 'One', archived: false, created: 1 }]);
    expect(sel.querySelectorAll('option').length).toBe(1);
  });

  test('initSessions populates select', async () => {
    document.body.innerHTML = `<select id="sessionSelect"></select><button id="btnNewSession"></button>`;
    const { initSessions } = require('../sessionUI.js');
    await initSessions();
    expect(document.querySelectorAll('#sessionSelect option').length).toBe(1);
  });

  test('updateUserList shows users', () => {
    document.body.innerHTML = `<div id="userList"></div>`;
    const { updateUserList } = require('../sessionUI.js');
    updateUserList(['a','b']);
    expect(document.getElementById('userList').textContent).toContain('a');
  });
});
