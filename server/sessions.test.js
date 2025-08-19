/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

describe('auth middleware', () => {
  const dbPath = path.join(__dirname, 'db.json');
  let originalDB;
  let server;
  let base;

  beforeAll(async () => {
    originalDB = await fs.promises.readFile(dbPath, 'utf8');
    process.env.PORT = 0;
    server = require('./index.js').server;
    await new Promise(resolve => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
    const address = server.address();
    base = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await fs.promises.writeFile(dbPath, originalDB);
    await new Promise(resolve => server.close(resolve));
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
    expect(body).toEqual({ error: 'Invalid session list' });
  });

  test('rejects requests without authorization header', async () => {
    const res = await httpRequest('GET', '/api/sessions');
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
    expect(res.status).toBe(401);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: 'No token' });
  });

  test('rejects requests with invalid bearer token', async () => {
    const res = await httpRequest('GET', '/api/sessions', {
      headers: { Authorization: 'Bearer invalid' }
    });
    expect(res.status).toBe(401);
    const body = JSON.parse(res.data);
    expect(body).toEqual({ error: 'Invalid token' });
  });
});
