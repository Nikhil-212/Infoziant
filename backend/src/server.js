// src/server.js — entry point: connect to MongoDB then start HTTP server
'use strict';

const mongoose = require('mongoose');
const config = require('./config');
const createApp = require('./app');
const { ensureUploadDir } = require('./services/fileService');

async function start() {
  // Ensure upload directory exists and is writable before accepting requests
  ensureUploadDir();

  const app = createApp();

  // Connect to MongoDB with retry logic for slow container startup
  let retries = 10;
  while (retries > 0) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      console.log(`[server] MongoDB connected — db: ${config.mongodb.dbName}`);
      break;
    } catch (err) {
      retries -= 1;
      console.warn(`[server] MongoDB connection failed (${retries} retries left): ${err.message}`);
      if (retries === 0) {
        console.error('[server] Could not connect to MongoDB. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] VehicleVault API running on port ${config.port} (${config.env})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[server] Received ${signal} — shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      console.log('[server] Connections closed. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
