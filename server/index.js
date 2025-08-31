const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Joi = require('joi');
const validate = require('./validate');
const { validateToken, generateToken } = require('./auth');
const { dbSchema, sessionDataSchema } = require('./dbSchema');
const helmet = require('helmet');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.json');
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : undefined;

const EMPTY_DB = { sessions: [], data: {}, users: [] };

async function loadDB(){
  async function backupAndNotify(){
    const backup = `${DB_FILE}.bak`;
    try {
      await fs.promises.rename(DB_FILE, backup);
      console.error(`Backed up unreadable DB to ${backup}`);
    } catch (err) {
      console.error('Failed to back up DB file', err);
    }
  }
  try {
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse DB', e);
      await backupAndNotify();
      return JSON.parse(JSON.stringify(EMPTY_DB));
    }
    // Normalize sessions for backwards compatibility before validation
    if (Array.isArray(parsed.sessions)) {
      parsed.sessions = parsed.sessions.map(s => ({
        ...s,
        archived: !!s.archived,
        created: typeof s.created === 'number' ? s.created : 0
      }));
    }
    const { value, error } = dbSchema.validate(parsed);
    if (error) {
      console.error('Invalid DB schema', error);
      await backupAndNotify();
      return JSON.parse(JSON.stringify(EMPTY_DB));
    }
    return value;
  } catch (e) {
    console.error('Failed to load DB', e);
    await backupAndNotify();
    return JSON.parse(JSON.stringify(EMPTY_DB));
  }
}

// Ensure writes to the DB file happen sequentially.
let writeQueue = Promise.resolve();

function saveDB(){
  const data = JSON.stringify(db, null, 2);
  writeQueue = writeQueue
    .then(() => fs.promises.writeFile(DB_FILE, data))
    .catch(e => {
      console.error('Failed to save DB', e);
    });
  return writeQueue;
}

let db;

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ===== Validation Schemas ===== */
const loginSchema = Joi.object({
  name: Joi.string().min(1).max(50).required()
});

const sessionSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
});

const sessionListItemSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  archived: Joi.boolean().required(),
  created: Joi.number().required()
});

const sessionsListSchema = Joi.array().items(sessionListItemSchema);

const sessionArchiveSchema = Joi.object({
  archived: Joi.boolean().required()
});

/* sessionDataSchema is imported from dbSchema */

/* ===== Auth ===== */
app.post('/api/login', (req, res, next) => {
  if (DISABLE_AUTH) {
    return res.json({ token: 'dev-token' });
  }
  next();
}, validate(loginSchema), async (req, res) => {
  const { name } = req.body;
  const token = generateToken(name);
  if (!db.users.includes(name)) {
    db.users.push(name);
    await saveDB();
    io.emit('users', db.users);
  }
  res.json({ token });
});

app.post('/api/logout', auth, async (req, res) => {
  if (DISABLE_AUTH) return res.json({ ok: true });
  const name = req.user;
  const index = db.users.indexOf(name);
  if (index !== -1) {
    db.users.splice(index, 1);
    await saveDB();
    io.emit('users', db.users);
  }
  res.json({ ok: true });
});

app.get('/api/users', auth, (req, res) => {
  res.json(db.users);
});

function isAuthorized (raw) {
  const { valid, payload } = validateToken(raw);
  if (!valid) return null;
  if (!db.users.includes(payload.name)) return null;
  return payload.name;
}

function auth (req, res, next) {
  if (DISABLE_AUTH) return next();
  const raw = req.headers['authorization'];
  const name = isAuthorized(raw);
  if (!name) {
    const error = typeof raw !== 'string' || !raw.startsWith('Bearer ')
      ? 'No token'
      : 'Invalid token';
    return res.status(401).json({ error });
  }
  req.user = name;
  next();
}

/* ===== Sessions ===== */
app.get('/api/sessions', auth, (req, res) => {
  res.json(db.sessions);
});

app.put('/api/sessions', auth, validate(sessionsListSchema), async (req, res) => {
  db.sessions = req.body;
  const ids = new Set(db.sessions.map(s => s.id));
  for (const key of Object.keys(db.data)) {
    if (!ids.has(key)) delete db.data[key];
  }
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.post('/api/sessions', auth, validate(sessionSchema), async (req, res) => {
  const { name } = req.body;
  const id = crypto.randomBytes(6).toString('hex');
  const session = { id, name, archived: false, created: Date.now() };
  db.sessions.push(session);
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json(session);
});

app.put('/api/sessions/:id', auth, validate(sessionSchema), async (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if(!session) return res.status(404).json({ error: 'Not found' });
  session.name = req.body.name;
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.patch('/api/sessions/:id/archive', auth, validate(sessionArchiveSchema), async (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const { archived } = req.body;
  session.archived = archived;
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.delete('/api/sessions/:id', auth, async (req, res) => {
  const id = req.params.id;
  const index = db.sessions.findIndex(s => s.id === id);
  if(index === -1) return res.status(404).json({ error: 'Not found' });
  db.sessions.splice(index, 1);
  delete db.data[id];
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

/* ===== Session data ===== */
app.get('/api/sessions/:id/data', auth, (req, res) => {
  const id = req.params.id;
  res.json(db.data[id] || {});
});

app.put('/api/sessions/:id/data', auth, validate(sessionDataSchema), async (req, res) => {
  const id = req.params.id;
  db.data[id] = req.body;
  await saveDB();
  io.emit('sessionData', { id, data: db.data[id] });
  res.json({ ok: true });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS || '*' } });

io.use((socket, next) => {
  if (DISABLE_AUTH) return next();
  const raw = socket.handshake.auth && socket.handshake.auth.token;
  const name = isAuthorized(raw);
  if (!name) return next(new Error('unauthorized'));
  next();
});

io.on('connection', socket => {
  socket.emit('users', db.users);
});
async function startServer () {
  db = await loadDB();
  return new Promise((resolve, reject) => {
    server.listen(PORT, () => {
      console.log('Server listening on', PORT);
      if (DISABLE_AUTH) console.warn('Authentication disabled');
      resolve();
    });
    server.on('error', reject);
  });
}

module.exports = { app, server, startServer, loadDB, isAuthorized, EMPTY_DB };
