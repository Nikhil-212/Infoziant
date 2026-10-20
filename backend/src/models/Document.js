// src/models/Document.js
'use strict';

const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'Insurance',
  'Registration Certificate',
  'Pollution Certificate',
  'Road Tax',
  'Fitness Certificate',
  'Permit',
  'Other',
];

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [100, 'Title must be 100 characters or fewer'],
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: {
        values: DOCUMENT_TYPES,
        message: 'Invalid document type',
      },
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Associated vehicle is required'],
    },
    originalFilename: {
      type: String,
      required: true,
    },
    storedFilename: {
      type: String,
      required: true,
      unique: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual — is the document expired?
documentSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Virtual — is the document expiring within 30 days?
documentSchema.virtual('expiresWithin30Days').get(function () {
  if (!this.expiryDate) return false;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return this.expiryDate > now && this.expiryDate <= thirtyDaysFromNow;
});

documentSchema.index({ vehicle: 1 });
documentSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Document', documentSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
