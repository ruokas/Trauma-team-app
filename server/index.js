const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const Joi = require('joi');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.json');

async function loadDB(){
  try {
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
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

const sessionsListSchema = Joi.array().items(
  Joi.object({
    id: Joi.string().required(),
    name: Joi.string().min(1).max(100).required()
  })
);

const sessionDataSchema = Joi.object().unknown(true);

/* ===== Auth ===== */
app.post('/api/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { name } = value;
  const token = crypto.randomBytes(8).toString('hex');
  db.users.push({ token, name });
  await saveDB();
  io.emit('users', db.users.map(u => u.name));
  res.json({ token });
});

app.post('/api/logout', auth, async (req, res) => {
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

app.put('/api/sessions', auth, async (req, res) => {
  const { error, value } = sessionsListSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  db.sessions = value;
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

app.post('/api/sessions', auth, async (req, res) => {
  const { error, value } = sessionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { name } = value;
  const id = crypto.randomBytes(6).toString('hex');
  const session = { id, name };
  db.sessions.push(session);
  await saveDB();
  io.emit('sessions', db.sessions);
  res.json(session);
});

app.put('/api/sessions/:id', auth, async (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if(!session) return res.status(404).json({ error: 'Not found' });
  const { error, value } = sessionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  session.name = value.name;
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

app.put('/api/sessions/:id/data', auth, async (req, res) => {
  const id = req.params.id;
  const { error, value } = sessionDataSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  db.data[id] = value;
  await saveDB();
  io.emit('sessionData', { id, data: db.data[id] });
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

module.exports = { app, server };

io.use((socket, next) => {
  const raw = socket.handshake.auth && socket.handshake.auth.token;
  const prefix = 'Bearer ';
  const token = (typeof raw === 'string' && raw.startsWith(prefix)) ? raw.slice(prefix.length) : null;
  if(token && db.users.some(u => u.token === token)) return next();
  next(new Error('unauthorized'));
});

io.on('connection', socket => {
  socket.emit('users', db.users.map(u => u.name));
});

(async () => {
  db = await loadDB();
  server.listen(PORT, () => {
    console.log('Server listening on', PORT);
  });
})().catch(err => {
  console.error('Failed to start server', err);
});
