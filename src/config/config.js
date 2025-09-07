const path = require('path');

// Configuració general de l'aplicació
const config = {
  // Configuració de la app
  app: {
    name: 'MouT Serveis - Gestió Escolar',
    version: require('../../package.json').version,
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`
  },

  // Configuració JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  },

  // Configuració de sessió
  session: {
    secret: process.env.SESSION_SECRET || 'default_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hores
    }
  },

  // Configuració d'uploads
  upload: {
    path: process.env.UPLOAD_PATH || './storage/uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx').split(',')
  },

  // Configuració d'email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@moutserveis.cat'
  },

  // Configuració multi-tenant
  tenant: {
    cacheTTL: parseInt(process.env.TENANT_CACHE_TTL) || 3600, // 1 hora
    defaultPlan: process.env.DEFAULT_TENANT_PLAN || 'basic',
    codeLength: 5, // Longitud codis escola (M5544, E128)
    codePattern: /^[A-Z]\d{3,4}$/ // Pattern validació codis
  },

  // Configuració rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Configuració de preus (en cèntims d'euro)
  pricing: {
    menjador: {
      fixe: {
        present: parseInt(process.env.MENJADOR_FIXE_PRESENT) || 754, // 7.54€
        absent: parseInt(process.env.MENJADOR_FIXE_ABSENT) || 386,   // 3.86€
        justificat: parseInt(process.env.MENJADOR_FIXE_JUSTIFICAT) || 0 // 0€
      },
      esporadic: {
        present: parseInt(process.env.MENJADOR_ESPORADIC_PRESENT) || 829 // 8.29€
      }
    },
    acollida: {
      esporadic: {
        present: parseInt(process.env.ACOLLIDA_ESPORADIC_PRESENT) || 450 // 4.50€
      }
    }
  },

  // Configuració de beques (percentatges de descompte)
  beques: {
    BC100: parseInt(process.env.BECA_BC100) || 100, // 100% descompte
    BC70: parseInt(process.env.BECA_BC70) || 70     // 70% descompte
  },

  // Configuració de rols i permisos
  roles: {
    SUPER_ADMIN: {
      level: 5,
      name: 'Super Administrador',
      permissions: ['all']
    },
    ADMIN: {
      level: 4,
      name: 'Administrador',
      permissions: ['manage_users', 'manage_contracts', 'view_reports', 'manage_settings']
    },
    COORDINADOR: {
      level: 3,
      name: 'Coordinador',
      permissions: ['manage_attendance', 'view_reports', 'manage_menus']
    },
    MONITOR: {
      level: 2,
      name: 'Monitor',
      permissions: ['manage_attendance', 'view_students', 'chat']
    },
    FAMILIA: {
      level: 1,
      name: 'Família',
      permissions: ['view_own_data', 'chat', 'view_invoices']
    }
  },

  // Configuració de logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    datePattern: 'YYYY-MM-DD',
    dirname: path.join(__dirname, '../../logs')
  },

  // Configuració Socket.io
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
    pingTimeout: 60000,
    pingInterval: 25000
  },

  // Configuració de tasques programades
  cron: {
    dailyReports: '0 23 * * *', // Cada dia a les 23:00
    weeklyInvoices: '0 0 * * 1', // Cada dilluns a les 00:00
    monthlyBackup: '0 2 1 * *'   // Primer dia del mes a les 02:00
  },

  // Configuració de cache
  cache: {
    ttl: 300, // 5 minuts
    checkperiod: 60 // Comprovació cada minut
  },

  // Configuració específica per entorn
  development: {
    debugMode: true,
    hotReload: true,
    mockData: true
  },

  production: {
    debugMode: false,
    hotReload: false,
    mockData: false,
    ssl: {
      enabled: false, // Activar si es vol HTTPS
      key: path.join(__dirname, '../ssl/private.key'),
      cert: path.join(__dirname, '../ssl/certificate.crt')
    }
  }
};

module.exports = config;
