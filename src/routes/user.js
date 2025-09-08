const express = require('express');
const { body, param, query } = require('express-validator');
const AuthMiddleware = require('../middleware/auth');
const TenantMiddleware = require('../middleware/tenant');
const { handleValidation, catchAsync } = require('../middleware/errorHandler');
const { User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware global per routes d'usuaris
router.use(TenantMiddleware.requireTenant);
router.use(TenantMiddleware.validateUserTenant);

/**
 * @route   GET /api/users
 * @desc    Obtenir llista d'usuaris del tenant
 * @access  Private (ADMIN, COORDINADOR)
 */
router.get('/', [
  AuthMiddleware.requireRole('ADMIN', 'COORDINADOR'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pàgina ha de ser un número positiu'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit entre 1 i 100'),
  query('role')
    .optional()
    .isIn(['ADMIN', 'COORDINADOR', 'MONITOR', 'FAMILIA'])
    .withMessage('Rol invàlid'),
  query('search')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Cerca mínim 2 caràcters'),
  handleValidation
], catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { role, search } = req.query;

  const where = {
    tenant_id: req.tenantId
  };

  if (role) {
    where.role = role;
  }

  if (search) {
    const { Op } = require('sequelize');
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
    attributes: { exclude: ['password', 'password_reset_token'] }
  });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir usuari per ID
 * @access  Private
 */
router.get('/:id', [
  param('id')
    .isUUID()
    .withMessage('ID usuari invàlid'),
  handleValidation
], catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verificar permisos
  if (req.user.id !== id && !['ADMIN', 'COORDINADOR'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'No tens permisos per veure aquest usuari'
    });
  }

  const user = await User.findOne({
    where: {
      id,
      tenant_id: req.tenantId
    },
    attributes: { exclude: ['password', 'password_reset_token'] }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuari no trobat'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

/**
 * @route   POST /api/users
 * @desc    Crear nou usuari
 * @access  Private (ADMIN)
 */
router.post('/', [
  AuthMiddleware.requireRole('ADMIN'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email vàlid requerit'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password mínim 6 caràcters'),
  body('first_name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom entre 1 i 100 caràcters'),
  body('last_name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Cognoms entre 1 i 100 caràcters'),
  body('role')
    .isIn(['ADMIN', 'COORDINADOR', 'MONITOR', 'FAMILIA'])
    .withMessage('Rol invàlid'),
  body('phone')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('Telèfon invàlid'),
  handleValidation
], catchAsync(async (req, res) => {
  const userData = {
    ...req.body,
    tenant_id: req.tenantId,
    status: 'active',
    email_verified: true // Admin crea usuaris verificats
  };

  // Verificar que l'email no existeixi
  const existingUser = await User.findOne({
    where: {
      email: userData.email,
      tenant_id: req.tenantId
    }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email ja existeix en aquest centre'
    });
  }

  const user = await User.create(userData);

  logger.logActions.userAction(
    req.user.id,
    'USER_CREATED',
    { created_user_id: user.id, role: user.role },
    req.tenantId
  );

  res.status(201).json({
    success: true,
    message: 'Usuari creat correctament',
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status
      }
    }
  });
}));

/**
 * @route   PUT /api/users/:id
 * @desc    Actualitzar usuari
 * @access  Private
 */
router.put('/:id', [
  param('id')
    .isUUID()
    .withMessage('ID usuari invàlid'),
  body('first_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom entre 1 i 100 caràcters'),
  body('last_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Cognoms entre 1 i 100 caràcters'),
  body('phone')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('Telèfon invàlid'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'COORDINADOR', 'MONITOR', 'FAMILIA'])
    .withMessage('Rol invàlid'),
  handleValidation
], catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verificar permisos
  const canEditOthers = ['ADMIN'].includes(req.user.role);
  const canEditRole = ['ADMIN'].includes(req.user.role);

  if (id !== req.user.id && !canEditOthers) {
    return res.status(403).json({
      success: false,
      message: 'No tens permisos per editar aquest usuari'
    });
  }

  if (req.body.role && !canEditRole) {
    return res.status(403).json({
      success: false,
      message: 'No tens permisos per canviar rols'
    });
  }

  const user = await User.findOne({
    where: {
      id,
      tenant_id: req.tenantId
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuari no trobat'
    });
  }

  // Actualitzar camps permesos
  const allowedFields = ['first_name', 'last_name', 'phone', 'language', 'notification_settings'];
  if (canEditRole) {
    allowedFields.push('role', 'status');
  }

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  await user.update(updateData);

  logger.logActions.dataChange(
    req.user.id,
    'User',
    user.id,
    updateData,
    req.tenantId
  );

  res.json({
    success: true,
    message: 'Usuari actualitzat correctament',
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        phone: user.phone
      }
    }
  });
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuari (soft delete)
 * @access  Private (ADMIN)
 */
router.delete('/:id', [
  AuthMiddleware.requireRole('ADMIN'),
  param('id')
    .isUUID()
    .withMessage('ID usuari invàlid'),
  handleValidation
], catchAsync(async (req, res) => {
  const { id } = req.params;

  // No permetre eliminar-se a si mateix
  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'No pots eliminar el teu propi usuari'
    });
  }

  const user = await User.findOne({
    where: {
      id,
      tenant_id: req.tenantId
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuari no trobat'
    });
  }

  await user.destroy(); // Soft delete

  logger.logActions.userAction(
    req.user.id,
    'USER_DELETED',
    { deleted_user_id: user.id, deleted_user_email: user.email },
    req.tenantId
  );

  res.json({
    success: true,
    message: 'Usuari eliminat correctament'
  });
}));

module.exports = router;
