// src/config/index.js — central configuration loader
// All runtime configuration comes from environment variables.
// Never commit .env; copy .env.example to .env and fill in real values.

'use strict';

require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name, defaultValue) {
  return process.env[name] || defaultValue;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '5000'), 10),

  mongodb: {
    uri: optional(
      'MONGODB_URI',
      `mongodb://${optional('MONGO_INITDB_ROOT_USERNAME', 'vaultuser')}:${optional('MONGO_INITDB_ROOT_PASSWORD', 'vaultpass')}@${optional('MONGO_HOST', 'mongodb')}:27017/${optional('MONGO_DB_NAME', 'vehiclevault')}?authSource=admin`
    ),
    dbName: optional('MONGO_DB_NAME', 'vehiclevault'),
  },

  uploads: {
    dir: optional('UPLOAD_DIR', '/app/uploads'),
    maxSizeMb: parseInt(optional('MAX_UPLOAD_SIZE_MB', '10'), 10),
  },

  isProduction: optional('NODE_ENV', 'development') === 'production',
};

module.exports = config;
