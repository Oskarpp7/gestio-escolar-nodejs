const request = require('supertest');
const { app } = require('../server');
const { createTenant, createUser, makeToken } = require('./helpers');

describe('GET /api/tenant/list', () => {
  test('SUPER_ADMIN veu tots els centres actius', async () => {
    const t1 = await createTenant({ code: 'A1111', name: 'Escola A' });
    const t2 = await createTenant({ code: 'B2222', name: 'Escola B' });
    const superAdmin = await createUser({ role: 'SUPER_ADMIN', tenant_id: null, email: 'sa@example.com' });
    const token = makeToken(superAdmin);

    const res = await request(app)
      .get('/api/tenant/list')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const codes = res.body.data.map(x => x.code).sort();
    expect(codes).toEqual(expect.arrayContaining([t1.code, t2.code]));
  });

  test('ADMIN veu només el seu centre', async () => {
  const myTenant = await createTenant({ code: 'C3333', name: 'Escola C' });
  await createTenant({ code: 'D4444', name: 'Escola D' });
    const admin = await createUser({ role: 'ADMIN', tenant_id: myTenant.id, email: 'admin@c.com' });
    const token = makeToken(admin);

    const res = await request(app)
      .get('/api/tenant/list')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(myTenant.id);
  });
});
