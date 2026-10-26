/* Seeds sample destinations, travelers and trips into the configured MongoDB.
   Usage: npm run seed  (also happens automatically when the server connects) */

const mongoose = require('mongoose');
const { connectDB } = require('../db');

connectDB()
  .then(() => {
    console.log('✅ Sample data is in place.');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  });
