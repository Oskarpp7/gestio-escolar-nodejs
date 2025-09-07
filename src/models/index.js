const { sequelize } = require('../config/database');

// Importar tots els models
const Tenant = require('./Tenant');
const User = require('./User');
const Student = require('./Student');
const Contract = require('./Contract');
const Attendance = require('./Attendance');
const Invoice = require('./Invoice');
const { ChatRoom, ChatParticipant, ChatMessage, ChatMessageRead } = require('./Chat');

/**
 * Definició de totes les relacions entre models
 * Sistema multi-tenant amb aïllament total per tenant
 */

// ============= RELACIONS TENANT =============
// Un tenant té molts usuaris
Tenant.hasMany(User, {
  foreignKey: 'tenant_id',
  as: 'users',
  onDelete: 'CASCADE'
});

User.belongsTo(Tenant, {
  foreignKey: 'tenant_id',
  as: 'tenant'
});

// Un tenant té molts estudiants
Tenant.hasMany(Student, {
  foreignKey: 'tenant_id',
  as: 'students',
  onDelete: 'CASCADE'
});

Student.belongsTo(Tenant, {
  foreignKey: 'tenant_id',
  as: 'tenant'
});

// Un tenant té molts contractes
Tenant.hasMany(Contract, {
  foreignKey: 'tenant_id',
  as: 'contracts',
  onDelete: 'CASCADE'
});

Contract.belongsTo(Tenant, {
  foreignKey: 'tenant_id',
  as: 'tenant'
});

// ============= RELACIONS ESTUDIANT-FAMÍLIA =============
// Relació many-to-many entre estudiants i famílies (usuaris amb rol FAMILIA)
const StudentFamily = sequelize.define('StudentFamily', {
  id: {
    type: sequelize.Sequelize.UUID,
    defaultValue: sequelize.Sequelize.UUIDV4,
    primaryKey: true
  },
  
  student_id: {
    type: sequelize.Sequelize.UUID,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  
  family_user_id: {
    type: sequelize.Sequelize.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Relació familiar
  relationship: {
    type: sequelize.Sequelize.ENUM('pare', 'mare', 'tutor', 'avi', 'avia', 'oncle', 'tia', 'altre'),
    allowNull: false,
    defaultValue: 'pare'
  },
  
  // Contacte principal
  is_primary_contact: {
    type: sequelize.Sequelize.BOOLEAN,
    defaultValue: false
  },
  
  // Autoritzat per recollir
  can_pickup: {
    type: sequelize.Sequelize.BOOLEAN,
    defaultValue: true
  },
  
  // Rebre notificacions
  receive_notifications: {
    type: sequelize.Sequelize.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'student_families',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'family_user_id']
    }
  ]
});

Student.belongsToMany(User, {
  through: StudentFamily,
  as: 'families',
  foreignKey: 'student_id',
  otherKey: 'family_user_id'
});

User.belongsToMany(Student, {
  through: StudentFamily,
  as: 'students',
  foreignKey: 'family_user_id',
  otherKey: 'student_id'
});

// ============= RELACIONS CONTRACTES =============
// Un estudiant pot tenir molts contractes
Student.hasMany(Contract, {
  foreignKey: 'student_id',
  as: 'contracts',
  onDelete: 'CASCADE'
});

Contract.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

// Una família (usuari) pot tenir molts contractes
User.hasMany(Contract, {
  foreignKey: 'family_user_id',
  as: 'family_contracts'
});

Contract.belongsTo(User, {
  foreignKey: 'family_user_id',
  as: 'family'
});

// Usuari que signa el contracte
Contract.belongsTo(User, {
  foreignKey: 'signed_by_user_id',
  as: 'signed_by'
});

// ============= RELACIONS ASSISTÈNCIA =============
// Un contracte té molts registres d'assistència
Contract.hasMany(Attendance, {
  foreignKey: 'contract_id',
  as: 'attendance_records',
  onDelete: 'CASCADE'
});

Attendance.belongsTo(Contract, {
  foreignKey: 'contract_id',
  as: 'contract'
});

// Un estudiant té molts registres d'assistència
Student.hasMany(Attendance, {
  foreignKey: 'student_id',
  as: 'attendance_records'
});

Attendance.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

// Usuari que registra l'assistència
Attendance.belongsTo(User, {
  foreignKey: 'recorded_by_user_id',
  as: 'recorded_by'
});

// Usuari que modifica l'assistència
Attendance.belongsTo(User, {
  foreignKey: 'modified_by_user_id',
  as: 'modified_by'
});

// ============= RELACIONS FACTURACIÓ =============
// Una factura pertany a una família
User.hasMany(Invoice, {
  foreignKey: 'family_user_id',
  as: 'invoices'
});

Invoice.belongsTo(User, {
  foreignKey: 'family_user_id',
  as: 'family'
});

// Una factura pot tenir molts registres d'assistència
Invoice.hasMany(Attendance, {
  foreignKey: 'invoice_id',
  as: 'attendance_records'
});

Attendance.belongsTo(Invoice, {
  foreignKey: 'invoice_id',
  as: 'invoice'
});

// Usuari que crea la factura
Invoice.belongsTo(User, {
  foreignKey: 'created_by_user_id',
  as: 'created_by'
});

// ============= RELACIONS CHAT =============
// Un tenant té moltes sales de xat
Tenant.hasMany(ChatRoom, {
  foreignKey: 'tenant_id',
  as: 'chat_rooms',
  onDelete: 'CASCADE'
});

ChatRoom.belongsTo(Tenant, {
  foreignKey: 'tenant_id',
  as: 'tenant'
});

// Usuari creador de la sala
ChatRoom.belongsTo(User, {
  foreignKey: 'created_by_user_id',
  as: 'created_by'
});

// Participants de les sales
ChatRoom.belongsToMany(User, {
  through: ChatParticipant,
  as: 'participants',
  foreignKey: 'chat_room_id',
  otherKey: 'user_id'
});

User.belongsToMany(ChatRoom, {
  through: ChatParticipant,
  as: 'chat_rooms',
  foreignKey: 'user_id',
  otherKey: 'chat_room_id'
});

// Relacions directes per facilitar queries
ChatRoom.hasMany(ChatParticipant, {
  foreignKey: 'chat_room_id',
  as: 'room_participants',
  onDelete: 'CASCADE'
});

ChatParticipant.belongsTo(ChatRoom, {
  foreignKey: 'chat_room_id',
  as: 'room'
});

ChatParticipant.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Missatges de xat
ChatRoom.hasMany(ChatMessage, {
  foreignKey: 'chat_room_id',
  as: 'messages',
  onDelete: 'CASCADE'
});

ChatMessage.belongsTo(ChatRoom, {
  foreignKey: 'chat_room_id',
  as: 'room'
});

ChatMessage.belongsTo(User, {
  foreignKey: 'sender_user_id',
  as: 'sender'
});

// Missatges resposta (threading)
ChatMessage.belongsTo(ChatMessage, {
  foreignKey: 'reply_to_message_id',
  as: 'reply_to'
});

ChatMessage.hasMany(ChatMessage, {
  foreignKey: 'reply_to_message_id',
  as: 'replies'
});

// Control de lectura de missatges
ChatMessage.belongsToMany(User, {
  through: ChatMessageRead,
  as: 'read_by_users',
  foreignKey: 'message_id',
  otherKey: 'user_id'
});

User.belongsToMany(ChatMessage, {
  through: ChatMessageRead,
  as: 'read_messages',
  foreignKey: 'user_id',
  otherKey: 'message_id'
});

ChatMessageRead.belongsTo(ChatMessage, {
  foreignKey: 'message_id',
  as: 'message'
});

ChatMessageRead.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ============= FUNCIONS D'UTILITAT =============

/**
 * Sincronitzar tots els models amb la base de dades
 */
const syncAllModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Tots els models sincronitzats amb la base de dades');
  } catch (error) {
    console.error('❌ Error sincronitzant models:', error);
    throw error;
  }
};

/**
 * Obtenir tots els models en un objecte
 */
const getAllModels = () => {
  return {
    Tenant,
    User,
    Student,
    StudentFamily,
    Contract,
    Attendance,
    Invoice,
    ChatRoom,
    ChatParticipant,
    ChatMessage,
    ChatMessageRead,
    sequelize
  };
};

/**
 * Cleanup per testing - esborra totes les taules
 */
const dropAllTables = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('dropAllTables només es pot executar en entorn de test');
  }
  
  await sequelize.drop();
  console.log('🗑️ Totes les taules esborrades');
};

module.exports = {
  // Models individuals
  Tenant,
  User,
  Student,
  StudentFamily,
  Contract,
  Attendance,
  Invoice,
  ChatRoom,
  ChatParticipant,
  ChatMessage,
  ChatMessageRead,
  
  // Utilitats
  sequelize,
  syncAllModels,
  getAllModels,
  dropAllTables
};
