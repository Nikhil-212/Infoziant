// src/middleware/errorHandler.js
// Centralized Express error handler. Never exposes stack traces to clients.
'use strict';

const config = require('../config');

/**
 * Formats a Mongoose validation error into a client-friendly message.
 */
function formatValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return messages.join('; ');
}

/**
 * Express error-handling middleware (must be registered last).
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the full error server-side (never credentials or secrets)
  if (!config.isProduction || err.statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    if (!config.isProduction) console.error(err.stack);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      error: 'Conflict',
      message: `Duplicate value for ${field}. Please use a unique value.`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: formatValidationError(err),
    });
  }

  // Mongoose cast error (bad ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The provided ID is not valid.',
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: `File exceeds the maximum allowed size.`,
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid Upload',
      message: 'Unexpected file field in upload request.',
    });
  }

  // Explicit HTTP errors set by routes
  const status = err.statusCode || err.status || 500;
  const message =
    status < 500
      ? err.message
      : config.isProduction
      ? 'An unexpected error occurred. Please try again.'
      : err.message;

  return res.status(status).json({
    error: status < 500 ? err.message : 'Internal Server Error',
    message,
  });
}

/**
 * Creates an HTTP error with a status code.
 */
function createError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, createError };
