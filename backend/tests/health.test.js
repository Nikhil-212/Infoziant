// tests/health.test.js
'use strict';

require('./setup');
const request = require('supertest');
const createApp = require('../src/app');

let app;

beforeAll(() => {
  app = createApp();
});

describe('GET /api/health', () => {
  it('returns 200 with status ok when DB is connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.status).toBe('connected');
    expect(typeof res.body.uptime).toBe('number');
  });
});
