/* ============================================
   Kibi — Auth routes: email/password sign-up and login
   (Continue with Google lives in ./google.js)
   ============================================ */

const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { signToken } = require('../middleware/auth');
const { asyncHandler, isValidEmail, newUserFields } = require('../utils');
const { sendWelcomeEmail, sendLoginAlert } = require('../mailer');

const router = express.Router();

function getPasswordValidationError(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return '';
}

function sessionResponse(user) {
  return { token: signToken(user), user: user.toJSON() };
}


/* --- Email + password --- */
router.post('/signup', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ field: 'name', error: 'Name must be at least 2 characters' });
  if (!isValidEmail(email)) return res.status(400).json({ field: 'email', error: 'Please enter a valid email' });
  const passwordError = getPasswordValidationError(password);
  if (passwordError) return res.status(400).json({ field: 'password', error: passwordError });

  if (await User.exists({ email })) {
    return res.status(409).json({ field: 'email', error: 'An account with this email already exists' });
  }

  const user = await User.create({
    ...newUserFields(name),
    name,
    email,
    provider: 'local',
    passwordHash: await bcrypt.hash(password, 10)
  });
  await sendWelcomeEmail(user, req);
  res.status(201).json(sessionResponse(user));
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email)) return res.status(400).json({ field: 'email', error: 'Please enter a valid email' });
  if (!password) return res.status(400).json({ field: 'password', error: 'Password is required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ field: 'email', error: 'No account found with this email' });
  if (!user.passwordHash) {
    return res.status(401).json({ field: 'password', error: `This account uses ${user.provider || 'social'} sign-in` });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ field: 'password', error: 'Incorrect password' });
  }
  if (user.status === 'banned') return res.status(403).json({ field: 'email', error: 'This account has been banned' });

  await sendLoginAlert(user, req);
  res.json(sessionResponse(user));
}));

/* --- Social sign-in --- */
// Find the account for a verified Google profile (by email), or create one.
// Returns { user, created }. Used by the Passport Google strategy (../passport.js).
async function findOrCreateSocialUser(profile, providerName) {
  const email = profile.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    const created = await User.create({
      ...newUserFields(profile.name),
      name: profile.name,
      email,
      provider: providerName,
      providerId: profile.providerId,
      avatar: profile.avatar || profile.name.charAt(0).toUpperCase()
    });
    return { user: created, created: true };
  }

  if (user.status === 'banned') throw Object.assign(new Error('This account has been banned'), { status: 403 });
  // Link the provider; keep the name the user may have edited on their profile.
  user.set({
    name: user.name || profile.name,
    avatar: (user.avatar && user.avatar.length > 1) ? user.avatar : (profile.avatar || user.avatar),
    provider: user.provider || providerName,
    providerId: profile.providerId
  });
  return { user: await user.save(), created: false };
}

module.exports = router;
module.exports.findOrCreateSocialUser = findOrCreateSocialUser;
