/**
 * Servei de preus per tenant amb cache en memòria.
 * Llegeix TenantPriceConfig i aplica fallbacks a config global o .env
 */
const NodeCache = require('node-cache');
const { TenantPriceConfig } = require('../models');
const config = require('../config/config');

// Cache simple amb TTL de 5 minuts
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Claus de cache helpers
const keyFor = (tenantId) => `tenantPricing:${tenantId}`;

/**
 * Normalitza estructura de preus retornada
 */
function normalizePricing(rows) {
  const out = {
    MENJADOR: {
      FIXE: { present: null, absent: null, justificat: null },
      ESPORADIC: { present: null }
    },
    ACOLLIDA: {
      FIXE: {},
      ESPORADIC: { present: null }
    },
    discounts: { BC70: config.beques.BC70, BC100: config.beques.BC100 }
  };

  for (const r of rows) {
    if (r.service_type === 'MENJADOR' && r.contract_type === 'FIXE') {
      out.MENJADOR.FIXE.present = r.price_present ?? out.MENJADOR.FIXE.present;
      out.MENJADOR.FIXE.absent = r.price_absent ?? out.MENJADOR.FIXE.absent;
      out.MENJADOR.FIXE.justificat = r.price_justified ?? out.MENJADOR.FIXE.justificat;
    }
    if (r.service_type === 'MENJADOR' && r.contract_type === 'ESPORADIC') {
      out.MENJADOR.ESPORADIC.present = r.price_esporadic ?? out.MENJADOR.ESPORADIC.present;
    }
    if (r.service_type === 'ACOLLIDA' && r.contract_type === 'ESPORADIC') {
      out.ACOLLIDA.ESPORADIC.present = r.price_esporadic ?? out.ACOLLIDA.ESPORADIC.present;
    }
    // Descomptes (si existeixen a algun registre)
    if (r.discount_bc70 != null) out.discounts.BC70 = r.discount_bc70;
    if (r.discount_bc100 != null) out.discounts.BC100 = r.discount_bc100;
  }

  // Fallbacks a config global/.env si hi ha forats
  out.MENJADOR.FIXE.present = out.MENJADOR.FIXE.present ?? config.pricing.menjador.fixe.present;
  out.MENJADOR.FIXE.absent = out.MENJADOR.FIXE.absent ?? config.pricing.menjador.fixe.absent;
  out.MENJADOR.FIXE.justificat = out.MENJADOR.FIXE.justificat ?? config.pricing.menjador.fixe.justificat;
  out.MENJADOR.ESPORADIC.present = out.MENJADOR.ESPORADIC.present ?? config.pricing.menjador.esporadic.present;
  out.ACOLLIDA.ESPORADIC.present = out.ACOLLIDA.ESPORADIC.present ?? config.pricing.acollida.esporadic.present;

  return out;
}

async function loadTenantPricing(tenantId) {
  if (!tenantId) return null;
  const cached = cache.get(keyFor(tenantId));
  if (cached) return cached;

  const rows = await TenantPriceConfig.findAll({
    where: { tenant_id: tenantId, is_active: true },
    order: [['updated_at', 'DESC']]
  });

  const pricing = normalizePricing(rows);
  cache.set(keyFor(tenantId), pricing);
  return pricing;
}

function invalidateTenantPricing(tenantId) {
  cache.del(keyFor(tenantId));
}

module.exports = {
  loadTenantPricing,
  invalidateTenantPricing
};
