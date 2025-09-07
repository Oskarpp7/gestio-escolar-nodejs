const logger = require('../utils/logger');

/**
 * Middleware global per gestió d'errors
 * Captura tots els errors no gestionats i retorna respostes consistents
 */

/**
 * Error personalitzat per l'aplicació
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validació
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR', errors);
  }
}

/**
 * Error de permisos
 */
class PermissionError extends AppError {
  constructor(message = 'Accés denegat') {
    super(message, 403, 'PERMISSION_DENIED');
  }
}

/**
 * Error de tenant
 */
class TenantError extends AppError {
  constructor(message = 'Centre educatiu no vàlid') {
    super(message, 400, 'TENANT_ERROR');
  }
}

/**
 * Error de negoci
 */
class BusinessError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'BUSINESS_ERROR', details);
  }
}

/**
 * Gestionar errors de Sequelize
 */
const handleSequelizeError = (error) => {
  let message, statusCode, code, details;
  
  switch (error.name) {
    case 'SequelizeValidationError':
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = 'Dades de validació incorrectes';
      details = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      break;
      
    case 'SequelizeUniqueConstraintError':
      statusCode = 409;
      code = 'DUPLICATE_ERROR';
      message = 'El valor ja existeix';
      details = error.errors.map(err => ({
        field: err.path,
        message: `${err.path} ja existeix`,
        value: err.value
      }));
      break;
      
    case 'SequelizeForeignKeyConstraintError':
      statusCode = 400;
      code = 'FOREIGN_KEY_ERROR';
      message = 'Referència invàlida';
      details = {
        table: error.table,
        field: error.fields
      };
      break;
      
    case 'SequelizeConnectionError':
    case 'SequelizeHostNotFoundError':
    case 'SequelizeHostNotReachableError':
      statusCode = 503;
      code = 'DATABASE_ERROR';
      message = 'Error de connexió a la base de dades';
      break;
      
    case 'SequelizeTimeoutError':
      statusCode = 504;
      code = 'DATABASE_TIMEOUT';
      message = 'Temps d\'espera de la base de dades esgotat';
      break;
      
    default:
      statusCode = 500;
      code = 'DATABASE_ERROR';
      message = 'Error de base de dades';
  }
  
  return new AppError(message, statusCode, code, details);
};

/**
 * Gestionar errors de JWT
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Token invàlid', 401, 'INVALID_TOKEN');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token caducat', 401, 'EXPIRED_TOKEN');
  }
  
  return new AppError('Error d\'autenticació', 401, 'AUTH_ERROR');
};

/**
 * Gestionar errors de validació de Express Validator
 */
const handleValidationErrors = (errors) => {
  const details = errors.map(err => ({
    field: err.param,
    message: err.msg,
    value: err.value,
    location: err.location
  }));
  
  return new ValidationError('Errors de validació', details);
};

/**
 * Enviar resposta d'error en desenvolupament
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    code: err.code,
    details: err.details,
    stack: err.stack
  });
};

/**
 * Enviar resposta d'error en producció
 */
const sendErrorProd = (err, res) => {
  // Error operacional, enviar missatge al client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details
    });
  } else {
    // Error de programació, no filtrar detalls
    logger.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      message: 'Alguna cosa ha anat malament!',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware principal de gestió d'errors
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log de l'error
  logger.error(`Error ${err.statusCode || 500}: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous',
    tenant: req.tenant ? req.tenant.code : 'no-tenant',
    stack: err.stack
  });
  
  // Gestionar diferents tipus d'errors
  if (err.name && err.name.startsWith('Sequelize')) {
    error = handleSequelizeError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'CastError') {
    error = new AppError('Recurs no trobat', 404, 'NOT_FOUND');
  } else if (err.code === 11000) {
    // Error de duplicat de MongoDB (si s'usa)
    error = new AppError('Valor duplicat', 409, 'DUPLICATE_ERROR');
  }
  
  // Assegurar que sempre tenim un statusCode
  if (!error.statusCode) {
    error.statusCode = 500;
  }
  
  // Enviar resposta segons entorn
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Middleware per capturar routes no trobades
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(
    `Ruta ${req.originalUrl} no trobada`, 
    404, 
    'ROUTE_NOT_FOUND'
  );
  next(err);
};

/**
 * Wrapper per funcions async per capturar errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Validar que no hi hagi errors de validació de Express Validator
 */
const handleValidation = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const err = handleValidationErrors(errors.array());
    return next(err);
  }
  
  next();
};

module.exports = {
  // Classes d'error
  AppError,
  ValidationError,
  PermissionError,
  TenantError,
  BusinessError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  catchAsync,
  handleValidation,
  
  // Utilitats
  handleSequelizeError,
  handleJWTError,
  handleValidationErrors
};
