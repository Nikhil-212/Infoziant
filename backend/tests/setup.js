// tests/setup.js — shared test setup: in-memory MongoDB, test upload dir
'use strict';

const mongoose = require('mongoose');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Use a temp directory for test uploads — never the production upload dir
const TEST_UPLOAD_DIR = path.join(os.tmpdir(), `vehiclevault-test-${process.pid}`);

// Set env vars BEFORE loading config (config is read once at require time)
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
process.env.PORT = '0'; // random port for tests

beforeAll(async () => {
  // Create test upload directory
  fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });

  // Connect to in-process MongoDB (requires mongodb-memory-server or actual mongo)
  // For CI without Docker we use a real mongoose connection to a test URI
  const uri =
    process.env.TEST_MONGODB_URI ||
    `mongodb://localhost:27017/vehiclevault_test_${process.pid}`;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  // Drop test database and close connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  // Remove test upload directory
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Clear test upload files
  if (fs.existsSync(TEST_UPLOAD_DIR)) {
    for (const f of fs.readdirSync(TEST_UPLOAD_DIR)) {
      fs.unlinkSync(path.join(TEST_UPLOAD_DIR, f));
    }
  }
});
