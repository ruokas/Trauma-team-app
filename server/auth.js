const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const INVALID = { valid: false, token: null, payload: null };

function generateToken(name){
  return jwt.sign({ name }, SECRET, { expiresIn: EXPIRES_IN });
}

function validateToken(headerOrString) {
  const prefix = 'Bearer ';
  try {
    if (typeof headerOrString !== 'string' || !headerOrString.startsWith(prefix)) {
      return INVALID;
    }
    const token = headerOrString.slice(prefix.length);
    const payload = jwt.verify(token, SECRET);
    return { valid: true, token, payload };
  } catch (e) {
    return INVALID;
  }
}

module.exports = { validateToken, generateToken };
