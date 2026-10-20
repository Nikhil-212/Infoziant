// src/app.js — Express application factory
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const vehiclesRouter = require('./routes/vehicles');
const documentsRouter = require('./routes/documents');
const dashboardRouter = require('./routes/dashboard');

function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS — restrict in production; open for local dev
  app.use(
    cors({
      origin: config.isProduction ? false : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
  );

  // Rate limiting — prevents brute-force and DoS
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests', message: 'Please try again later.' },
    })
  );

  // Body parsing — limit JSON body size
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging (skip in test environment)
  if (config.env !== 'test') {
    app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  }

  // API routes
  app.use('/api/health', healthRouter);
  app.use('/api/vehicles', vehiclesRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/dashboard', dashboardRouter);

  // 404 handler for unmatched API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'API endpoint does not exist' });
  });

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
