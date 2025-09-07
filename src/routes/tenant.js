const express = require('express');
const { body, param, query } = require('express-validator');
const { handleValidation, catchAsync } = require('../middleware/errorHandler');
const { Tenant } = require('../models');
const TenantMiddleware = require('../middleware/tenant');

const router = express.Router();

/**
 * @route   GET /api/tenant/verify/:code
 * @desc    Verificar que un codi de centre existeixi i estigui actiu
 * @access  Public
 */
router.get('/verify/:code', [
  param('code')
    .isLength({ min: 3, max: 10 })
    .matches(/^[A-Z0-9]+$/i)
    .withMessage('Codi de centre invàlid'),
  handleValidation
], catchAsync(async (req, res) => {
  const { code } = req.params;

  const tenant = await Tenant.findByCode(code);

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Centre educatiu no trobat'
    });
  }

  if (!tenant.isActive()) {
    return res.status(403).json({
      success: false,
      message: 'Centre educatiu inactiu'
    });
  }

  res.json({
    success: true,
    data: {
      tenant: {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        short_name: tenant.short_name,
        logo_url: tenant.logo_url,
        theme_colors: tenant.theme_colors
      }
    }
  });
}));

/**
 * @route   GET /api/tenant/info
 * @desc    Obtenir informació del tenant actual (amb middleware)
 * @access  Public (però requereix tenant_code)
 */
router.get('/info', [
  TenantMiddleware.requireTenant
], catchAsync(async (req, res) => {
  const tenant = req.tenant;

  res.json({
    success: true,
    data: {
      tenant: {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        short_name: tenant.short_name,
        description: tenant.description,
        logo_url: tenant.logo_url,
        theme_colors: tenant.theme_colors,
        contact_email: tenant.contact_email,
        contact_phone: tenant.contact_phone,
        address: tenant.address,
        plan: tenant.plan,
        settings: tenant.settings
      }
    }
  });
}));

module.exports = router;
