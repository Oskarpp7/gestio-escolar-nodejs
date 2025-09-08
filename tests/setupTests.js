process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-1234567890';
process.env.SESSION_SECRET = 'session_test_secret';
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';

const { sequelize } = require('../src/config/database');

// Timeout global per evitar tests encallats
jest.setTimeout(10000);

beforeAll(async () => {
  // Sincronizar todos los modelos en la DB en memoria
  await sequelize.sync({ force: true });
});

// Cleanup després de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Cleanup final
afterAll(async () => {
  await sequelize.close();
  // Força cleanup de recursos
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 100);
  });
});

// Evitar warnings de connexions obertes
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled rejection:', reason);
});
