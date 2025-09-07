const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Model ChatRoom - Sales de xat per comunicació famílies-monitors-admin
 */
const ChatRoom = sequelize.define('ChatRoom', {
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
  
  // Nom de la sala
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  // Tipus de sala
  type: {
    type: DataTypes.ENUM('direct', 'group', 'broadcast', 'support'),
    allowNull: false,
    defaultValue: 'group'
  },
  
  // Descripció de la sala
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Configuració de la sala
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      allow_file_upload: true,
      max_file_size: 10485760, // 10MB
      allowed_file_types: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      message_retention_days: 365,
      notification_enabled: true
    }
  },
  
  // Estat de la sala
  status: {
    type: DataTypes.ENUM('active', 'archived', 'disabled'),
    defaultValue: 'active',
    allowNull: false
  },
  
  // Usuari creador
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Últim missatge
  last_message_at: {
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
  tableName: 'chat_rooms',
  paranoid: true,
  indexes: [
    {
      fields: ['tenant_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_by_user_id']
    },
    {
      fields: ['last_message_at']
    }
  ]
});

/**
 * Model ChatParticipant - Participants de les sales de xat
 */
const ChatParticipant = sequelize.define('ChatParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Relació amb sala de xat
  chat_room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_rooms',
      key: 'id'
    }
  },
  
  // Relació amb usuari
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Rol del participant a la sala
  role: {
    type: DataTypes.ENUM('member', 'moderator', 'admin'),
    defaultValue: 'member',
    allowNull: false
  },
  
  // Data d'incorporació
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Última lectura de missatges
  last_read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Configuració de notificacions
  notification_settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      push_notifications: true,
      email_notifications: false,
      sound_enabled: true
    }
  },
  
  // Estat del participant
  status: {
    type: DataTypes.ENUM('active', 'muted', 'banned', 'left'),
    defaultValue: 'active',
    allowNull: false
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
  }
}, {
  tableName: 'chat_participants',
  indexes: [
    {
      unique: true,
      fields: ['chat_room_id', 'user_id'],
      name: 'unique_room_user'
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    }
  ]
});

/**
 * Model ChatMessage - Missatges del xat
 */
const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Relació amb sala de xat
  chat_room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_rooms',
      key: 'id'
    }
  },
  
  // Usuari que envia el missatge
  sender_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Tipus de missatge
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'system', 'notification'),
    defaultValue: 'text',
    allowNull: false
  },
  
  // Contingut del missatge
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Fitxers adjunts
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
    /*
    [
      {
        "filename": "document.pdf",
        "original_name": "Menú setmana.pdf", 
        "url": "/uploads/files/uuid.pdf",
        "size": 1024576,
        "mime_type": "application/pdf"
      }
    ]
    */
  },
  
  // Missatge al qual respon (threading)
  reply_to_message_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  
  // Missatge esborrat
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Missatge editat
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Data d'edició
  edited_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Prioritat del missatge
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false
  },
  
  // Etiquetes del missatge
  tags: {
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
  tableName: 'chat_messages',
  paranoid: true,
  indexes: [
    {
      fields: ['chat_room_id']
    },
    {
      fields: ['sender_user_id']
    },
    {
      fields: ['message_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['reply_to_message_id']
    },
    {
      fields: ['priority']
    }
  ]
});

/**
 * Model ChatMessageRead - Control de lectura de missatges
 */
const ChatMessageRead = sequelize.define('ChatMessageRead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Relació amb missatge
  message_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  
  // Relació amb usuari
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Data de lectura
  read_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chat_message_reads',
  indexes: [
    {
      unique: true,
      fields: ['message_id', 'user_id'],
      name: 'unique_message_user_read'
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['read_at']
    }
  ]
});

// Mètodes per ChatRoom
ChatRoom.prototype.isActive = function() {
  return this.status === 'active';
};

ChatRoom.prototype.getParticipantCount = async function() {
  return await ChatParticipant.count({
    where: {
      chat_room_id: this.id,
      status: 'active'
    }
  });
};

// Mètodes per ChatMessage
ChatMessage.prototype.isDeleted = function() {
  return this.is_deleted || this.deleted_at !== null;
};

ChatMessage.prototype.canEdit = function(userId) {
  return this.sender_user_id === userId && !this.isDeleted();
};

ChatMessage.prototype.hasAttachments = function() {
  return this.attachments && this.attachments.length > 0;
};

// Mètodes estàtics
ChatRoom.findUserRooms = async function(userId, tenantId) {
  return await this.findAll({
    include: [{
      model: ChatParticipant,
      as: 'participants',
      where: {
        user_id: userId,
        status: 'active'
      }
    }],
    where: {
      tenant_id: tenantId,
      status: 'active'
    },
    order: [['last_message_at', 'DESC']]
  });
};

ChatMessage.findRecentMessages = async function(roomId, limit = 50, beforeId = null) {
  const where = {
    chat_room_id: roomId,
    is_deleted: false
  };
  
  if (beforeId) {
    where.id = { [sequelize.Op.lt]: beforeId };
  }
  
  return await this.findAll({
    where,
    include: [
      { model: require('./User'), as: 'sender', attributes: ['id', 'first_name', 'last_name', 'avatar_url'] }
    ],
    order: [['created_at', 'DESC']],
    limit
  });
};

module.exports = {
  ChatRoom,
  ChatParticipant, 
  ChatMessage,
  ChatMessageRead
};
