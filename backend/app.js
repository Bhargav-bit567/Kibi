/* ============================================
   Kibi — Express application
   Serves the REST API under /api and (outside Vercel) the static site.
   ============================================ */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const { connectDB } = require('./db');
const { optionalAuth, requireAuth } = require('./middleware/auth');
const { validateIdParam } = require('./utils');
const authRoutes = require('./routes/auth');
const googleRoutes = require('./routes/google');
const { router: aiRoutes } = require('./routes/ai');
const chatRoutes = require('./routes/chat');
const { googleEnabled } = require('./passport');
const bootstrapRoutes = require('./routes/bootstrap');
const userRoutes = require('./routes/users');
const { trips, saved } = require('./routes/trips');
const { joinRequests, notifications, admin } = require('./routes/social');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  // The pages load Tailwind, fonts, Leaflet and OAuth SDKs from CDNs.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  // Lets OAuth pop-ups (e.g. Google) talk back to the page if ever used.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(compression());
if (!config.isProduction) app.use(morgan('dev'));

/* --- API --- */
const api = express.Router();
api.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
// Profile photos are sent as data URLs (up to 2MB avatar + 3MB cover in the UI).
api.use(express.json({ limit: '10mb' }));

api.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Public sign-in settings for the browser (never includes secrets).
api.get('/config', (req, res) => res.json({ GOOGLE_ENABLED: googleEnabled, GEMINI_ENABLED: !!config.geminiApiKey }));

// Kibi AI (Gemini) — doesn't need the database.
api.use('/ai', aiRoutes);

// Every other API route needs the database.
api.use((req, res, next) => {
  connectDB().then(() => next()).catch(err => {
    console.error('MongoDB connection failed:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  });
});
api.use(optionalAuth);
api.param('id', validateIdParam);

api.use('/auth/google', googleRoutes);
api.use('/auth', authRoutes);
api.use('/bootstrap', bootstrapRoutes);
api.use('/chat', chatRoutes);
api.use('/users', requireAuth, userRoutes);
api.use('/trips', requireAuth, trips);
api.use('/saved-itineraries', requireAuth, saved);
api.use('/join-requests', requireAuth, joinRequests);
api.use('/notifications', requireAuth, notifications);
api.use('/admin', requireAuth, admin);

api.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.code === 11000) return res.status(409).json({ error: 'That record already exists.' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

app.use('/api', api);

/* --- Static site (Vercel serves these files itself) --- */
if (!process.env.VERCEL) {
  app.use(express.static(FRONTEND_DIR, { maxAge: config.isProduction ? '1h' : 0 }));
  app.use((req, res) => res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html')));
}

module.exports = app;
