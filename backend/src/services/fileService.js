// src/services/fileService.js
// Safe file operations: upload directory creation, path validation, deletion.
// Files are never served directly from the raw upload directory as static content.
'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Ensures the upload directory exists and is writable.
 * Called once during application startup.
 */
function ensureUploadDir() {
  const dir = config.uploads.dir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[fileService] Created upload directory: ${dir}`);
  }
  // Verify write access
  fs.accessSync(dir, fs.constants.W_OK);
  console.log(`[fileService] Upload directory ready: ${dir}`);
}

/**
 * Returns the absolute path to a stored file.
 * Prevents path traversal by ensuring the resolved path stays within uploadDir.
 */
function safeFilePath(storedFilename) {
  const uploadDir = path.resolve(config.uploads.dir);
  // Reject any path separators in the stored filename
  if (/[/\\]/.test(storedFilename)) {
    throw new Error('Invalid stored filename');
  }
  const resolved = path.resolve(uploadDir, storedFilename);
  if (!resolved.startsWith(uploadDir + path.sep) && resolved !== uploadDir) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Checks whether a file exists on disk.
 */
function fileExists(storedFilename) {
  try {
    const filePath = safeFilePath(storedFilename);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Deletes a file safely. Does not throw if the file is already missing.
 */
function deleteFile(storedFilename) {
  try {
    const filePath = safeFilePath(storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[fileService] Deleted file: ${storedFilename}`);
    }
  } catch (err) {
    console.error(`[fileService] Failed to delete file ${storedFilename}:`, err.message);
  }
}

/**
 * Returns a read stream for a stored file.
 */
function createReadStream(storedFilename) {
  const filePath = safeFilePath(storedFilename);
  return fs.createReadStream(filePath);
}

module.exports = { ensureUploadDir, safeFilePath, fileExists, deleteFile, createReadStream };
