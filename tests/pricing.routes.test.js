const request = require('supertest');
const { app } = require('../server');
const { TenantPriceConfig } = require('../src/models');
const { createTenant, createUser, makeToken } = require('./helpers');

describe('GET /api/pricing (llistat)', () => {
  test('SUPER_ADMIN pot filtrar per tenant i service_type', async () => {
    const t1 = await createTenant({ code: 'P1111', name: 'P1' });
    const t2 = await createTenant({ code: 'P2222', name: 'P2' });
  await TenantPriceConfig.create({ tenant_id: t1.id, service_type: 'MENJADOR', contract_type: 'ESPORADIC', price_esporadic: 800, is_active: true });
    await TenantPriceConfig.create({ tenant_id: t2.id, service_type: 'ACOLLIDA', contract_type: 'ESPORADIC', price_esporadic: 500, is_active: true });

    const superAdmin = await createUser({ role: 'SUPER_ADMIN', email: 'sa2@example.com' });
    const token = makeToken(superAdmin);

    const res = await request(app)
      .get('/api/pricing')
      .set('Authorization', `Bearer ${token}`)
      .query({ tenant_id: t1.id, service_type: 'MENJADOR' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach(row => {
      expect(row.tenant_id).toBe(t1.id);
      expect(row.service_type).toBe('MENJADOR');
    });
  });

  test('ADMIN només veu el seu tenant encara que indiqui un altre', async () => {
    const myTenant = await createTenant({ code: 'P3333', name: 'P3' });
    const otherTenant = await createTenant({ code: 'P4444', name: 'P4' });
  await TenantPriceConfig.create({ tenant_id: myTenant.id, service_type: 'MENJADOR', contract_type: 'ESPORADIC', price_esporadic: 810, is_active: true });
  await TenantPriceConfig.create({ tenant_id: otherTenant.id, service_type: 'MENJADOR', contract_type: 'ESPORADIC', price_esporadic: 820, is_active: true });

    const admin = await createUser({ role: 'ADMIN', tenant_id: myTenant.id, email: 'adminp@example.com' });
    const token = makeToken(admin);

    const res = await request(app)
      .get('/api/pricing')
      .set('Authorization', `Bearer ${token}`)
      .query({ tenant_id: otherTenant.id })
      .expect(200);

    expect(res.body.success).toBe(true);
    // Debe devolver solo registros de myTenant
    res.body.data.forEach(row => {
      expect(row.tenant_id).toBe(myTenant.id);
    });
  });
});
