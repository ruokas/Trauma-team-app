function validateToken(headerOrString) {
  const prefix = 'Bearer ';
  if (typeof headerOrString !== 'string' || !headerOrString.startsWith(prefix)) {
    return { valid: false, token: null };
  }
  const token = headerOrString.slice(prefix.length);
  return { valid: true, token };
}

module.exports = { validateToken };
