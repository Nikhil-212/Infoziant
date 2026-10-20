// tests/dashboard.test.js
'use strict';

require('./setup');
const request = require('supertest');
const createApp = require('../src/app');

let app;

beforeAll(() => {
  app = createApp();
});

describe('GET /api/dashboard/stats', () => {
  it('returns zero counts on empty DB', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats.totalVehicles).toBe(0);
    expect(res.body.stats.totalDocuments).toBe(0);
    expect(res.body.stats.expiredDocuments).toBe(0);
    expect(res.body.stats.expiringDocuments).toBe(0);
    expect(Array.isArray(res.body.recentVehicles)).toBe(true);
    expect(Array.isArray(res.body.recentDocuments)).toBe(true);
  });

  it('reflects created vehicles in stats', async () => {
    await request(app).post('/api/vehicles').send({
      registrationNumber: 'DL01DASH001',
      make: 'Honda',
      model: 'City',
      year: 2021,
    });
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.body.stats.totalVehicles).toBe(1);
  });
});
