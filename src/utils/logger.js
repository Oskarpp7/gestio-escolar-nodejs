const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configuració de colors per a cada nivell
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format personalitzat per a logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Afegir metadata si existeix
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Format per a fitxers (sense colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuració de transports
const transports = [];

// Console transport (només en desenvolupament)
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'debug'
    })
  );
}

// File transports amb rotació diària
const logsDir = path.join(__dirname, '../../logs');

// Log general amb rotació
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    format: fileFormat,
    level: process.env.LOG_LEVEL || 'info'
  })
);

// Log només d'errors
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    format: fileFormat,
    level: 'error'
  })
);

// Log d'auditoria (per accions crítiques)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '90d',
    format: fileFormat,
    level: 'info'
  })
);

// Crear el logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports,
  
  // No sortir en cas d'error de logging
  exitOnError: false,
  
  // Gestionar exceptions no capturades
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat
    })
  ],
  
  // Gestionar rejections no capturades
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat
    })
  ]
});

// Logger específic per auditoria
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

// Logger per a requests HTTP
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Funcions d'utilitat per logging específic
const logActions = {
  
  // Log d'accions d'usuari
  userAction: (userId, action, details = {}, tenantId = null) => {
    auditLogger.info('USER_ACTION', {
      userId,
      tenantId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log d'accés al sistema
  userLogin: (userId, email, ip, userAgent, success = true, tenantId = null) => {
    auditLogger.info('USER_LOGIN', {
      userId,
      email,
      tenantId,
      ip,
      userAgent,
      success,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log de canvis en dades sensibles
  dataChange: (userId, entity, entityId, changes, tenantId = null) => {
    auditLogger.info('DATA_CHANGE', {
      userId,
      tenantId,
      entity,
      entityId,
      changes,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log d'errors de negoci
  businessError: (error, context = {}) => {
    logger.error('BUSINESS_ERROR', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log de facturació
  billing: (action, details, tenantId = null, userId = null) => {
    auditLogger.info('BILLING_ACTION', {
      action,
      details,
      tenantId,
      userId,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log de chat
  chatMessage: (roomId, senderId, messageType, tenantId) => {
    logger.info('CHAT_MESSAGE', {
      roomId,
      senderId,
      messageType,
      tenantId,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log de performance
  performance: (operation, duration, details = {}) => {
    if (duration > 1000) { // Log només operacions lentes (>1s)
      logger.warn('SLOW_OPERATION', {
        operation,
        duration,
        details,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Log de requests HTTP
  httpRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.id : null,
      tenantId: req.tenantId || null,
      timestamp: new Date().toISOString()
    };
    
    httpLogger.http('HTTP_REQUEST', logData);
  }
};

// Middleware per logging automàtic de requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logActions.httpRequest(req, res, duration);
  });
  
  next();
};

// Funcions d'utilitat
const utils = {
  
  // Configurar logger per testing
  setupTestLogger: () => {
    logger.transports.forEach(transport => {
      transport.silent = true;
    });
  },
  
  // Restaurar logger després de testing  
  restoreLogger: () => {
    logger.transports.forEach(transport => {
      transport.silent = false;
    });
  },
  
  // Obtenir estadístiques de logs
  getLogStats: async () => {
    const fs = require('fs').promises;
    const stats = {};
    
    try {
      const files = await fs.readdir(logsDir);
      
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stat = await fs.stat(filePath);
          stats[file] = {
            size: stat.size,
            modified: stat.mtime,
            created: stat.birthtime
          };
        }
      }
    } catch (error) {
      logger.error('Error getting log stats:', error);
    }
    
    return stats;
  },
  
  // Netejar logs antics
  cleanOldLogs: async (daysOld = 30) => {
    const fs = require('fs').promises;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    try {
      const files = await fs.readdir(logsDir);
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning old logs:', error);
    }
  }
};

// Exportar logger i utilitats
module.exports = {
  logger,
  auditLogger,
  httpLogger,
  logActions,
  requestLogger,
  utils
};

// Per compatibilitat, exportar logger com a default
module.exports.default = logger;
