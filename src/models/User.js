const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Model User - Usuaris del sistema amb sistema multi-tenant
 * Inclou tots els rols: SUPER_ADMIN, ADMIN, COORDINADOR, MONITOR, FAMILIA
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Relació amb tenant (null per SUPER_ADMIN)
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: true, // SUPER_ADMIN no té tenant
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  
  // Dades d'accés
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: 'email_tenant', // Únic per tenant
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  
  // Rol de l'usuari
  role: {
    type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'MONITOR', 'FAMILIA'),
    allowNull: false,
    defaultValue: 'FAMILIA'
  },
  
  // Dades personals
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  
  // DNI/NIE (opcional)
  dni: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i // Format DNI espanyol
    }
  },
  
  // Telèfon
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Telèfon mòbil
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Avatar/foto de perfil
  avatar_url: {
    type: DataTypes.STRING(500),
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
  
  // Preferències d'idioma
  language: {
    type: DataTypes.STRING(5),
    defaultValue: 'ca',
    allowNull: false
  },
  
  // Zona horària
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Europe/Madrid',
    allowNull: false
  },
  
  // Estat de l'usuari
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'suspended'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Email verificat
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Data de verificació d'email
  email_verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Token de verificació d'email
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Token per reset password
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Expiració token reset password
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Últim login
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // IP última connexió
  last_login_ip: {
    type: DataTypes.STRING(45), // Suporta IPv6
    allowNull: true
  },
  
  // Configuració de notificacions
  notification_settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      chat_notifications: true,
      attendance_notifications: true,
      invoice_notifications: true
    }
  },
  
  // Permisos addicionals específics
  custom_permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  
  // Metadata addicional
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  
  // Data de creació
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
  tableName: 'users',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['email', 'tenant_id'],
      name: 'email_tenant'
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['email_verification_token']
    },
    {
      fields: ['password_reset_token']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      // Hash password
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      
      // Normalitzar email
      if (user.email) {
        user.email = user.email.toLowerCase().trim();
      }
      
      // Generar token de verificació
      if (!user.email_verification_token) {
        user.email_verification_token = require('crypto').randomBytes(32).toString('hex');
      }
    },
    
    beforeUpdate: async (user) => {
      // Hash password si ha canviat
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      
      // Normalitzar email
      if (user.changed('email') && user.email) {
        user.email = user.email.toLowerCase().trim();
      }
    }
  }
});

// Mètodes d'instància
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`.trim();
};

User.prototype.isActive = function() {
  return this.status === 'active' && this.email_verified;
};

User.prototype.hasRole = function(role) {
  return this.role === role;
};

User.prototype.hasPermission = function(permission) {
  // SUPER_ADMIN té tots els permisos
  if (this.role === 'SUPER_ADMIN') return true;
  
  // Permisos per rol
  const rolePermissions = {
    ADMIN: ['manage_users', 'manage_contracts', 'view_reports', 'manage_settings', 'chat'],
    COORDINADOR: ['manage_attendance', 'view_reports', 'manage_menus', 'chat'],
    MONITOR: ['manage_attendance', 'view_students', 'chat'],
    FAMILIA: ['view_own_data', 'chat', 'view_invoices']
  };
  
  const permissions = rolePermissions[this.role] || [];
  return permissions.includes(permission) || this.custom_permissions?.includes(permission);
};

User.prototype.canAccessTenant = function(tenantId) {
  if (this.role === 'SUPER_ADMIN') return true;
  return this.tenant_id === tenantId;
};

User.prototype.generatePasswordResetToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.password_reset_token = token;
  this.password_reset_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hores
  return token;
};

User.prototype.generateEmailVerificationToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.email_verification_token = token;
  return token;
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.password_reset_token;
  delete values.email_verification_token;
  return values;
};

// Mètodes estàtics
User.findByEmail = async function(email, tenantId = null) {
  return await this.findOne({
    where: { 
      email: email.toLowerCase().trim(),
      tenant_id: tenantId,
      status: 'active'
    }
  });
};

User.findByTenant = async function(tenantId, options = {}) {
  return await this.findAll({
    where: { 
      tenant_id: tenantId,
      ...options.where
    },
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
    ...options
  });
};

module.exports = User;
