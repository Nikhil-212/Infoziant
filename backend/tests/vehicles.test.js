// tests/vehicles.test.js
'use strict';

require('./setup');
const request = require('supertest');
const createApp = require('../src/app');

let app;

beforeAll(() => {
  app = createApp();
});

describe('Vehicle API', () => {
  const valid = {
    registrationNumber: 'MH01AB1234',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
  };

  describe('POST /api/vehicles', () => {
    it('creates a vehicle with valid data', async () => {
      const res = await request(app).post('/api/vehicles').send(valid);
      expect(res.status).toBe(201);
      expect(res.body.vehicle.registrationNumber).toBe('MH01AB1234');
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/vehicles').send({ make: 'Toyota' });
      expect(res.status).toBe(400);
    });

    it('returns 409 on duplicate registration number', async () => {
      await request(app).post('/api/vehicles').send(valid);
      const res = await request(app).post('/api/vehicles').send(valid);
      expect(res.status).toBe(409);
    });

    it('rejects invalid year', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .send({ ...valid, year: 1800 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/vehicles', () => {
    it('returns empty list when no vehicles', async () => {
      const res = await request(app).get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(res.body.vehicles).toHaveLength(0);
    });

    it('returns list with created vehicles', async () => {
      await request(app).post('/api/vehicles').send(valid);
      const res = await request(app).get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(res.body.vehicles.length).toBe(1);
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('returns 404 for non-existent vehicle', async () => {
      const res = await request(app).get('/api/vehicles/000000000000000000000000');
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid ObjectId', async () => {
      const res = await request(app).get('/api/vehicles/not-an-id');
      expect(res.status).toBe(400);
    });

    it('returns vehicle by ID', async () => {
      const create = await request(app).post('/api/vehicles').send(valid);
      const id = create.body.vehicle._id;
      const res = await request(app).get(`/api/vehicles/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.vehicle._id).toBe(id);
    });
  });

  describe('PUT /api/vehicles/:id', () => {
    it('updates vehicle fields', async () => {
      const create = await request(app).post('/api/vehicles').send(valid);
      const id = create.body.vehicle._id;
      const res = await request(app)
        .put(`/api/vehicles/${id}`)
        .send({ notes: 'Updated notes' });
      expect(res.status).toBe(200);
      expect(res.body.vehicle.notes).toBe('Updated notes');
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    it('deletes a vehicle', async () => {
      const create = await request(app).post('/api/vehicles').send(valid);
      const id = create.body.vehicle._id;
      const del = await request(app).delete(`/api/vehicles/${id}`);
      expect(del.status).toBe(200);
      const get = await request(app).get(`/api/vehicles/${id}`);
      expect(get.status).toBe(404);
    });
  });
});
