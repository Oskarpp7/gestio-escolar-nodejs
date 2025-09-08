const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model TenantPriceConfig
 * Configuració de preus per centre (tenant) i servei/modalitat.
 * Tots els imports monetaris són en cèntims d'euro per evitar problemes de decimals.
 */
const TenantPriceConfig = sequelize.define('TenantPriceConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Relació amb tenant (centre)
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  },

  // Tipus de servei: MENJADOR o ACOLLIDA
  service_type: {
    type: DataTypes.ENUM('MENJADOR', 'ACOLLIDA'),
    allowNull: false
  },

  // Modalitat del contracte: FIXE o ESPORADIC
  contract_type: {
    type: DataTypes.ENUM('FIXE', 'ESPORADIC'),
    allowNull: false
  },

  // Subtipus només per ACOLLIDA (MATI/TARDA). Pot ser null
  subtype: {
    type: DataTypes.ENUM('MATI', 'TARDA'),
    allowNull: true
  },

  // Preus (en cèntims d'euro)
  price_present: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  price_absent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  price_justified: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  price_esporadic: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },

  // Descomptes per beques (percentatges 0-100)
  discount_bc70: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 70,
    validate: { min: 0, max: 100 }
  },
  discount_bc100: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
    validate: { min: 0, max: 100 }
  },

  // Finestra de validesa (opcional)
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  valid_to: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // Activa/inactiva
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  // Metadata i notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tenant_price_configs',
  paranoid: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['service_type', 'contract_type'] },
    { fields: ['is_active'] },
  ],
  validate: {
    // Si és MENJADOR+FIXE, cal com a mínim present/absent/justificat
    fields_consistency() {
      if (this.service_type === 'MENJADOR' && this.contract_type === 'FIXE') {
        if (this.price_present == null || this.price_absent == null || this.price_justified == null) {
          throw new Error('Per MENJADOR/FIXE cal definir present, absent i justificat');
        }
      }
    }
  }
});

module.exports = TenantPriceConfig;
