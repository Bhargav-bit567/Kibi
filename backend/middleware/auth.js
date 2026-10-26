/* ============================================
   Kibi — Authentication middleware (JWT bearer tokens)
   ============================================ */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

function signToken(user) {
  return jwt.sign({ sub: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function isAdmin(user) {
  return !!user && (user.role === 'admin' || user.role === 'moderator');
}

// Attaches req.user when a valid token is present; never rejects.
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.user = null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user && user.status !== 'banned') req.user = user;
    else req.authError = 'Account not available';
  } catch (e) {
    req.authError = 'Session expired. Please log in again.';
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: req.authError || 'Please log in to continue.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admin access required.' });
  next();
}

module.exports = { signToken, isAdmin, optionalAuth, requireAuth, requireAdmin };
