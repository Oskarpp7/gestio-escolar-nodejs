const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Attendance - Registre d'assistència per al càlcul automàtic de facturació
 * Suporta els diferents estats: F, A, X, EE, ACE segons tipus de contracte
 */
const Attendance = sequelize.define('Attendance', {
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
  
  // Relació amb contracte
  contract_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'contracts',
      key: 'id'
    }
  },
  
  // Relació amb estudiant
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  
  // Data del registre
  attendance_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Estat d'assistència segons tipus de contracte
  status: {
    type: DataTypes.ENUM('F', 'A', 'X', 'EE', 'ACE', 'N'),
    allowNull: false
    /*
    F   = Present (FIXE)
    A   = Absent (FIXE) 
    X   = Justificat (FIXE)
    EE  = Present Esporàdic (MENJADOR)
    ACE = Present Esporàdic (ACOLLIDA)
    N   = No aplicable
    */
  },
  
  // Hora d'arribada (per acollida matí)
  arrival_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  
  // Hora de sortida (per acollida tarda)
  departure_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  
  // Preu calculat per aquest dia (en cèntims d'euro)
  calculated_price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  
  // Preu aplicat finalment (pot diferir del calculat per ajustos manuals)
  applied_price: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Motiu de la justificació (per status X)
  justification_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Observacions del monitor
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Usuari que va registrar l'assistència
  recorded_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Data i hora del registre
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Usuari que va modificar per última vegada
  modified_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Estat de facturació
  billing_status: {
    type: DataTypes.ENUM('pending', 'invoiced', 'paid', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Referència a la factura (quan s'ha facturat)
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  
  // Menú del dia (per menjador)
  menu_info: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
    /*
    {
      "primer": "Macarrons amb tomàquet", 
      "segon": "Pollastre amb patates",
      "postre": "Iogurt",
      "allergens": ["gluten"]
    }
    */
  },
  
  // Indicadors especials
  is_special_diet: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Activitats especials (per acollida)
  activities: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  
  // Temperatura/clima (per activitats a l'aire lliure)
  weather_notes: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Indicador de registre automàtic vs manual
  is_auto_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'attendance',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['contract_id', 'attendance_date'],
      name: 'unique_attendance_per_contract_date'
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['attendance_date']
    },
    {
      fields: ['status']
    },
    {
      fields: ['billing_status']
    },
    {
      fields: ['invoice_id']
    },
    {
      fields: ['recorded_by_user_id']
    }
  ],
  hooks: {
    beforeCreate: async (attendance) => {
      // Calcular preu automàticament
      await attendance.calculatePrice();
    },
    
    beforeUpdate: async (attendance) => {
      // Recalcular preu si canvia l'estat
      if (attendance.changed('status')) {
        await attendance.calculatePrice();
      }
    }
  }
});

// Mètodes d'instància
Attendance.prototype.calculatePrice = async function() {
  try {
    // Obtenir el contracte associat
    const Contract = require('./Contract');
    const contract = await Contract.findByPk(this.contract_id);
    
    if (!contract) {
      throw new Error('Contracte no trobat per calcular preu');
    }
    
    // Obtenir pricing efectiu per tenant (async) i calcular
    if (typeof contract.getEffectivePricingAsync === 'function') {
      const effectivePricing = await contract.getEffectivePricingAsync();
      this.calculated_price = contract.calculateDayPrice(this.status, effectivePricing);
    } else {
      this.calculated_price = contract.calculateDayPrice(this.status);
    }
    
    // Si no hi ha preu aplicat manualment, utilitzar el calculat
    if (this.applied_price === null) {
      this.applied_price = this.calculated_price;
    }
    
  } catch (error) {
    console.error('Error calculant preu assistència:', error);
    this.calculated_price = 0;
    this.applied_price = 0;
  }
};

Attendance.prototype.getFinalPrice = function() {
  return this.applied_price !== null ? this.applied_price : this.calculated_price;
};

Attendance.prototype.isPaid = function() {
  return this.billing_status === 'paid';
};

Attendance.prototype.isInvoiced = function() {
  return this.billing_status === 'invoiced' || this.billing_status === 'paid';
};

Attendance.prototype.canModify = function() {
  return this.billing_status === 'pending';
};

Attendance.prototype.getStatusDescription = function() {
  const descriptions = {
    'F': 'Present (Fixe)',
    'A': 'Absent (Fixe)',
    'X': 'Justificat (Fixe)',
    'EE': 'Present Esporàdic (Menjador)',
    'ACE': 'Present Esporàdic (Acollida)',
    'N': 'No aplicable'
  };
  
  return descriptions[this.status] || 'Desconegut';
};

Attendance.prototype.formatPrice = function() {
  const price = this.getFinalPrice();
  return (price / 100).toFixed(2) + '€';
};

// Mètodes estàtics
Attendance.findByStudent = async function(studentId, startDate = null, endDate = null) {
  const where = { student_id: studentId };
  
  if (startDate && endDate) {
    where.attendance_date = {
      [sequelize.Op.between]: [startDate, endDate]
    };
  } else if (startDate) {
    where.attendance_date = {
      [sequelize.Op.gte]: startDate
    };
  }
  
  return await this.findAll({
    where,
    order: [['attendance_date', 'DESC']]
  });
};

Attendance.findByDate = async function(tenantId, date) {
  return await this.findAll({
    where: {
      tenant_id: tenantId,
      attendance_date: date
    },
    include: [
      { model: require('./Student'), as: 'student' },
      { model: require('./Contract'), as: 'contract' }
    ],
    order: [['student', 'last_name', 'ASC']]
  });
};

Attendance.findPendingBilling = async function(tenantId, startDate = null, endDate = null) {
  const where = {
    tenant_id: tenantId,
    billing_status: 'pending',
    calculated_price: { [sequelize.Op.gt]: 0 }
  };
  
  if (startDate && endDate) {
    where.attendance_date = {
      [sequelize.Op.between]: [startDate, endDate]
    };
  }
  
  return await this.findAll({
    where,
    include: [
      { model: require('./Student'), as: 'student' },
      { model: require('./Contract'), as: 'contract' }
    ],
    order: [['attendance_date', 'ASC']]
  });
};

Attendance.getAttendanceStats = async function(tenantId, startDate, endDate) {
  const stats = await this.findAll({
    where: {
      tenant_id: tenantId,
      attendance_date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('calculated_price')), 'total_amount']
    ],
    group: ['status'],
    raw: true
  });
  
  return stats;
};

Attendance.bulkCreateForWeek = async function(tenantId, weekStart, contracts) {
  const attendanceRecords = [];
  
  for (let contract of contracts) {
    if (contract.contract_type === 'FIXE' && contract.weekdays) {
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        
        if (contract.weekdays.includes(dayName)) {
          // Verificar que no existeixi ja
          const existing = await this.findOne({
            where: {
              contract_id: contract.id,
              attendance_date: date.toISOString().split('T')[0]
            }
          });
          
          if (!existing) {
            attendanceRecords.push({
              tenant_id: tenantId,
              contract_id: contract.id,
              student_id: contract.student_id,
              attendance_date: date.toISOString().split('T')[0],
              status: 'F', // Present per defecte
              is_auto_generated: true
            });
          }
        }
      }
    }
  }
  
  if (attendanceRecords.length > 0) {
    return await this.bulkCreate(attendanceRecords);
  }
  
  return [];
};

module.exports = Attendance;
