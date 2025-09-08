const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Contract - Contractes de serveis (Menjador i Acollida)
 * Implementa la lògica complexa de FIXE vs ESPORÀDIC amb càlculs automàtics
 */
const Contract = sequelize.define('Contract', {
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
  
  // Relació amb estudiant
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  
  // Relació amb família (usuari responsable)
  family_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Tipus de servei
  service_type: {
    type: DataTypes.ENUM('MENJADOR', 'ACOLLIDA'),
    allowNull: false
  },
  
  // Modalitat del contracte
  contract_type: {
    type: DataTypes.ENUM('FIXE', 'ESPORADIC'),
    allowNull: false
  },
  
  // Sub-modalitat per acollida
  subtype: {
    type: DataTypes.ENUM('MATI', 'TARDA'),
    allowNull: true // Només per ACOLLIDA
  },
  
  // Curs acadèmic
  academic_year: {
    type: DataTypes.STRING(10),
    allowNull: false // 2024-25, 2025-26, etc.
  },
  
  // Dates del contracte
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Dies de la setmana (per contractes FIXE)
  weekdays: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [], // ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  
  // Tipus de beca aplicada
  scholarship_type: {
    type: DataTypes.ENUM('NONE', 'BC70', 'BC100'),
    defaultValue: 'NONE',
    allowNull: false
  },
  
  // Percentatge de descompte personalitzat
  custom_discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Preus personalitzats (en cèntims d'euro)
  custom_pricing: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
    /*
    Exemple estructura:
    {
      "menjador_fixe_present": 754,
      "menjador_fixe_absent": 386,
      "menjador_fixe_justificat": 0,
      "menjador_esporadic_present": 829,
      "acollida_esporadic_present": 450
    }
    */
  },
  
  // Quota mensual fixa (per contractes FIXE, en cèntims)
  monthly_fee: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  
  // Estat del contracte
  status: {
    type: DataTypes.ENUM('draft', 'active', 'suspended', 'cancelled', 'expired'),
    defaultValue: 'draft',
    allowNull: false
  },
  
  // Observacions del contracte
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Configuració d'avisos automàtics
  auto_notifications: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      attendance_reminder: true,
      invoice_notification: true,
      contract_expiry_warning: true
    }
  },
  
  // Condicions especials
  special_conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  
  // Data de signatura
  signed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Usuari que va signar
  signed_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Data de renovació automàtica
  auto_renewal_date: {
    type: DataTypes.DATEONLY,
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
  tableName: 'contracts',
  paranoid: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['family_user_id']
    },
    {
      fields: ['service_type', 'contract_type']
    },
    {
      fields: ['academic_year']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ],
  validate: {
    // Validacions personalitzades
    subtype_validation() {
      if (this.service_type === 'ACOLLIDA' && this.contract_type === 'ESPORADIC' && !this.subtype) {
        throw new Error('El subtipus és obligatori per contractes d\'acollida esporàdics');
      }
    },
    
    weekdays_validation() {
      if (this.contract_type === 'FIXE' && (!this.weekdays || this.weekdays.length === 0)) {
        throw new Error('Els dies de la setmana són obligatoris per contractes fixos');
      }
    },
    
    date_validation() {
      if (this.start_date && this.end_date && new Date(this.start_date) >= new Date(this.end_date)) {
        throw new Error('La data d\'inici ha de ser anterior a la data de finalització');
      }
    }
  }
});

// Mètodes d'instància
Contract.prototype.isActive = function() {
  const now = new Date();
  const startDate = new Date(this.start_date);
  const endDate = new Date(this.end_date);
  
  return this.status === 'active' && 
         now >= startDate && 
         now <= endDate;
};

Contract.prototype.isExpiringSoon = function(days = 30) {
  const now = new Date();
  const endDate = new Date(this.end_date);
  const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
};

Contract.prototype.getDiscountPercent = function() {
  if (this.custom_discount_percent > 0) {
    return this.custom_discount_percent;
  }
  
  switch (this.scholarship_type) {
    case 'BC100': return 100;
    case 'BC70': return 70;
    default: return 0;
  }
};

Contract.prototype.getPricing = function() {
  // Prioritzar preus personalitzats per contracte
  if (this.custom_pricing) {
    return this.custom_pricing;
  }

  // Fallback a variables d'entorn si no hi ha config carregada en aquest punt
  return {
    menjador_fixe_present: parseInt(process.env.MENJADOR_FIXE_PRESENT) || 754,
    menjador_fixe_absent: parseInt(process.env.MENJADOR_FIXE_ABSENT) || 386,
    menjador_fixe_justificat: parseInt(process.env.MENJADOR_FIXE_JUSTIFICAT) || 0,
    menjador_esporadic_present: parseInt(process.env.MENJADOR_ESPORADIC_PRESENT) || 829,
    acollida_esporadic_present: parseInt(process.env.ACOLLIDA_ESPORADIC_PRESENT) || 450
  };
};

/**
 * Obtenir pricing efectiu (async) amb integració per tenant.
 * Prioritza custom_pricing del contracte, després configuració per tenant, i finalment variables d'entorn.
 */
Contract.prototype.getEffectivePricingAsync = async function() {
  // Custom per contracte té prioritat
  if (this.custom_pricing) return this.custom_pricing;

  try {
    const { loadTenantPricing } = require('../services/pricingService');
    const tenantPricing = await loadTenantPricing(this.tenant_id);
    if (tenantPricing) {
      return {
        // Mapatge a les claus utilitzades en càlculs actuals
        menjador_fixe_present: tenantPricing.MENJADOR.FIXE.present,
        menjador_fixe_absent: tenantPricing.MENJADOR.FIXE.absent,
        menjador_fixe_justificat: tenantPricing.MENJADOR.FIXE.justificat,
        menjador_esporadic_present: tenantPricing.MENJADOR.ESPORADIC.present,
        acollida_esporadic_present: tenantPricing.ACOLLIDA.ESPORADIC.present
      };
    }
  } catch (e) {
    // Ignorar i caure al fallback
  }

  // Fallback a getPricing() per variables d'entorn
  return this.getPricing();
};

Contract.prototype.calculateDayPrice = function(attendanceStatus, pricingOverride = null) {
  const pricing = pricingOverride || this.getPricing();
  const discountPercent = this.getDiscountPercent();
  let price = 0;
  
  // Calcular preu base segons servei i modalitat
  if (this.service_type === 'MENJADOR') {
    if (this.contract_type === 'FIXE') {
      switch (attendanceStatus) {
        case 'F': // Present
          price = pricing.menjador_fixe_present;
          break;
        case 'A': // Absent
          price = pricing.menjador_fixe_absent;
          break;
        case 'X': // Justificat
          price = pricing.menjador_fixe_justificat;
          break;
        default:
          price = 0;
      }
    } else { // ESPORADIC
      if (attendanceStatus === 'EE') { // Present esporàdic
        price = pricing.menjador_esporadic_present;
      }
    }
  } else if (this.service_type === 'ACOLLIDA') {
    if (this.contract_type === 'ESPORADIC' && attendanceStatus === 'ACE') {
      price = pricing.acollida_esporadic_present;
    }
    // ACOLLIDA FIXE només té quota mensual, no preu per dia
  }
  
  // Aplicar descompte
  if (discountPercent > 0) {
    price = Math.round(price * (100 - discountPercent) / 100);
  }
  
  return price;
};

Contract.prototype.calculateMonthlyFee = function() {
  if (this.contract_type === 'FIXE') {
    return this.monthly_fee || 0;
  }
  return 0;
};

Contract.prototype.getContractDescription = function() {
  const serviceDesc = this.service_type === 'MENJADOR' ? 'Servei de Menjador' : 'Servei d\'Acollida';
  const typeDesc = this.contract_type === 'FIXE' ? 'Contracte Fixe' : 'Contracte Esporàdic';
  const subtypeDesc = this.subtype ? ` (${this.subtype})` : '';
  
  return `${serviceDesc} - ${typeDesc}${subtypeDesc}`;
};

/**
 * Retornar el preu unitari del servei indicat (síncron) amb descompte aplicat.
 * Útil per integracions existents. Per preus per tenant, preferir getEffectivePricingAsync.
 */
Contract.prototype.calculateServicePrice = function(serviceType) {
  const p = this.getPricing();
  let unit = 0;
  if (serviceType === 'MENJADOR') {
    unit = this.contract_type === 'FIXE' ? p.menjador_fixe_present : p.menjador_esporadic_present;
  } else if (serviceType === 'ACOLLIDA') {
    unit = this.contract_type === 'ESPORADIC' ? p.acollida_esporadic_present : 0;
  }
  const discountPercent = this.getDiscountPercent();
  if (discountPercent > 0) unit = Math.round(unit * (100 - discountPercent) / 100);
  return { unitPrice: unit };
};

/**
 * Resum de preus per un contracte (síncron). Proporciona valors per UI/APIs.
 */
Contract.prototype.calculatePricing = function() {
  const p = this.getPricing();
  const discountPercent = this.getDiscountPercent();
  const applyDisc = (v) => Math.round(v * (100 - discountPercent) / 100);

  const result = {
    discountPercent,
    service: this.service_type,
    type: this.contract_type,
    prices: {}
  };

  if (this.service_type === 'MENJADOR') {
    if (this.contract_type === 'FIXE') {
      result.prices = {
        present: applyDisc(p.menjador_fixe_present),
        absent: applyDisc(p.menjador_fixe_absent),
        justificat: applyDisc(p.menjador_fixe_justificat)
      };
    } else {
      result.prices = {
        present: applyDisc(p.menjador_esporadic_present)
      };
    }
  } else if (this.service_type === 'ACOLLIDA') {
    if (this.contract_type === 'ESPORADIC') {
      result.prices = {
        present: applyDisc(p.acollida_esporadic_present)
      };
    } else {
      result.prices = { monthly_fee: this.calculateMonthlyFee() };
    }
  }

  return result;
};

// Mètodes estàtics
Contract.findByStudent = async function(studentId, options = {}) {
  return await this.findAll({
    where: { 
      student_id: studentId,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Contract.findActiveByTenant = async function(tenantId, options = {}) {
  const now = new Date();
  
  return await this.findAll({
    where: { 
      tenant_id: tenantId,
      status: 'active',
      start_date: { [sequelize.Op.lte]: now },
      end_date: { [sequelize.Op.gte]: now },
      ...options.where
    },
    order: [['start_date', 'DESC']],
    ...options
  });
};

Contract.findExpiringContracts = async function(tenantId, days = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return await this.findAll({
    where: {
      tenant_id: tenantId,
      status: 'active',
      end_date: {
        [sequelize.Op.between]: [now, futureDate]
      }
    },
    order: [['end_date', 'ASC']]
  });
};

module.exports = Contract;
