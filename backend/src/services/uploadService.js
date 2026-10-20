// src/services/uploadService.js
// Multer configuration. Accepts PDF files only.
// UUID-based filenames prevent collisions and path traversal via user input.
'use strict';

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// PDF magic bytes (first 4 bytes: %PDF)
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (_req, _file, cb) => {
    // Generate a UUID-based filename; never use the user-provided name as a path
    const storedName = `${uuidv4()}.pdf`;
    cb(null, storedName);
  },
});

function fileFilter(_req, file, cb) {
  const allowedMime = ['application/pdf', 'application/x-pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMime.includes(file.mimetype) || ext !== '.pdf') {
    const err = new Error('Only PDF files are accepted');
    err.statusCode = 415;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxSizeMb * 1024 * 1024,
    files: 1,
  },
});

/**
 * Verifies PDF magic bytes after Multer has written the file.
 * Returns true if the file starts with %PDF.
 */
function isPdfBySignature(filePath) {
  const fs = require('fs');
  try {
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.equals(PDF_MAGIC);
  } catch {
    return false;
  }
}

module.exports = { upload, isPdfBySignature };
