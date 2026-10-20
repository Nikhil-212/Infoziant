// tests/documents.test.js
'use strict';

require('./setup');
const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const createApp = require('../src/app');

let app;
let vehicleId;

// Create a minimal valid PDF buffer (PDF magic bytes + minimal content)
const MINIMAL_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('1 0 obj\n<< /Type /Catalog >>\nendobj\n'),
  Buffer.from('%%EOF\n'),
]);

const TEST_PDF_PATH = path.join(os.tmpdir(), `test-${process.pid}.pdf`);

beforeAll(async () => {
  app = createApp();
  fs.writeFileSync(TEST_PDF_PATH, MINIMAL_PDF);
});

afterAll(() => {
  if (fs.existsSync(TEST_PDF_PATH)) fs.unlinkSync(TEST_PDF_PATH);
});

beforeEach(async () => {
  // Create a fresh vehicle for each test
  const res = await request(app).post('/api/vehicles').send({
    registrationNumber: `MH01TEST${Date.now()}`,
    make: 'Test Make',
    model: 'Test Model',
    year: 2023,
  });
  vehicleId = res.body.vehicle._id;
});

describe('Document API', () => {
  describe('POST /api/documents', () => {
    it('uploads a valid PDF', async () => {
      const res = await request(app)
        .post('/api/documents')
        .field('title', 'Insurance Doc')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId)
        .attach('file', TEST_PDF_PATH);

      expect(res.status).toBe(201);
      expect(res.body.document.title).toBe('Insurance Doc');
      expect(res.body.document.storedFilename).toMatch(/\.pdf$/);
    });

    it('returns 400 when no file is attached', async () => {
      const res = await request(app)
        .post('/api/documents')
        .field('title', 'Insurance Doc')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId);
      expect(res.status).toBe(400);
    });

    it('returns 400 when required metadata is missing', async () => {
      const res = await request(app)
        .post('/api/documents')
        .field('title', 'Insurance Doc')
        .attach('file', TEST_PDF_PATH);
      expect(res.status).toBe(400);
    });

    it('returns 404 when vehicleId does not exist', async () => {
      const res = await request(app)
        .post('/api/documents')
        .field('title', 'Doc')
        .field('documentType', 'Insurance')
        .field('vehicleId', '000000000000000000000000')
        .attach('file', TEST_PDF_PATH);
      expect(res.status).toBe(404);
    });

    it('rejects non-PDF file (text file with .pdf extension)', async () => {
      const fakePdf = path.join(os.tmpdir(), `fake-${process.pid}.pdf`);
      fs.writeFileSync(fakePdf, 'This is not a PDF file, just plain text.');
      const res = await request(app)
        .post('/api/documents')
        .field('title', 'Fake PDF')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId)
        .attach('file', fakePdf, { contentType: 'application/pdf' });
      fs.unlinkSync(fakePdf);
      // Should be rejected (415) because magic bytes check fails
      expect(res.status).toBe(415);
    });
  });

  describe('GET /api/documents', () => {
    it('returns empty list when no documents', async () => {
      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(0);
    });

    it('returns uploaded documents', async () => {
      await request(app)
        .post('/api/documents')
        .field('title', 'Doc 1')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId)
        .attach('file', TEST_PDF_PATH);

      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('downloads the PDF', async () => {
      const upload = await request(app)
        .post('/api/documents')
        .field('title', 'Download Test')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId)
        .attach('file', TEST_PDF_PATH);

      const docId = upload.body.document._id;
      const res = await request(app).get(`/api/documents/${docId}/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('deletes the document and its file', async () => {
      const upload = await request(app)
        .post('/api/documents')
        .field('title', 'Delete Test')
        .field('documentType', 'Insurance')
        .field('vehicleId', vehicleId)
        .attach('file', TEST_PDF_PATH);

      const docId = upload.body.document._id;
      const storedFilename = upload.body.document.storedFilename;

      const del = await request(app).delete(`/api/documents/${docId}`);
      expect(del.status).toBe(200);

      const get = await request(app).get(`/api/documents/${docId}`);
      expect(get.status).toBe(404);

      // File should be deleted from disk
      const config = require('../src/config');
      const filePath = path.join(config.uploads.dir, storedFilename);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('GET /api/documents/:id — 404 handling', () => {
    it('returns 404 for non-existent document', async () => {
      const res = await request(app).get('/api/documents/000000000000000000000000');
      expect(res.status).toBe(404);
    });
  });
});
