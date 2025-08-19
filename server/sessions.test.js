/**
 * @jest-environment node
 */
const request = require('supertest');
const fs = require('fs');
const path = require('path');

describe('PUT /api/sessions validation', () => {
  const dbPath = path.join(__dirname, 'db.json');
  let originalDB;
  let server;

  beforeAll(async () => {
    originalDB = await fs.promises.readFile(dbPath, 'utf8');
    process.env.PORT = 0; // use ephemeral port
    server = require('./index.js').server;
    await new Promise(resolve => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
  });

  afterAll(async () => {
    await fs.promises.writeFile(dbPath, originalDB);
    await new Promise(resolve => server.close(resolve));
  });

  test('returns 400 when body is not an array', async () => {
    const loginRes = await request(server).post('/api/login').send({ name: 'tester' });
    const token = loginRes.body.token;

    const res = await request(server)
      .put('/api/sessions')
      .set('Authorization', token)
      .send({ invalid: true });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid session list' });
  });
});
