jest.mock('../sessionManager.js', () => ({
  getAuthToken: () => 'token'
}));

const realFetch = global.fetch;

afterEach(() => {
  jest.resetModules();
  localStorage.clear();
  if(realFetch){
    global.fetch = realFetch;
  } else {
    delete global.fetch;
  }
  delete global.io;
});

describe('sessionApi', () => {
  test('getSessions fetches and stores sessions', async () => {
    const mockSessions = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B', archived: 1 }
    ];
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockSessions) }));
    const { getSessions } = require('../sessionApi.js');
    const list = await getSessions();
    expect(list).toEqual([
      { id: '1', name: 'A', archived: false },
      { id: '2', name: 'B', archived: true }
    ]);
    expect(JSON.parse(localStorage.getItem('trauma_sessions'))[1].archived).toBe(true);
  });

  test('saveSessions posts list', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    const { saveSessions } = require('../sessionApi.js');
    const list = [{ id: '1', name: 'A', archived: false }];
    await saveSessions(list);
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions', expect.objectContaining({ method: 'PUT' }));
  });

  test('connectSocket registers callbacks', () => {
    const handlers = {};
    global.io = jest.fn(() => ({
      on: (evt, cb) => { handlers[evt] = cb; },
      disconnect: jest.fn()
    }));
    const { connectSocket } = require('../sessionApi.js');
    const onSessions = jest.fn();
    connectSocket({ onSessions });
    handlers.sessions([1,2]);
    expect(onSessions).toHaveBeenCalledWith([1,2]);
  });

  test('connectSocket backs off and resets delay', () => {
    jest.useFakeTimers();
    const handlers = {};
    const connect = jest.fn();
    global.io = jest.fn(() => ({
      on: (evt, cb) => { handlers[evt] = cb; },
      connect,
      disconnect: jest.fn()
    }));
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const { connectSocket } = require('../sessionApi.js');
    connectSocket();
    const expected = [1000, 2000, 4000, 8000, 16000, 16000];
    expected.forEach(delay => {
      handlers.connect_error(new Error('fail'));
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), delay);
    });
    handlers.connect();
    handlers.connect_error(new Error('fail'));
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});
