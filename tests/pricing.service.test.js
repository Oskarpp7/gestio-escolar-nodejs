const { sequelize } = require('../src/config/database');
const { Tenant, TenantPriceConfig } = require('../src/models');
const { loadTenantPricing, invalidateTenantPricing } = require('../src/services/pricingService');

describe('pricingService.loadTenantPricing', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_SQLITE_PATH = ':memory:';
    await sequelize.sync({ force: true });
  });

  // El cierre de la DB se gestiona en tests/setupTests.js

  test('retorna preus normalitzats amb valors del tenant i fallbacks', async () => {
    const tenant = await Tenant.create({ code: 'T9999', name: 'Tenant Test' });

    // Config mínima: MENJADOR FIXE present/absent/justificat i esporàdic present
    await TenantPriceConfig.create({
      tenant_id: tenant.id,
      service_type: 'MENJADOR',
      contract_type: 'FIXE',
      price_present: 777,
      price_absent: 300,
      price_justified: 0,
      is_active: true
    });
    await TenantPriceConfig.create({
      tenant_id: tenant.id,
      service_type: 'MENJADOR',
      contract_type: 'ESPORADIC',
      price_esporadic: 888,
      is_active: true
    });

    invalidateTenantPricing(tenant.id);
    const pricing = await loadTenantPricing(tenant.id);

    expect(pricing).toBeTruthy();
    expect(pricing.MENJADOR.FIXE.present).toBe(777);
    expect(pricing.MENJADOR.ESPORADIC.present).toBe(888);
    // Fallbacks de config global per camps no definits
    expect(pricing.MENJADOR.FIXE.absent).toBeDefined();
    expect(pricing.MENJADOR.FIXE.justificat).toBeDefined();
    expect(pricing.ACOLLIDA.ESPORADIC.present).toBeDefined();
    expect(pricing.discounts.BC70).toBeDefined();
    expect(pricing.discounts.BC100).toBeDefined();
  });
});
