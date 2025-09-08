const express = require('express');
const { param } = require('express-validator');
const { handleValidation, catchAsync } = require('../middleware/errorHandler');
const { Tenant } = require('../models');
const TenantMiddleware = require('../middleware/tenant');
const AuthMiddleware = require('../middleware/auth');

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

/**
 * RUTES PROTEGIDES (llistat de centres)
 */

/**
 * @route   GET /api/tenant/list
 * @desc    Llistar centres actius
 * @access  Privat (SUPER_ADMIN veu tots; altres només el seu)
 */
router.get('/list', [
  AuthMiddleware.verifyToken
], catchAsync(async (req, res) => {
  let tenants
  if (req.user.role === 'SUPER_ADMIN') {
    tenants = await Tenant.getActiveTenants()
  } else {
    // Retornar només el tenant de l'usuari
    tenants = []
    const me = await Tenant.findByPk(req.user.tenant_id)
    if (me && me.isActive()) tenants.push(me)
  }

  res.json({
    success: true,
    data: tenants.map(t => ({ id: t.id, code: t.code, name: t.name, short_name: t.short_name }))
  })
}));
