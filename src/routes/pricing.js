const express = require('express');
const { body, param } = require('express-validator');
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

    await item.update(req.body);
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
