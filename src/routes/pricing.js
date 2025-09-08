const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { TenantPriceConfig } = require('../models');
const { loadTenantPricing, invalidateTenantPricing } = require('../services/pricingService');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: Validar accés (ADMIN i SUPER_ADMIN)
const requireAdmin = auth.requireRole('SUPER_ADMIN', 'ADMIN');

// GET: Obtenir configuració de preus efectiva per tenant
router.get('/tenant/:tenantId', auth.verifyToken, auth.requireTenantAccess, async (req, res) => {
  try {
    const pricing = await loadTenantPricing(req.params.tenantId);
    return res.json({ success: true, pricing });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error obtenint preus', error: err.message });
  }
});

// GET: Llistar registres de configuració (paginat)
router.get('/', auth.verifyToken, requireAdmin, [
  query('tenant_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { tenant_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;
    if (req.user.role !== 'SUPER_ADMIN') where.tenant_id = req.tenantId;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await TenantPriceConfig.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    return res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error llistant configuracions', error: err.message });
  }
});

// POST: Crear un registre de configuració
router.post('/', auth.verifyToken, requireAdmin, [
  body('tenant_id').isUUID(),
  body('service_type').isIn(['MENJADOR', 'ACOLLIDA']),
  body('contract_type').isIn(['FIXE', 'ESPORADIC']),
  body('subtype').optional().isIn(['MATI', 'TARDA']),
  body('price_present').optional().isInt({ min: 0 }),
  body('price_absent').optional().isInt({ min: 0 }),
  body('price_justified').optional().isInt({ min: 0 }),
  body('price_esporadic').optional().isInt({ min: 0 }),
  body('discount_bc70').optional().isInt({ min: 0, max: 100 }),
  body('discount_bc100').optional().isInt({ min: 0, max: 100 })
], async (req, res) => {
  try {
    // Si no és SUPER_ADMIN, forçar tenant_id de l'usuari
    const payload = { ...req.body };
    if (req.user.role !== 'SUPER_ADMIN') payload.tenant_id = req.tenantId;

    // Validació de negoci: per MENJADOR, ESPORADIC.present > FIXE.present
    if (payload.service_type === 'MENJADOR') {
      if (payload.contract_type === 'ESPORADIC' && payload.price_esporadic != null && payload.price_present != null) {
        if (payload.price_esporadic <= payload.price_present) {
          return res.status(400).json({ success: false, message: 'El preu esporàdic ha de ser superior al preu fixe present' });
        }
      }
    }

    const created = await TenantPriceConfig.create(payload);
    invalidateTenantPricing(created.tenant_id);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// PUT: Actualitzar
router.put('/:id', auth.verifyToken, requireAdmin, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const item = await TenantPriceConfig.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'No trobat' });

    // Restringir a tenant propi si no és SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN' && item.tenant_id !== req.tenantId) {
      return res.status(403).json({ success: false, message: 'Accés denegat' });
    }

    // Validació de negoci similar a POST
    const nextPayload = { ...req.body };
    const candidate = { ...item.toJSON(), ...nextPayload };
    if (candidate.service_type === 'MENJADOR') {
      const fixePresent = candidate.price_present;
      const espPresent = candidate.price_esporadic;
      if (candidate.contract_type === 'ESPORADIC' && espPresent != null && fixePresent != null) {
        if (espPresent <= fixePresent) {
          return res.status(400).json({ success: false, message: 'El preu esporàdic ha de ser superior al preu fixe present' });
        }
      }
    }

    await item.update(nextPayload);
    invalidateTenantPricing(item.tenant_id);
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE: Inactivar/soft delete
router.delete('/:id', auth.verifyToken, requireAdmin, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const item = await TenantPriceConfig.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'No trobat' });

    if (req.user.role !== 'SUPER_ADMIN' && item.tenant_id !== req.tenantId) {
      return res.status(403).json({ success: false, message: 'Accés denegat' });
    }

    await item.destroy();
    invalidateTenantPricing(item.tenant_id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
