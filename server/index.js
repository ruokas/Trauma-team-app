const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

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

/* ===== Auth ===== */
app.post('/api/login', async (req, res) => {
  const name = (req.body && req.body.name) || 'anonymous';
  const token = crypto.randomBytes(8).toString('hex');
  db.users.push({ token, name });
  await saveDB();
  io.emit('users', db.users.map(u => u.name));
  res.json({ token });
});

app.post('/api/logout', auth, async (req, res) => {
  const token = req.headers['authorization'];
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
  const token = req.headers['authorization'];
  if(!token) return res.status(401).json({ error: 'No token' });
  if(!db.users.some(u => u.token === token)) return res.status(401).json({ error: 'Invalid token' });
  next();
}

/* ===== Sessions ===== */
app.get('/api/sessions', auth, (req, res) => {
  res.json(db.sessions);
});

app.put('/api/sessions', auth, async (req, res) => {
  if(Array.isArray(req.body)){
    db.sessions = req.body;
    await saveDB();
    io.emit('sessions', db.sessions);
  }
  res.json({ ok: true });
});

app.post('/api/sessions', auth, async (req, res) => {
  const name = req.body && req.body.name;
  if(!name) return res.status(400).json({ error: 'Name required' });
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
  if(req.body && req.body.name) session.name = req.body.name;
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
  db.data[id] = req.body || {};
  await saveDB();
  io.emit('sessionData', { id, data: db.data[id] });
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
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
