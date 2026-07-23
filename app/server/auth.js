const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findOne } = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function hash(pw) { return bcrypt.hashSync(pw, 8); }
function verify(pw, h) { return bcrypt.compareSync(pw, h); }
function sign(user) { return jwt.sign({ id: user.id, role: user.role, org_id: user.org_id }, SECRET, { expiresIn: '30d' }); }

async function currentUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.cookies && req.cookies.token);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    return (await findOne('users', (u) => u.id === payload.id)) || null;
  } catch (e) { return null; }
}

function requireAuth(roles) {
  return async (req, res, next) => {
    try {
      const user = await currentUser(req);
      if (!user) return res.status(401).json({ error: 'Not authenticated' });
      if (roles && roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { hash, verify, sign, currentUser, requireAuth };
