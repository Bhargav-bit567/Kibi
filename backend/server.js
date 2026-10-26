/* ============================================
   Kibi — Server entry point (local dev, Render, Railway, any Node host)
   ============================================ */

const app = require('./app');
const config = require('./config');
const { connectDB } = require('./db');

connectDB()
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('⚠️  MongoDB connection failed — API requests will retry:', err.message));

app.listen(config.port, () => {
  console.log(`🚀 Kibi running at http://localhost:${config.port}`);
}).on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.port} is already in use — Kibi is probably already running in another terminal.`);
    console.error(`   Stop it with Ctrl+C there, or free the port: kill $(lsof -t -i :${config.port})`);
    console.error('   Or use another port: set PORT=3001 in backend/.env');
    process.exit(1);
  }
  throw err;
});
