const express = require('express');
const { body } = require('express-validator');
const AuthMiddleware = require('../middleware/auth');
const { handleValidation, catchAsync } = require('../middleware/errorHandler');
const { User, Tenant } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuari amb email i password
 * @access  Public
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email vàlid requerit'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password mínim 6 caràcters'),
  body('tenant_code')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Codi de centre entre 3 i 10 caràcters'),
  handleValidation
], catchAsync(async (req, res) => {
  const { email, password, tenant_code } = req.body;

  // Buscar usuari per email
  let user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{
      model: Tenant,
      as: 'tenant'
    }]
  });

  if (!user) {
    logger.logActions.userLogin(null, email, req.ip, req.get('User-Agent'), false);
    return res.status(401).json({
      success: false,
      message: 'Credencials incorrectes'
    });
  }

  // Verificar password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    logger.logActions.userLogin(user.id, email, req.ip, req.get('User-Agent'), false, user.tenant_id);
    return res.status(401).json({
      success: false,
      message: 'Credencials incorrectes'
    });
  }

  // Verificar que l'usuari estigui actiu
  if (!user.isActive()) {
    return res.status(401).json({
      success: false,
      message: 'Compte inactiu. Contacti amb l\'administrador.'
    });
  }

  // Si es proporciona tenant_code, verificar que coincideixi
  if (tenant_code && user.role !== 'SUPER_ADMIN') {
    if (!user.tenant || user.tenant.code.toUpperCase() !== tenant_code.toUpperCase()) {
      return res.status(401).json({
        success: false,
        message: 'Codi de centre incorrecte'
      });
    }
  }

  // Verificar tenant actiu
  if (user.tenant && !user.tenant.isActive()) {
    return res.status(401).json({
      success: false,
      message: 'Centre educatiu inactiu'
    });
  }

  // Generar tokens
  const token = AuthMiddleware.generateToken(user);
  const refreshToken = AuthMiddleware.generateRefreshToken(user);

  // Actualitzar últim login
  user.last_login_at = new Date();
  user.last_login_ip = req.ip;
  await user.save();

  // Log successful login
  logger.logActions.userLogin(user.id, email, req.ip, req.get('User-Agent'), true, user.tenant_id);

  res.json({
    success: true,
    message: 'Login exitós',
    data: {
      token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar_url: user.avatar_url,
        tenant: user.tenant ? {
          id: user.tenant.id,
          code: user.tenant.code,
          name: user.tenant.name,
          plan: user.tenant.plan
        } : null
      }
    }
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token d'accés
 * @access  Public
 */
router.post('/refresh', [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token requerit'),
  handleValidation
], catchAsync(async (req, res) => {
  const { refresh_token } = req.body;

  try {
    const user = await AuthMiddleware.verifyRefreshToken(refresh_token);
    
    const newToken = AuthMiddleware.generateToken(user);
    const newRefreshToken = AuthMiddleware.generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        token: newToken,
        refresh_token: newRefreshToken
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token invàlid'
    });
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Fer logout (invalidar tokens)
 * @access  Private
 */
router.post('/logout', AuthMiddleware.verifyToken, catchAsync(async (req, res) => {
  // TODO: Implementar blacklist de tokens si cal
  
  logger.logActions.userAction(req.user.id, 'LOGOUT', {}, req.tenantId);

  res.json({
    success: true,
    message: 'Logout exitós'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir informació de l'usuari actual
 * @access  Private
 */
router.get('/me', AuthMiddleware.verifyToken, catchAsync(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{
      model: Tenant,
      as: 'tenant',
      attributes: ['id', 'code', 'name', 'plan', 'settings']
    }]
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar_url: user.avatar_url,
        phone: user.phone,
        language: user.language,
        notification_settings: user.notification_settings,
        tenant: user.tenant ? {
          id: user.tenant.id,
          code: user.tenant.code,
          name: user.tenant.name,
          plan: user.tenant.plan,
          settings: user.tenant.settings
        } : null
      }
    }
  });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Sol·licitar reset de password
 * @access  Public
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email vàlid requerit'),
  body('tenant_code')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Codi de centre entre 3 i 10 caràcters'),
  handleValidation
], catchAsync(async (req, res) => {
  const { email, tenant_code } = req.body;

  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{
      model: Tenant,
      as: 'tenant'
    }]
  });

  // Sempre retornar èxit per seguretat (no exposar si l'email existeix)
  if (!user) {
    return res.json({
      success: true,
      message: 'Si l\'email existeix, rebràs un correu amb instruccions'
    });
  }

  // Verificar tenant si es proporciona
  if (tenant_code && user.tenant && user.tenant.code.toUpperCase() !== tenant_code.toUpperCase()) {
    return res.json({
      success: true,
      message: 'Si l\'email existeix, rebràs un correu amb instruccions'
    });
  }

  // Generar token de reset
  user.generatePasswordResetToken();
  await user.save();

  // TODO: Enviar email amb token de reset
  // await EmailService.sendPasswordReset(user.email, resetToken);

  logger.logActions.userAction(user.id, 'PASSWORD_RESET_REQUESTED', { email }, user.tenant_id);

  res.json({
    success: true,
    message: 'Si l\'email existeix, rebràs un correu amb instruccions'
  });
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password amb token
 * @access  Public
 */
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Token requerit'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password mínim 6 caràcters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password ha de contenir minúscules, majúscules i números'),
  handleValidation
], catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    where: {
      password_reset_token: token,
      password_reset_expires: {
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Token invàlid o caducat'
    });
  }

  // Actualitzar password
  user.password = password; // Es xifrarà automàticament pel hook
  user.password_reset_token = null;
  user.password_reset_expires = null;
  await user.save();

  logger.logActions.userAction(user.id, 'PASSWORD_RESET_COMPLETED', {}, user.tenant_id);

  res.json({
    success: true,
    message: 'Password actualitzat correctament'
  });
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Canviar password (usuari autenticat)
 * @access  Private
 */
router.post('/change-password', [
  AuthMiddleware.verifyToken,
  body('current_password')
    .notEmpty()
    .withMessage('Password actual requerit'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('Password nou mínim 6 caràcters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password nou ha de contenir minúscules, majúscules i números'),
  handleValidation
], catchAsync(async (req, res) => {
  const { current_password, new_password } = req.body;

  const user = await User.findByPk(req.user.id);

  // Verificar password actual
  const isValidCurrentPassword = await user.comparePassword(current_password);
  if (!isValidCurrentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password actual incorrecte'
    });
  }

  // Actualitzar password
  user.password = new_password;
  await user.save();

  logger.logActions.userAction(user.id, 'PASSWORD_CHANGED', {}, req.tenantId);

  res.json({
    success: true,
    message: 'Password canviat correctament'
  });
}));

module.exports = router;
