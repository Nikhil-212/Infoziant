// src/routes/health.js
'use strict';

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/health
 * Returns application liveness and MongoDB readiness.
 * Never exposes credentials or internal details.
 */
router.get('/', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbStatus = dbStateMap[dbState] || 'unknown';
  const healthy = dbState === 1;

  const payload = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  res.status(healthy ? 200 : 503).json(payload);
});

module.exports = router;
