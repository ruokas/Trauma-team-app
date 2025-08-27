const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Joi = require('joi');
const validate = require('./validate');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.json');
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

async function loadDB(){
  try {
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
    // Ensure all sessions have an archived flag for backwards compatibility
    parsed.sessions = parsed.sessions.map(s => ({ ...s, archived: !!s.archived }));
    return parsed;
  } catch (e) {
    console.error('Failed to load DB', e);
    return { sessions: [], data: {}, users: [] };
  }
}

async function saveDB(){
  try {
    await fs.promises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save DB', e);
  }
}

let db;

const app = express();
app.use(express.json());
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
  archived: Joi.boolean().required()
});

const sessionsListSchema = Joi.array().items(sessionListItemSchema);

const sessionDataSchema = Joi.object().unknown(true);

/* ===== Auth ===== */
app.post('/api/login', (req, res, next) => {
  if (DISABLE_AUTH) {
    return res.json({ token: 'dev-token' });
  }
  next();
}, validate(loginSchema), async (req, res) => {
  const { name } = req.body;
  const token = crypto.randomBytes(8).toString('hex');
  db.users.push({ token, name });
  await saveDB();
  io.emit('users', db.users.map(u => u.name));
  res.json({ token });
});

app.post('/api/logout', auth, async (req, res) => {
  if (DISABLE_AUTH) return res.json({ ok: true });
  const token = req.token;
  const index = db.users.findIndex(u => u.token === token);
  if(index !== -1){
    db.users.splice(index, 1);
    await saveDB();
    io.emit('users', db.users.map(u => u.name));
  }
  res.json({ ok: true });
});

app.get('/api/users', auth, (req, res) => {
  res.json(db.users.map(u => u.name));
});

function auth(req, res, next){
  if (DISABLE_AUTH) return next();
  const header = req.headers['authorization'] || '';
  const prefix = 'Bearer ';
  if(!header.startsWith(prefix)) return res.status(401).json({ error: 'No token' });
  const token = header.slice(prefix.length);
  if(!db.users.some(u => u.token === token)) return res.status(401).json({ error: 'Invalid token' });
  req.token = token;
  next();
}

/* ===== Sessions ===== */
app.get('/api/sessions', auth, (req, res) => {
  res.json(db.sessions);
});

app.put('/api/sessions', auth, validate(sessionsListSchema), async (req, res) => {
  db.sessions = req.body;
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.post('/api/sessions', auth, validate(sessionSchema), async (req, res) => {
  const { name } = req.body;
  const id = crypto.randomBytes(6).toString('hex');
  const session = { id, name, archived: false };
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

app.post('/api/sessions/:id/archive', auth, async (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  session.archived = true;
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.post('/api/sessions/:id/unarchive', auth, async (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  session.archived = false;
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
const io = new Server(server, { cors: { origin: '*' } });

io.use((socket, next) => {
  if (DISABLE_AUTH) return next();
  const raw = socket.handshake.auth && socket.handshake.auth.token;
  const prefix = 'Bearer ';
  const token = (typeof raw === 'string' && raw.startsWith(prefix)) ? raw.slice(prefix.length) : null;
  if(token && db.users.some(u => u.token === token)) return next();
  next(new Error('unauthorized'));
});

io.on('connection', socket => {
  socket.emit('users', db.users.map(u => u.name));
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

module.exports = { app, server, startServer };
