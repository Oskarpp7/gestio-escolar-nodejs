process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'session_test_secret';
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';

const { sequelize } = require('../src/config/database');

beforeAll(async () => {
  // Sincronizar todos los modelos en la DB en memoria
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
