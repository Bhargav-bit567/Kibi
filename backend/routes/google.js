/* ============================================
   Kibi — Google sign-in routes
   GET /api/auth/google           → redirect to Google's account chooser
   GET /api/auth/google/callback  → Google returns here; we issue a Kibi
                                    login token and send the user to
                                    login.html#google_token=…, where the
                                    page stores the session.
   ============================================ */

const express = require('express');
const crypto = require('crypto');
const { passport, googleEnabled } = require('../passport');
const { signToken } = require('../middleware/auth');
const { sendWelcomeEmail, sendLoginAlert } = require('../mailer');

const router = express.Router();

// A random `state` value, kept in a short-lived cookie, proves the callback
// belongs to a sign-in this browser started.
const STATE_COOKIE = 'kibi_google_state';
const COOKIE_PATH = '/api/auth/google';

function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function backToLogin(res, params) {
  res.redirect(`/login.html#${new URLSearchParams(params)}`);
}

router.get('/', (req, res, next) => {
  if (!googleEnabled) return backToLogin(res, { google_error: "Google sign-in isn't set up yet." });

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 10 * 60 * 1000, path: COOKIE_PATH });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state, prompt: 'select_account' })(req, res, next);
});

router.get('/callback', (req, res, next) => {
  const fail = message => backToLogin(res, { google_error: message });
  if (!googleEnabled) return fail("Google sign-in isn't set up yet.");

  const expectedState = readCookie(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, { path: COOKIE_PATH });
  if (req.query.error) return fail('Google sign-in was cancelled.');
  if (!expectedState || expectedState !== req.query.state) return fail('Google sign-in expired. Please try again.');

  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err || !user) {
      if (err && !err.expose) console.error('Google sign-in failed:', err.message || err);
      return fail(err && err.expose ? err.message : 'Could not complete Google sign-in. Please try again.');
    }
    const created = !!(info && info.created);
    await (created ? sendWelcomeEmail(user, req, 'google') : sendLoginAlert(user, req, 'google'));
    // New accounts go through onboarding, like email sign-up does.
    backToLogin(res, { google_token: signToken(user), ...(created ? { google_new: '1' } : {}) });
  })(req, res, next);
});

module.exports = router;
