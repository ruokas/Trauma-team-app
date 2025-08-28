const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function generateToken(name){
  return jwt.sign({ name }, SECRET, { expiresIn: EXPIRES_IN });
}

function validateToken(headerOrString) {
  const prefix = 'Bearer ';
  if (typeof headerOrString !== 'string' || !headerOrString.startsWith(prefix)) {
    return { valid: false, token: null, payload: null };
  }
  const token = headerOrString.slice(prefix.length);
  try {
    const payload = jwt.verify(token, SECRET);
    return { valid: true, token, payload };
  } catch (e) {
    return { valid: false, token: null, payload: null };
  }
}

module.exports = { validateToken, generateToken };
