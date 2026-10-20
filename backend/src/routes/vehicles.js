// src/routes/vehicles.js — full CRUD for vehicles
'use strict';

const express = require('express');
const Vehicle = require('../models/Vehicle');
const validateObjectId = require('../middleware/validateObjectId');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/vehicles — list all vehicles
router.get('/', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 }).lean();
    res.json({ count: vehicles.length, vehicles });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles — create a vehicle
router.post('/', async (req, res, next) => {
  try {
    const { registrationNumber, make, model, year, notes } = req.body;

    if (!registrationNumber || !make || !model || !year) {
      return next(createError(400, 'registrationNumber, make, model, and year are required'));
    }

    const vehicle = new Vehicle({ registrationNumber, make, model, year, notes });
    await vehicle.save();
    res.status(201).json({ message: 'Vehicle created', vehicle });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:id — get one vehicle
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return next(createError(404, 'Vehicle not found'));
    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vehicles/:id — update a vehicle
router.put('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const { registrationNumber, make, model, year, notes } = req.body;
    const update = {};
    if (registrationNumber !== undefined) update.registrationNumber = registrationNumber;
    if (make !== undefined) update.make = make;
    if (model !== undefined) update.model = model;
    if (year !== undefined) update.year = year;
    if (notes !== undefined) update.notes = notes;

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!vehicle) return next(createError(404, 'Vehicle not found'));
    res.json({ message: 'Vehicle updated', vehicle });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vehicles/:id — delete a vehicle and its documents
router.delete('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return next(createError(404, 'Vehicle not found'));

    // Also delete associated document records (and files)
    const Document = require('../models/Document');
    const fileService = require('../services/fileService');
    const docs = await Document.find({ vehicle: vehicle._id });
    for (const doc of docs) {
      fileService.deleteFile(doc.storedFilename);
    }
    await Document.deleteMany({ vehicle: vehicle._id });
    await vehicle.deleteOne();

    res.json({ message: 'Vehicle and associated documents deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
