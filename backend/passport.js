/* ============================================
   Kibi — "Continue with Google" with Passport (passport-google-oauth20)
   Google sends the user back to /api/auth/google/callback with a code;
   Passport exchanges it for the user's Google profile, and we find or
   create the matching Kibi account.
   ============================================ */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const config = require('./config');
const { findOrCreateSocialUser } = require('./routes/auth');

const googleEnabled = !!(config.googleClientId && config.googleClientSecret);

if (googleEnabled) {
  passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleCallbackUrl,
    // Behind Render's/Vercel's proxy the callback URL must be built as https.
    proxy: true
  }, (accessToken, refreshToken, profile, done) => {
    const email = (profile.emails || []).find(e => e.verified !== false);
    if (!email) return done(Object.assign(new Error('Your Google account has no verified email.'), { expose: true }));

    findOrCreateSocialUser({
      email: email.value,
      name: profile.displayName || email.value.split('@')[0],
      avatar: profile.photos && profile.photos[0] && profile.photos[0].value,
      providerId: profile.id
    }, 'google')
      .then(({ user, created }) => done(null, user, { created }))
      .catch(err => done(Object.assign(err, { expose: !!err.status })));
  }));
}

module.exports = { passport, googleEnabled };
