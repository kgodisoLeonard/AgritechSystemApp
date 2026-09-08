'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db');

describe('API', () => {
  let app;
  let db;

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('registers a farmer', async () => {
    const res = await request(app)
      .post('/farmers')
      .send({ name: 'Alice', latitude: -1.29, longitude: 36.82 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Alice' });
  });

  test('rejects a farmer without location', async () => {
    const res = await request(app).post('/farmers').send({ name: 'Alice' });
    expect(res.status).toBe(400);
  });

  test('onboards a supplier and lists their products', async () => {
    const supplierRes = await request(app)
      .post('/suppliers')
      .send({ name: 'Co-op Store', latitude: -1.3, longitude: 36.83 });
    expect(supplierRes.status).toBe(201);

    const productRes = await request(app)
      .post(`/suppliers/${supplierRes.body.id}/products`)
      .send({ name: 'Fertilizer', unitPrice: 50, bulkMinQuantity: 10, bulkPrice: 40 });
    expect(productRes.status).toBe(201);

    const getRes = await request(app).get(`/suppliers/${supplierRes.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.products).toHaveLength(1);
  });

  test('logs an expense and a sale, and reports profit in the farmer summary', async () => {
    const farmerRes = await request(app)
      .post('/farmers')
      .send({ name: 'Alice', latitude: -1.29, longitude: 36.82 });
    const farmerId = farmerRes.body.id;

    await request(app)
      .post('/expenses')
      .send({ farmerId, item: 'Fertilizer', amount: 100, latitude: -1.29, longitude: 36.82 });
    await request(app).post('/sales').send({ farmerId, item: 'Maize', amount: 300 });

    const summaryRes = await request(app).get(`/farmers/${farmerId}/summary`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.totalExpenses).toBe(100);
    expect(summaryRes.body.totalSales).toBe(300);
    expect(summaryRes.body.profit).toBe(200);
  });

  test('matches nearby farmers into a group order and notifies the supplier', async () => {
    const f1 = await request(app)
      .post('/farmers')
      .send({ name: 'Alice', latitude: -1.2921, longitude: 36.8219 });
    const f2 = await request(app)
      .post('/farmers')
      .send({ name: 'Bob', latitude: -1.3, longitude: 36.83 });

    await request(app)
      .post('/expenses')
      .send({ farmerId: f1.body.id, item: 'Fertilizer', amount: 100, latitude: -1.2921, longitude: 36.8219 });
    await request(app)
      .post('/expenses')
      .send({ farmerId: f2.body.id, item: 'Fertilizer', amount: 100, latitude: -1.3, longitude: 36.83 });

    const supplierRes = await request(app)
      .post('/suppliers')
      .send({ name: 'Co-op Store', latitude: -1.295, longitude: 36.825 });
    await request(app)
      .post(`/suppliers/${supplierRes.body.id}/products`)
      .send({ name: 'Fertilizer', unitPrice: 50 });

    const matchRes = await request(app)
      .post('/group-orders/match')
      .send({ item: 'Fertilizer', radiusKm: 15, minGroupSize: 2 });
    expect(matchRes.status).toBe(201);
    expect(matchRes.body.groupsFormed).toBe(1);

    const groupOrderId = matchRes.body.groupOrders[0].groupOrderId;

    const f3 = await request(app)
      .post('/farmers')
      .send({ name: 'Carol', latitude: -1.29, longitude: 36.82 });
    const joinRes = await request(app)
      .post(`/group-orders/${groupOrderId}/join`)
      .send({ farmerId: f3.body.id, quantity: 5 });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.members).toHaveLength(3);

    const notificationsRes = await request(app).get(
      `/suppliers/${supplierRes.body.id}/notifications`
    );
    expect(notificationsRes.status).toBe(200);
    expect(notificationsRes.body).toHaveLength(1);
  });
});
