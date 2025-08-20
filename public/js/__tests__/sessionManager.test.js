import { sessionKey, setCurrentSessionId } from '../sessionManager.js';

describe('sessionKey', () => {
  test('returns key with current session id', () => {
    setCurrentSessionId('abc');
    expect(sessionKey()).toBe('trauma_v10_abc');
  });
});
