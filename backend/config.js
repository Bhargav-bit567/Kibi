/* ============================================
   Kibi — Server configuration (from environment)
   ============================================ */

const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production. Add it to your environment variables.');
  }
  // Dev only: a random secret means sessions reset whenever the server restarts.
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET is not set — using a temporary secret. Set it in .env.');
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kibi',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of extra origins allowed to call the API (only needed
  // when the frontend is hosted on a different domain than the API).
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  // "Continue with Google" (Passport). Works once both the client ID and secret are set.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // Where Google sends users back; relative paths use the current host.
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  // Kibi AI chatbot / itinerary generation (Gemini). The key stays on the server.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  // Emails on sign-up and sign-in. Brevo (HTTPS API) is used when BREVO_API_KEY is set;
  // otherwise SMTP (e.g. Gmail with an app password) once SMTP_HOST/USER/PASS are set.
  brevoApiKey: process.env.BREVO_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || ''
  },
  // Public site address used for links in emails (defaults to the request's host).
  siteUrl: (process.env.SITE_URL || '').replace(/\/$/, '')
};
