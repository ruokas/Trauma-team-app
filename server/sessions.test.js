/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
jest.mock('./auth', () => {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return {
    validateToken: jest.fn(headerOrString => {
      const prefix = 'Bearer ';
      if (typeof headerOrString === 'string' && headerOrString.startsWith(prefix)) {
        try {
          const payload = jwt.verify(headerOrString.slice(prefix.length), secret);
          return { valid: true, payload };
        } catch (e) {
          return { valid: false, payload: null };
        }
      }
      return { valid: false, payload: null };
    }),
    generateToken: name => jwt.sign({ name }, secret, { expiresIn })
  };
});
const { validateToken } = require('./auth');

describe('auth middleware', () => {
  let tempDir;
  let dbPath;
  let server;
  let base;
  let startServer;

    beforeAll(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'db-'));
      dbPath = path.join(tempDir, 'db.json');
      await fs.promises.writeFile(dbPath, JSON.stringify({ sessions: [], data: {}, users: [] }));
      process.env.DB_FILE = dbPath;
      process.env.PORT = 0;
      process.env.JWT_SECRET = 'testsecret';
      ({ server, startServer } = require('./index.js'));
      await startServer();
      const address = server.address();
      base = `http://localhost:${address.port}`;
    });

    beforeEach(() => {
      validateToken.mockClear();
    });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  function httpRequest(method, path, { headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(base + path, { method, headers }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      if(body) req.write(body);
      req.end();
    });
  }

  test('returns 400 when body is not an array', async () => {
    const loginRes = await httpRequest('POST', '/api/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tester' })
    });
    const token = JSON.parse(loginRes.data).token;
    const res = await httpRequest('PUT', '/api/sessions', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invalid: true })
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: '"value" must be an array' });
  });

  test('returns 400 when session list items are invalid', async () => {
    const loginRes = await httpRequest('POST', '/api/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tester' })
    });
    const token = JSON.parse(loginRes.data).token;
    const res = await httpRequest('PUT', '/api/sessions', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify([{ id: 5 }])
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.data);
    expect(body.error).toBeDefined();
  });

  test('rejects requests without authorization header', async () => {
    const res = await httpRequest('GET', '/api/sessions');
    expect(validateToken).toHaveBeenCalledWith(undefined);
    expect(res.status).toBe(401);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: 'No token' });
  });

  test('rejects requests with malformed token', async () => {
    const loginRes = await httpRequest('POST', '/api/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tester2' })
    });
    const token = JSON.parse(loginRes.data).token;
    const res = await httpRequest('GET', '/api/sessions', {
      headers: { Authorization: token }
    });
    expect(validateToken).toHaveBeenCalledWith(token);
    expect(res.status).toBe(401);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: 'No token' });
  });

  test('rejects requests with invalid bearer token', async () => {
    const res = await httpRequest('GET', '/api/sessions', {
      headers: { Authorization: 'Bearer invalid' }
    });
    expect(validateToken).toHaveBeenCalledWith('Bearer invalid');
    expect(res.status).toBe(401);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: 'Invalid token' });
  });

  test('allows creating and listing sessions', async () => {
    const loginRes = await httpRequest('POST', '/api/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tester' })
    });
    const token = JSON.parse(loginRes.data).token;
    const createRes = await httpRequest('POST', '/api/sessions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'first' })
    });
    expect(createRes.status).toBe(200);
    const created = JSON.parse(createRes.data);
    const listRes = await httpRequest('GET', '/api/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(listRes.status).toBe(200);
    const sessions = JSON.parse(listRes.data);
    expect(sessions).toContainEqual(created);
  });

  test('removes obsolete session data when replacing the list', async () => {
    const loginRes = await httpRequest('POST', '/api/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dataTester' })
    });
    const token = JSON.parse(loginRes.data).token;

    const create1 = await httpRequest('POST', '/api/sessions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 's1' })
    });
    const session1 = JSON.parse(create1.data);

    const create2 = await httpRequest('POST', '/api/sessions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 's2' })
    });
    const session2 = JSON.parse(create2.data);

    await httpRequest('PUT', `/api/sessions/${session1.id}/data`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ foo: '1' })
    });
    await httpRequest('PUT', `/api/sessions/${session2.id}/data`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bar: '2' })
    });

    const replace = await httpRequest('PUT', '/api/sessions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify([session2])
    });
    expect(replace.status).toBe(200);

    const data1 = await httpRequest('GET', `/api/sessions/${session1.id}/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(JSON.parse(data1.data)).toEqual({});

    const data2 = await httpRequest('GET', `/api/sessions/${session2.id}/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(JSON.parse(data2.data)).toEqual({ bar: '2' });

    const raw = await fs.promises.readFile(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.data[session1.id]).toBeUndefined();
    expect(parsed.data[session2.id]).toEqual({ bar: '2' });
  });
});
