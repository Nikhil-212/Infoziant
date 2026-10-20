// src/middleware/validateObjectId.js
// Rejects requests with invalid MongoDB ObjectId path parameters early.
'use strict';

const mongoose = require('mongoose');
const { createError } = require('./errorHandler');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createError(400, `Invalid ${paramName}: not a valid ObjectId`));
    }
    next();
  };
}

module.exports = validateObjectId;
