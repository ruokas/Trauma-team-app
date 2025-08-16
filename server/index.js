const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

function loadDB(){
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { sessions: [], data: {}, users: [] };
  }
}

function saveDB(){
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

/* ===== Auth ===== */
app.post('/api/login', (req, res) => {
  const name = (req.body && req.body.name) || 'anonymous';
  const token = crypto.randomBytes(8).toString('hex');
  db.users.push({ token, name });
  saveDB();
  res.json({ token });
});

function auth(req, res, next){
  const token = req.headers['authorization'];
  if(!token) return res.status(401).json({ error: 'No token' });
  if(!db.users.some(u => u.token === token)) return res.status(401).json({ error: 'Invalid token' });
  next();
}

/* ===== Sessions ===== */
app.get('/api/sessions', (req, res) => {
  res.json(db.sessions);
});

app.put('/api/sessions', auth, (req, res) => {
  if(Array.isArray(req.body)){
    db.sessions = req.body;
    saveDB();
    io.emit('sessions', db.sessions);
  }
  res.json({ ok: true });
});

app.post('/api/sessions', auth, (req, res) => {
  const name = req.body && req.body.name;
  if(!name) return res.status(400).json({ error: 'Name required' });
  const id = crypto.randomBytes(6).toString('hex');
  const session = { id, name };
  db.sessions.push(session);
  saveDB();
  io.emit('sessions', db.sessions);
  res.json(session);
});

app.put('/api/sessions/:id', auth, (req, res) => {
  const id = req.params.id;
  const session = db.sessions.find(s => s.id === id);
  if(!session) return res.status(404).json({ error: 'Not found' });
  if(req.body && req.body.name) session.name = req.body.name;
  saveDB();
  io.emit('sessions', db.sessions);
  res.json({ ok: true });
});

/* ===== Session data ===== */
app.get('/api/sessions/:id/data', auth, (req, res) => {
  const id = req.params.id;
  res.json(db.data[id] || {});
});

app.put('/api/sessions/:id/data', auth, (req, res) => {
  const id = req.params.id;
  db.data[id] = req.body || {};
  saveDB();
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

server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
