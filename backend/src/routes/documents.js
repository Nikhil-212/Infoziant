// src/routes/documents.js — PDF upload, listing, download, and deletion
'use strict';

const express = require('express');
const path = require('path');
const Document = require('../models/Document');
const Vehicle = require('../models/Vehicle');
const { upload, isPdfBySignature } = require('../services/uploadService');
const fileService = require('../services/fileService');
const validateObjectId = require('../middleware/validateObjectId');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/documents — list all documents (with vehicle info)
router.get('/', async (req, res, next) => {
  try {
    const { vehicleId } = req.query;
    const filter = vehicleId ? { vehicle: vehicleId } : {};
    const documents = await Document.find(filter)
      .populate('vehicle', 'registrationNumber make model year')
      .sort({ uploadedAt: -1 })
      .lean({ virtuals: true });
    res.json({ count: documents.length, documents });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents — upload a PDF document
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return next(err);

    try {
      if (!req.file) {
        return next(createError(400, 'No file uploaded. Send a PDF as the "file" field.'));
      }

      const { title, documentType, vehicleId, expiryDate } = req.body;

      if (!title || !documentType || !vehicleId) {
        // Clean up orphaned file
        fileService.deleteFile(req.file.filename);
        return next(createError(400, 'title, documentType, and vehicleId are required'));
      }

      // Verify vehicle exists
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        fileService.deleteFile(req.file.filename);
        return next(createError(404, 'Vehicle not found'));
      }

      // Verify PDF magic bytes (defense in depth beyond MIME check)
      const filePath = fileService.safeFilePath(req.file.filename);
      if (!isPdfBySignature(filePath)) {
        fileService.deleteFile(req.file.filename);
        return next(createError(415, 'Uploaded file does not appear to be a valid PDF'));
      }

      const doc = new Document({
        title,
        documentType,
        vehicle: vehicle._id,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        expiryDate: expiryDate || null,
      });

      await doc.save();
      await doc.populate('vehicle', 'registrationNumber make model year');

      res.status(201).json({ message: 'Document uploaded successfully', document: doc });
    } catch (err) {
      // If DB save failed, clean up the orphaned file
      if (req.file) fileService.deleteFile(req.file.filename);
      next(err);
    }
  });
});

// GET /api/documents/:id — get document metadata
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('vehicle', 'registrationNumber make model year')
      .lean({ virtuals: true });
    if (!doc) return next(createError(404, 'Document not found'));
    res.json({ document: doc });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/download — stream the PDF file
router.get('/:id/download', validateObjectId('id'), async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return next(createError(404, 'Document not found'));

    if (!fileService.fileExists(doc.storedFilename)) {
      return next(createError(404, 'File not found on server. It may have been deleted.'));
    }

    const safeName = path.basename(doc.originalFilename).replace(/[^\w.\-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', doc.fileSize);

    const stream = fileService.createReadStream(doc.storedFilename);
    stream.on('error', (err) => {
      console.error('[download] Stream error:', err.message);
      if (!res.headersSent) next(createError(500, 'Failed to stream file'));
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id — delete document and its file
router.delete('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return next(createError(404, 'Document not found'));

    // Delete file first; then DB record.
    // If file deletion fails we still remove the DB record to avoid orphaned metadata.
    fileService.deleteFile(doc.storedFilename);
    await doc.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
