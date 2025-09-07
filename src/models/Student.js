const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Student - Estudiants del centre
 * Relacionats amb famílies i contractes
 */
const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Relació amb tenant
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
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
  
  // Data de naixement
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Curs acadèmic
  academic_year: {
    type: DataTypes.STRING(20),
    allowNull: false, // P3, P4, P5, 1ESO, 2ESO, etc.
  },
  
  // Classe/grup
  class_group: {
    type: DataTypes.STRING(50),
    allowNull: true // A, B, C, etc.
  },
  
  // Codi intern de l'estudiant
  student_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Foto de l'estudiant
  photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // Al·lèrgies i intoleràncies
  allergies: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  
  // Necessitats dietètiques
  dietary_requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      vegetarian: false,
      vegan: false,
      gluten_free: false,
      lactose_free: false,
      halal: false,
      kosher: false,
      other: ''
    }
  },
  
  // Observacions mèdiques
  medical_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Contacte d'emergència
  emergency_contact: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      name: '',
      phone: '',
      relationship: ''
    }
  },
  
  // Estat de l'estudiant
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated', 'transferred'),
    defaultValue: 'active',
    allowNull: false
  },
  
  // Data d'alta
  enrollment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Data de baixa
  withdrawal_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Motiu de baixa
  withdrawal_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  tableName: 'students',
  paranoid: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['academic_year', 'class_group']
    },
    {
      fields: ['status']
    },
    {
      fields: ['student_code', 'tenant_id'],
      unique: true,
      name: 'student_code_tenant'
    }
  ]
});

// Mètodes d'instància
Student.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`.trim();
};

Student.prototype.getAge = function() {
  if (!this.birth_date) return null;
  
  const today = new Date();
  const birthDate = new Date(this.birth_date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

Student.prototype.isActive = function() {
  return this.status === 'active';
};

Student.prototype.hasAllergies = function() {
  return this.allergies && this.allergies.length > 0;
};

Student.prototype.hasDietaryRequirements = function() {
  if (!this.dietary_requirements) return false;
  
  const requirements = this.dietary_requirements;
  return requirements.vegetarian || 
         requirements.vegan || 
         requirements.gluten_free || 
         requirements.lactose_free || 
         requirements.halal || 
         requirements.kosher || 
         (requirements.other && requirements.other.trim() !== '');
};

// Mètodes estàtics
Student.findByTenant = async function(tenantId, options = {}) {
  return await this.findAll({
    where: { 
      tenant_id: tenantId,
      status: 'active',
      ...options.where
    },
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
    ...options
  });
};

Student.findByClass = async function(tenantId, academicYear, classGroup = null) {
  const where = { 
    tenant_id: tenantId,
    academic_year: academicYear,
    status: 'active'
  };
  
  if (classGroup) {
    where.class_group = classGroup;
  }
  
  return await this.findAll({
    where,
    order: [['last_name', 'ASC'], ['first_name', 'ASC']]
  });
};

module.exports = Student;
