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

  beforeEach(async () => {
    jest.resetModules();
    fakeDB = { sessions: [], data: {}, users: [] };
    fsPromises = require('fs').promises;
    fsPromises.readFile.mockResolvedValue(JSON.stringify(fakeDB));
    fsPromises.writeFile.mockImplementation(async (_path, data) => {
      fakeDB = JSON.parse(data);
    });
    process.env.PORT = 0;
    ({ app, server } = require('./index'));
    await new Promise(resolve => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
  });

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
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

