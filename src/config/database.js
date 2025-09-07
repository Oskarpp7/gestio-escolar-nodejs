const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

let sequelize;

// Configuració de la base de dades segons l'entorn
const dbConfig = {
  dialect: process.env.DB_TYPE || 'sqlite',
  logging: process.env.NODE_ENV === 'development' ? 
    (msg) => logger.debug(msg) : false,
  
  // Configuració general
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  
  // Configuració per optimitzar rendiment
  define: {
    freezeTableName: true,
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft deletes
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },

  // Opcions específiques per cada dialecte
  dialectOptions: {}
};

// Configurar segons el tipus de base de dades
if (process.env.DB_TYPE === 'postgres') {
  // PostgreSQL per producció
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      ...dbConfig,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialectOptions: {
        ...dbConfig.dialectOptions,
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    }
  );
} else if (process.env.DB_TYPE === 'mysql') {
  // MySQL/MariaDB com alternativa
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      ...dbConfig,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialectOptions: {
        ...dbConfig.dialectOptions,
        charset: 'utf8mb4'
      }
    }
  );
} else {
  // SQLite per desenvolupament
  sequelize = new Sequelize({
    ...dbConfig,
    storage: process.env.DB_SQLITE_PATH || './database/development.sqlite',
    dialectOptions: {
      ...dbConfig.dialectOptions
    }
  });
}

// Test de connexió
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ Connexió a base de dades ${process.env.DB_TYPE || 'sqlite'} establerta`);
    return true;
  } catch (error) {
    logger.error('❌ Error connectant a la base de dades:', error);
    return false;
  }
};

// Funció per inicialitzar la base de dades
const initializeDatabase = async () => {
  try {
    // Test connexió
    const connected = await testConnection();
    if (!connected) {
      throw new Error('No es pot establir connexió amb la base de dades');
    }

    // Sincronitzar models en desenvolupament
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Models sincronitzats amb la base de dades');
    }

    return sequelize;
  } catch (error) {
    logger.error('❌ Error inicialitzant base de dades:', error);
    throw error;
  }
};

// Funció per tancar connexió
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Connexió base de dades tancada correctament');
  } catch (error) {
    logger.error('❌ Error tancant connexió base de dades:', error);
  }
};

// Transaction helper
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Query raw helper amb logging
const queryRaw = async (sql, options = {}) => {
  try {
    logger.debug(`Executant query: ${sql}`);
    const result = await sequelize.query(sql, {
      type: Sequelize.QueryTypes.SELECT,
      ...options
    });
    return result;
  } catch (error) {
    logger.error(`Error executant query: ${sql}`, error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  initializeDatabase,
  testConnection,
  closeConnection,
  withTransaction,
  queryRaw
};
