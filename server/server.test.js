/**
 * @jest-environment node
 */
const request = require('supertest');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    },
  };
});

describe('server API', () => {
  let app;
  let server;
  let fakeDB;
  let fsPromises;
  let originalPort;
  let startServer;

    beforeEach(async () => {
      jest.resetModules();
      fakeDB = { sessions: [], data: {}, users: [] };
      fsPromises = require('fs').promises;
      fsPromises.readFile.mockResolvedValue(JSON.stringify(fakeDB));
      fsPromises.writeFile.mockImplementation(async (_path, data) => {
        fakeDB = JSON.parse(data);
      });
      originalPort = process.env.PORT;
      process.env.PORT = 0;
      ({ app, server, startServer } = require('./index'));
      await startServer();
    });

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
    process.env.PORT = originalPort;
  });

  async function login(name = 'tester') {
    const res = await request(app).post('/api/login').send({ name });
    return res.body.token;
  }

  test('login and logout', async () => {
    const token = await login('alice');
    expect(fakeDB.users).toHaveLength(1);
    const res = await request(app)
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(fakeDB.users).toHaveLength(0);
  });

  test('session CRUD', async () => {
    const token = await login('bob');
    const create = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'first' });
    expect(create.statusCode).toBe(200);
    const id = create.body.id;
    expect(fakeDB.sessions).toHaveLength(1);

    const list = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id, name: 'first' });

    const update = await request(app)
      .put(`/api/sessions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'updated' });
    expect(update.statusCode).toBe(200);
    expect(fakeDB.sessions[0].name).toBe('updated');

    const del = await request(app)
      .delete(`/api/sessions/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(200);
    expect(fakeDB.sessions).toHaveLength(0);
  });

  test('archive and unarchive session', async () => {
    const token = await login('harry');
    const create = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'arch' });
    const id = create.body.id;
    const archive = await request(app)
      .post(`/api/sessions/${id}/archive`)
      .set('Authorization', `Bearer ${token}`);
    expect(archive.statusCode).toBe(200);
    expect(fakeDB.sessions[0].archived).toBe(true);
    const unarchive = await request(app)
      .post(`/api/sessions/${id}/unarchive`)
      .set('Authorization', `Bearer ${token}`);
    expect(unarchive.statusCode).toBe(200);
    expect(fakeDB.sessions[0].archived).toBe(false);
  });

  test('requires name when creating session', async () => {
    const token = await login('dave');
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: '"name" is required' });
  });

  test('rejects invalid login data', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: '"name" is required' });
  });

  test('rejects session update with invalid name', async () => {
    const token = await login('frank');
    const create = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'valid' });
    const id = create.body.id;
    const update = await request(app)
      .put(`/api/sessions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(update.statusCode).toBe(400);
    expect(update.body).toEqual({ error: '"name" is not allowed to be empty' });
  });

  test('rejects session data update with non-object', async () => {
    const token = await login('george');
    const session = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'data session' });
    const id = session.body.id;
    const res = await request(app)
      .put(`/api/sessions/${id}/data`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('[]');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: '"value" must be of type object' });
  });

  test('returns 404 for missing session on update/delete', async () => {
    const token = await login('erin');
    const badId = 'doesnotexist';
    const update = await request(app)
      .put(`/api/sessions/${badId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'new' });
    expect(update.statusCode).toBe(404);
    const del = await request(app)
      .delete(`/api/sessions/${badId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(404);
  });

  test('session data endpoints', async () => {
    const token = await login('charlie');
    const session = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'data session' });
    const id = session.body.id;

    const payload = { foo: 'bar' };
    const putData = await request(app)
      .put(`/api/sessions/${id}/data`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(putData.statusCode).toBe(200);
    expect(fakeDB.data[id]).toEqual(payload);

    const getData = await request(app)
      .get(`/api/sessions/${id}/data`)
      .set('Authorization', `Bearer ${token}`);
    expect(getData.statusCode).toBe(200);
    expect(getData.body).toEqual(payload);
  });
});

