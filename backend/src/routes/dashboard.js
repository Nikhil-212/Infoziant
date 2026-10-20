// src/routes/dashboard.js — aggregated statistics for the dashboard
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Document = require('../models/Document');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Returns counts, recently added records, and expiry summaries.
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      totalDocuments,
      expiredDocuments,
      expiringDocuments,
      recentVehicles,
      recentDocuments,
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Document.countDocuments(),
      Document.countDocuments({ expiryDate: { $lt: now } }),
      Document.countDocuments({
        expiryDate: { $gte: now, $lte: thirtyDaysFromNow },
      }),
      Vehicle.find().sort({ createdAt: -1 }).limit(5).lean(),
      Document.find()
        .sort({ uploadedAt: -1 })
        .limit(5)
        .populate('vehicle', 'registrationNumber make model')
        .lean(),
    ]);

    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      stats: {
        totalVehicles,
        totalDocuments,
        expiredDocuments,
        expiringDocuments,
      },
      recentVehicles,
      recentDocuments,
      system: {
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: now.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
