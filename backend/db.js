/* ============================================
   Kibi — MongoDB connection
   The connection promise is cached on `global` so every request
   reuses one connection.
   ============================================ */

const mongoose = require('mongoose');
const config = require('./config');
const { seedSampleData } = require('./seed/sample-data');

const cached = global.__kibiMongo || (global.__kibiMongo = { promise: null });

function connectDB() {
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        await seedSampleData();
        return mongoose.connection;
      })
      .catch(err => {
        cached.promise = null; // allow a retry on the next request
        throw err;
      });
  }
  return cached.promise;
}

module.exports = { connectDB };
