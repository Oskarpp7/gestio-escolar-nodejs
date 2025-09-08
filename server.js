const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { createServer } = require('http');
const { Server } = require('socket.io');

const config = require('./src/config/config');
const { logger } = require('./src/utils/logger');
const { sequelize } = require('./src/config/database');
const socketHandler = require('./src/socket/socketHandler');

// Importar routes
const authRoutes = require('./src/routes/auth');
const tenantRoutes = require('./src/routes/tenant');
const userRoutes = require('./src/routes/user');
const contractRoutes = require('./src/routes/contract');
const attendanceRoutes = require('./src/routes/attendance');
const chatRoutes = require('./src/routes/chat');
const dashboardRoutes = require('./src/routes/dashboard');
const reportRoutes = require('./src/routes/report');
const pricingRoutes = require('./src/routes/pricing');

// Middleware personalitzat
const tenantMiddleware = require('./src/middleware/tenant');
const authMiddleware = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const server = createServer(app);

// Configurar Socket.io amb CORS
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minuts
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Massa peticions des d\'aquesta IP, prova més tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Session store amb Sequelize
// En tests usamos MemoryStore para simplificar; en otros entornos SequelizeStore
const sessionStore = process.env.NODE_ENV === 'test'
  ? new session.MemoryStore()
  : new SequelizeStore({ db: sequelize });

// Middleware de seguretat
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(compression());
app.use(limiter);

// CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permetre requests sense origin (aplicacions mòbils, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', // Vue dev server
      'http://localhost:3000', // Express server
      'https://yourdomain.com' // Domini producció
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permès per CORS'));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessió
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hores
  }
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Middleware multi-tenant (aplicar abans de les routes)
app.use('/api', tenantMiddleware.extractTenant);

// Routes públiques (sense autenticació)
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);

// Routes protegides (amb autenticació)
app.use('/api/users', authMiddleware.verifyToken, userRoutes);
app.use('/api/contracts', authMiddleware.verifyToken, contractRoutes);
app.use('/api/attendance', authMiddleware.verifyToken, attendanceRoutes);
app.use('/api/chat', authMiddleware.verifyToken, chatRoutes);
app.use('/api/dashboard', authMiddleware.verifyToken, dashboardRoutes);
app.use('/api/reports', authMiddleware.verifyToken, reportRoutes);
app.use('/api/pricing', authMiddleware.verifyToken, pricingRoutes);

// Servir fitxers estàtics (uploads)
app.use('/uploads', express.static('storage/uploads'));

// Servir el frontend Vue.js en producció
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Route de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version
  });
});

// Error handling
app.use(errorHandler);

// Socket.io handling
socketHandler(io);

// Inicialització del servidor
async function startServer() {
  try {
    // Sincronitzar base de dades
    await sequelize.authenticate();
    logger.info('✅ Connexió a base de dades establerta correctament');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Models de base de dades sincronitzats');
    }
    
    // Sincronitzar session store quan apliqui
    if (typeof sessionStore.sync === 'function') {
      await sessionStore.sync();
    }
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`🚀 Servidor funcionant al port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔒 Mode base de dades: ${process.env.DB_TYPE}`);
    });
    
  } catch (error) {
    logger.error('❌ Error iniciant servidor:', error);
    process.exit(1);
  }
}

// Gestió d'errors no capturats
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM rebut, tancant servidor...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT rebut, tancant servidor...');
  await sequelize.close();
  process.exit(0);
});

// Iniciar servidor si aquest fitxer s'executa directament
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
