const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Tenant - Centres educatius amb sistema multi-tenant
 * Cada tenant representa una escola amb el seu codi únic
 */
const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Codi únic d'accés (M5544, E128, etc.)
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[A-Z0-9]{3,10}$/i, // Lletres i números, 3-10 caràcters
      notEmpty: true
    }
  },
  
  // Nom del centre
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  
  // Nom curt per mostrar
  short_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Descripció del centre
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Configuració específica del tenant (JSON)
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'ca',
      academic_year_start: 9, // Setembre
      academic_year_end: 6,   // Juny
      meal_service: true,
      aftercare_service: true,
      chat_enabled: true,
      reports_enabled: true
    }
  },
  
  // Contacte
  contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Adreça
  address: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      street: '',
      city: '',
      postal_code: '',
      province: '',
      country: 'ES'
    }
  },
  
  // Pla de subscripció
  plan: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    defaultValue: 'basic',
    allowNull: false
  },
  
  // Límits del pla
  limits: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      max_users: 100,
      max_students: 500,
      max_storage_mb: 1000,
      features: ['basic_reports', 'chat', 'attendance']
    }
  },
  
  // Estat del tenant
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial'),
    defaultValue: 'active',
    allowNull: false
  },
  
  // Data de venciment de la subscripció
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Metadata addicional
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  
  // Configuració de preus personalitzada
  custom_pricing: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  
  // Logo del centre (URL)
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // Colors corporatius
  theme_colors: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#10B981'
    }
  },
  
  // Zona horària
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Europe/Madrid',
    allowNull: false
  },
  
  // Data de creació del tenant
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Última actualització
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Soft delete
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tenants',
  paranoid: true, // Soft deletes
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['status']
    },
    {
      fields: ['plan']
    },
    {
      fields: ['expires_at']
    }
  ],
  hooks: {
    beforeValidate: (tenant) => {
      // Convertir codi a majúscules
      if (tenant.code) {
        tenant.code = tenant.code.toUpperCase().trim();
      }
      
      // Generar short_name si no existeix
      if (!tenant.short_name && tenant.name) {
        tenant.short_name = tenant.name.substring(0, 50);
      }
    },
    
    beforeCreate: (tenant) => {
      // Validar codi únic
      if (!tenant.code) {
        throw new Error('El codi del centre és obligatori');
      }
    }
  }
});

// Mètodes d'instància
Tenant.prototype.isActive = function() {
  return this.status === 'active' && 
         (!this.expires_at || new Date() < this.expires_at);
};

Tenant.prototype.canUseFeature = function(feature) {
  if (!this.isActive()) return false;
  return this.limits?.features?.includes(feature) || this.plan === 'enterprise';
};

Tenant.prototype.getRemainingStorage = function() {
  // TODO: Implementar càlcul d'espai utilitzat
  return this.limits?.max_storage_mb || 0;
};

// Mètodes estàtics
Tenant.findByCode = async function(code) {
  if (!code) return null;
  
  return await this.findOne({
    where: { 
      code: code.toUpperCase().trim(),
      status: 'active'
    }
  });
};

Tenant.getActiveTenants = async function() {
  return await this.findAll({
    where: { 
      status: 'active' 
    },
    order: [['name', 'ASC']]
  });
};

module.exports = Tenant;
