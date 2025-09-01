/**
 * @jest-environment node
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      rename: jest.fn(),
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
      process.env.JWT_SECRET = 'testsecret';
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

  test('rejects expired tokens', async () => {
    await request(app).post('/api/login').send({ name: 'old' });
    const expired = jwt.sign({ name: 'old', exp: Math.floor(Date.now()/1000) - 10 }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
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
      .patch(`/api/sessions/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true });
    expect(archive.statusCode).toBe(200);
    expect(fakeDB.sessions[0].archived).toBe(true);
    const unarchive = await request(app)
      .patch(`/api/sessions/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: false });
    expect(unarchive.statusCode).toBe(200);
    expect(fakeDB.sessions[0].archived).toBe(false);
  });

  test('rejects invalid archived values', async () => {
    const token = await login('ian');
    const create = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'bad-arch' });
    const id = create.body.id;
    const invalidType = await request(app)
      .patch(`/api/sessions/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: 'yes' });
    expect(invalidType.statusCode).toBe(400);
    expect(invalidType.body).toEqual({ error: '"archived" must be a boolean' });
    const missing = await request(app)
      .patch(`/api/sessions/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ error: '"archived" is required' });
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

  test('returns 413 for payloads exceeding limit', async () => {
    const bigName = 'a'.repeat(1024 * 1024 + 1);
    const res = await request(app).post('/api/login').send({ name: bigName });
    expect(res.statusCode).toBe(413);
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

    const payload = {
      foo: 'bar',
      pain_meds: [{ name: '', on: false, time: '', dose: '', note: '' }],
      bleeding_meds: [],
      other_meds: [],
      procs: [],
      bodymap_svg: ''
    };
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

  test('rejects invalid session data shape', async () => {
    const token = await login('invalid');
    const session = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'bad data' });
    const id = session.body.id;
    const res = await request(app)
      .put(`/api/sessions/${id}/data`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pain_meds: [{ name: 'x', on: 'yes' }] });
    expect(res.statusCode).toBe(400);
  });

  test('serializes concurrent writes to prevent data loss', async () => {
    let active = false;
    let overlap = false;
    fsPromises.writeFile.mockImplementation(async (_path, data) => {
      if (active) overlap = true;
      active = true;
      await new Promise(resolve => setTimeout(resolve, 20));
      fakeDB = JSON.parse(data);
      active = false;
    });

    const requests = ['a', 'b', 'c'].map(name =>
      request(app).post('/api/login').send({ name })
    );
    await Promise.all(requests);

    expect(fakeDB.users.sort()).toEqual(['a', 'b', 'c']);
    expect(overlap).toBe(false);
  });

  test('logs an error when saving the DB fails', async () => {
    const logger = require('./logger');
    const loggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
    fsPromises.writeFile.mockRejectedValueOnce(new Error('disk full'));
    const res = await request(app).post('/api/login').send({ name: 'zoe' });
    expect(res.statusCode).toBe(200);
    expect(loggerError).toHaveBeenCalledWith('Failed to save DB', expect.any(Error));
    loggerError.mockRestore();
  });
});

describe('loadDB', () => {
  let fsPromises;

  beforeEach(() => {
    jest.resetModules();
    fsPromises = require('fs').promises;
    fsPromises.rename.mockResolvedValue();
  });

  test('initializes missing data and users', async () => {
    fsPromises.readFile.mockResolvedValue(JSON.stringify({ sessions: [] }));
    const { loadDB } = require('./index');
    const db = await loadDB();
    expect(db.data).toEqual({});
    expect(db.users).toEqual([]);
  });

  test('initializes invalid data and users types', async () => {
    fsPromises.readFile.mockResolvedValue(
      JSON.stringify({ sessions: [], data: [], users: {} })
    );
    const { loadDB } = require('./index');
    const db = await loadDB();
    expect(db.data).toEqual({});
    expect(db.users).toEqual([]);
  });

  test('returns defaults and logs when DB load fails', async () => {
    fsPromises.readFile.mockRejectedValue(new Error('no file'));
    const logger = require('./logger');
    const loggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { loadDB } = require('./index');
    const db = await loadDB();
    expect(db).toEqual({ sessions: [], data: {}, users: [] });
    const dbPath = path.join(__dirname, 'db.json');
    const backupPath = `${dbPath}.bak`;
    expect(loggerError).toHaveBeenCalledWith('Failed to load DB', expect.any(Error));
    expect(fsPromises.rename).toHaveBeenCalledWith(dbPath, backupPath);
    expect(loggerError).toHaveBeenCalledWith(`Backed up unreadable DB to ${backupPath}`);
    loggerError.mockRestore();
  });

  test('returns defaults and logs when DB JSON is invalid', async () => {
    fsPromises.readFile.mockResolvedValue('{ invalid');
    const logger = require('./logger');
    const loggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { loadDB } = require('./index');
    const db = await loadDB();
    expect(db).toEqual({ sessions: [], data: {}, users: [] });
    const dbPath = path.join(__dirname, 'db.json');
    const backupPath = `${dbPath}.bak`;
    expect(loggerError).toHaveBeenCalledWith('Failed to parse DB', expect.any(SyntaxError));
    expect(fsPromises.rename).toHaveBeenCalledWith(dbPath, backupPath);
    expect(loggerError).toHaveBeenCalledWith(`Backed up unreadable DB to ${backupPath}`);
    loggerError.mockRestore();
  });

  test('returns defaults and logs when DB schema is invalid', async () => {
    fsPromises.readFile.mockResolvedValue(JSON.stringify({ sessions: 'bad' }));
    const logger = require('./logger');
    const loggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { loadDB } = require('./index');
    const db = await loadDB();
    expect(db).toEqual({ sessions: [], data: {}, users: [] });
    const dbPath = path.join(__dirname, 'db.json');
    const backupPath = `${dbPath}.bak`;
    expect(loggerError).toHaveBeenCalledWith('Invalid DB schema', expect.any(Error));
    expect(fsPromises.rename).toHaveBeenCalledWith(dbPath, backupPath);
    expect(loggerError).toHaveBeenCalledWith(`Backed up unreadable DB to ${backupPath}`);
    loggerError.mockRestore();
  });
});

