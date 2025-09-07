const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model Invoice - Factures generades automàticament des dels registres d'assistència
 */
const Invoice = sequelize.define('Invoice', {
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
  
  // Relació amb família (usuari responsable del pagament)
  family_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Número de factura (generat automàticament)
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  
  // Periode de facturació
  billing_period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  billing_period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Data d'emissió de la factura
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Data de venciment
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Import total (en cèntims d'euro)
  total_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  
  // Import dels impostos
  tax_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  
  // Percentatge d'IVA
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 21.00 // IVA espanyol per defecte
  },
  
  // Import net (sense impostos)
  net_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  
  // Descomptes aplicats
  discount_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  
  // Estat de la factura
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'draft',
    allowNull: false
  },
  
  // Mètode de pagament
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'card', 'cash', 'direct_debit'),
    allowNull: true
  },
  
  // Data de pagament
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Referència de pagament
  payment_reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Conceptes de la factura (línia de detall)
  line_items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
    /*
    Exemple estructura:
    [
      {
        "student_id": "uuid",
        "student_name": "Nom Cognom",
        "service_type": "MENJADOR",
        "contract_type": "FIXE", 
        "period": "Gener 2024",
        "days_count": 20,
        "unit_price": 754,
        "total_price": 15080,
        "details": [
          {
            "date": "2024-01-15",
            "status": "F",
            "price": 754
          }
        ]
      }
    ]
    */
  },
  
  // Dades de facturació
  billing_data: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
    /*
    {
      "tenant_name": "Centre Educatiu",
      "tenant_address": {...},
      "tenant_tax_id": "B12345678",
      "family_name": "Família García",
      "family_address": {...},
      "family_tax_id": "12345678Z"
    }
    */
  },
  
  // Notes de la factura
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // URL del PDF generat
  pdf_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // Data d'enviament per email
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Data de visualització per part de la família
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Usuari que va generar la factura
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Recordatoris enviats
  reminders_sent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Data de l'últim recordatori
  last_reminder_at: {
    type: DataTypes.DATE,
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
  tableName: 'invoices',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['invoice_number']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['family_user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['issue_date']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['billing_period_start', 'billing_period_end']
    }
  ],
  hooks: {
    beforeCreate: async (invoice) => {
      // Generar número de factura si no existeix
      if (!invoice.invoice_number) {
        invoice.invoice_number = await invoice.constructor.generateInvoiceNumber(invoice.tenant_id);
      }
      
      // Calcular data de venciment (30 dies per defecte)
      if (!invoice.due_date) {
        const dueDate = new Date(invoice.issue_date);
        dueDate.setDate(dueDate.getDate() + 30);
        invoice.due_date = dueDate;
      }
      
      // Calcular imports
      invoice.calculateAmounts();
    },
    
    beforeUpdate: async (invoice) => {
      // Recalcular imports si canvien els line_items
      if (invoice.changed('line_items')) {
        invoice.calculateAmounts();
      }
      
      // Actualitzar estat segons pagament
      if (invoice.changed('paid_at') && invoice.paid_at) {
        invoice.status = 'paid';
      }
    }
  }
});

// Mètodes d'instància
Invoice.prototype.calculateAmounts = function() {
  let totalNet = 0;
  
  // Sumar tots els line items
  if (this.line_items && Array.isArray(this.line_items)) {
    totalNet = this.line_items.reduce((sum, item) => {
      return sum + (item.total_price || 0);
    }, 0);
  }
  
  // Aplicar descompte
  totalNet -= this.discount_amount;
  
  // Calcular IVA
  const taxAmount = Math.round(totalNet * this.tax_rate / 100);
  
  // Actualitzar imports
  this.net_amount = totalNet;
  this.tax_amount = taxAmount;
  this.total_amount = totalNet + taxAmount;
};

Invoice.prototype.isPaid = function() {
  return this.status === 'paid' && this.paid_at;
};

Invoice.prototype.isOverdue = function() {
  if (this.isPaid()) return false;
  return new Date() > new Date(this.due_date);
};

Invoice.prototype.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  
  const now = new Date();
  const dueDate = new Date(this.due_date);
  return Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
};

Invoice.prototype.formatAmount = function(amount = null) {
  const amountToFormat = amount !== null ? amount : this.total_amount;
  return (amountToFormat / 100).toFixed(2) + '€';
};

Invoice.prototype.markAsPaid = function(paymentMethod = null, paymentReference = null) {
  this.status = 'paid';
  this.paid_at = new Date();
  this.payment_method = paymentMethod;
  this.payment_reference = paymentReference;
};

Invoice.prototype.canBeCancelled = function() {
  return ['draft', 'sent', 'viewed'].includes(this.status);
};

Invoice.prototype.getDisplayStatus = function() {
  const statusMap = {
    'draft': 'Esborrany',
    'sent': 'Enviada',
    'viewed': 'Visualitzada',
    'paid': 'Pagada',
    'overdue': 'Vençuda',
    'cancelled': 'Cancel·lada'
  };
  
  return statusMap[this.status] || this.status;
};

// Mètodes estàtics
Invoice.generateInvoiceNumber = async function(tenantId) {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  
  // Buscar l'últim número per aquest any i tenant
  const lastInvoice = await this.findOne({
    where: {
      tenant_id: tenantId,
      invoice_number: {
        [sequelize.Op.like]: `${prefix}%`
      }
    },
    order: [['invoice_number', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1]) || 0;
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};

Invoice.findByFamily = async function(familyUserId, options = {}) {
  return await this.findAll({
    where: {
      family_user_id: familyUserId,
      ...options.where
    },
    order: [['issue_date', 'DESC']],
    ...options
  });
};

Invoice.findOverdue = async function(tenantId) {
  const now = new Date();
  
  return await this.findAll({
    where: {
      tenant_id: tenantId,
      status: {
        [sequelize.Op.in]: ['sent', 'viewed']
      },
      due_date: {
        [sequelize.Op.lt]: now
      }
    },
    order: [['due_date', 'ASC']]
  });
};

Invoice.getStatsForTenant = async function(tenantId, startDate, endDate) {
  const stats = await this.findAll({
    where: {
      tenant_id: tenantId,
      issue_date: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount']
    ],
    group: ['status'],
    raw: true
  });
  
  return stats;
};

module.exports = Invoice;
