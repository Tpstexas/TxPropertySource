const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'thh-secret-key-change-me';

function verifyAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

module.exports = { verifyAuth };
