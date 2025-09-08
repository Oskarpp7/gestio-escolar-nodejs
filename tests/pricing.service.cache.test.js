const { sequelize } = require('../src/config/database');
const { Tenant, TenantPriceConfig } = require('../src/models');
const pricingService = require('../src/services/pricingService');

describe('pricingService cache', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_SQLITE_PATH = ':memory:';
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    try { await sequelize.close(); } catch (e) { /* noop */ }
  });

  beforeEach(() => {
    pricingService.clearCache();
  });

  test('loadTenantPricing usa caché tras primera llamada y clearCache la invalida', async () => {
    const tenant = await Tenant.create({ code: 'C1111', name: 'Cache Tenant' });
    // Primer dataset
    await TenantPriceConfig.create({
      tenant_id: tenant.id,
      service_type: 'MENJADOR',
      contract_type: 'FIXE',
      price_present: 700, price_absent: 300, price_justified: 0,
      is_active: true
    });

    const first = await pricingService.loadTenantPricing(tenant.id);
    expect(first.MENJADOR.FIXE.present).toBe(700);

    // Cambiar datos en BD
    const rec = await TenantPriceConfig.findOne({ where: { tenant_id: tenant.id, service_type: 'MENJADOR', contract_type: 'FIXE' } });
    await rec.update({ price_present: 710 });

    // Sin limpiar caché, debe seguir 700
    const cached = await pricingService.loadTenantPricing(tenant.id);
    expect(cached.MENJADOR.FIXE.present).toBe(700);

    // Limpiar caché y volver a cargar
    pricingService.clearCache();
    const refreshed = await pricingService.loadTenantPricing(tenant.id);
    expect(refreshed.MENJADOR.FIXE.present).toBe(710);
  });
});
