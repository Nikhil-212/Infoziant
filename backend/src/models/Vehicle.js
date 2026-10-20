// src/models/Vehicle.js
'use strict';

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Registration number must be 20 characters or fewer'],
    },
    make: {
      type: String,
      required: [true, 'Make is required'],
      trim: true,
      maxlength: [50, 'Make must be 50 characters or fewer'],
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
      maxlength: [50, 'Model must be 50 characters or fewer'],
    },
    year: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
      min: [1886, 'Year must be 1886 or later'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must be 500 characters or fewer'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual — count of associated documents (populated on demand)
vehicleSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'vehicle',
});

vehicleSchema.index({ registrationNumber: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
