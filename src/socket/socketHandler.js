const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
const { logger, logActions } = require('../utils/logger');

/**
 * Gestió de connexions Socket.io per chat temps real i notificacions
 * Implementa autenticació JWT i sistema multi-tenant
 */
function socketHandler(io) {
  
  // Middleware d'autenticació per Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Token d\'autenticació requerit'));
      }
      
      // Verificar token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Carregar usuari
      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Tenant,
          as: 'tenant'
        }]
      });
      
      if (!user || !user.isActive()) {
        return next(new Error('Usuari no vàlid'));
      }
      
      // Verificar tenant actiu
      if (user.tenant && !user.tenant.isActive()) {
        return next(new Error('Centre educatiu inactiu'));
      }
      
      // Afegir dades a socket
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.tenantId = user.tenant_id;
      socket.tenantCode = user.tenant?.code;
      
      logger.info(`Socket connectat: ${user.email} (${user.role}) - Tenant: ${user.tenant?.code || 'none'}`);
      
      next();
      
    } catch (error) {
      logger.error('Error autenticant socket:', error);
      next(new Error('Token invàlid'));
    }
  });
  
  // Gestió de connexions
  io.on('connection', (socket) => {
    const { userId, userRole, tenantId, tenantCode } = socket;
    
    logger.info(`✅ Socket connectat: ${userId} (${userRole}) - Tenant: ${tenantCode}`);
    
    // Unir-se a sales basades en tenant i rol
    if (tenantId) {
      socket.join(`tenant_${tenantId}`);
      socket.join(`tenant_${tenantId}_${userRole}`);
    }
    
    // Sala personal
    socket.join(`user_${userId}`);
    
    // Notificar connexió exitosa
    socket.emit('connected', {
      message: 'Connectat correctament',
      userId,
      tenantId,
      tenantCode
    });
    
    // === GESTIÓ DEL CHAT ===
    
    // Unir-se a una sala de xat
    socket.on('join_chat_room', async (data) => {
      try {
        const { roomId } = data;
        
        // TODO: Verificar que l'usuari té accés a aquesta sala
        // const hasAccess = await verifyChatRoomAccess(userId, roomId, tenantId);
        // if (!hasAccess) {
        //   return socket.emit('error', { message: 'Accés denegat a la sala' });
        // }
        
        socket.join(`chat_room_${roomId}`);
        socket.emit('joined_chat_room', { roomId });
        
  logActions.chatMessage(roomId, userId, 'USER_JOINED', tenantId);
        
      } catch (error) {
        logger.error('Error joining chat room:', error);
        socket.emit('error', { message: 'Error unint-se a la sala' });
      }
    });
    
    // Abandonar sala de xat
    socket.on('leave_chat_room', (data) => {
      const { roomId } = data;
      socket.leave(`chat_room_${roomId}`);
      socket.emit('left_chat_room', { roomId });
    });
    
    // Enviar missatge de xat
    socket.on('send_chat_message', async (data) => {
      try {
        const { roomId, content, messageType = 'text', replyToId = null } = data;
        
        // TODO: Validar i guardar missatge a BD
        // const message = await saveChatMessage({
        //   roomId,
        //   senderId: userId,
        //   content,
        //   messageType,
        //   replyToId
        // });
        
        // Emetre missatge a tots els membres de la sala
        io.to(`chat_room_${roomId}`).emit('new_chat_message', {
          id: 'temp_id', // Substituir per message.id
          roomId,
          senderId: userId,
          content,
          messageType,
          replyToId,
          timestamp: new Date().toISOString()
        });
        
  logActions.chatMessage(roomId, userId, messageType || 'text', tenantId);
        
      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Error enviant missatge' });
      }
    });
    
    // Marcar missatges com llegits
    socket.on('mark_messages_read', async (data) => {
      try {
        const { roomId, lastMessageId } = data;
        
        // TODO: Actualitzar BD amb missatges llegits
        // await markMessagesAsRead(userId, roomId, lastMessageId);
        
        // Notificar altres usuaris de la sala
        socket.to(`chat_room_${roomId}`).emit('messages_read', {
          userId,
          roomId,
          lastMessageId
        });
        
      } catch (error) {
        logger.error('Error marking messages read:', error);
      }
    });
    
    // Indicador d'escriptura
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(`chat_room_${roomId}`).emit('user_typing', {
        userId,
        roomId,
        typing: true
      });
    });
    
    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(`chat_room_${roomId}`).emit('user_typing', {
        userId,
        roomId,
        typing: false
      });
    });
    
    // === GESTIÓ D'ASSISTÈNCIA EN TEMPS REAL ===
    
    // Actualització d'assistència
    socket.on('attendance_update', async (data) => {
      try {
        // Només monitors i coordinadors poden actualitzar assistència
        if (!['MONITOR', 'COORDINADOR', 'ADMIN'].includes(userRole)) {
          return socket.emit('error', { message: 'Permisos insuficients' });
        }
        
        const { studentId, contractId, date, status } = data;
        
        // TODO: Actualitzar assistència a BD
        // const attendance = await updateAttendance({
        //   studentId,
        //   contractId,
        //   date,
        //   status,
        //   recordedBy: userId
        // });
        
        // Notificar a tots els usuaris del tenant
        io.to(`tenant_${tenantId}`).emit('attendance_updated', {
          studentId,
          contractId,
          date,
          status,
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });
        
  logActions.userAction(
          userId,
          'ATTENDANCE_UPDATED',
          { studentId, status, date },
          tenantId
        );
        
      } catch (error) {
        logger.error('Error updating attendance:', error);
        socket.emit('error', { message: 'Error actualitzant assistència' });
      }
    });
    
    // === NOTIFICACIONS SISTEMA ===
    
    // Subscriure's a notificacions específiques
    socket.on('subscribe_notifications', (data) => {
      const { types = [] } = data;
      
      types.forEach(type => {
        if (['invoices', 'attendance', 'chat', 'system'].includes(type)) {
          socket.join(`notifications_${type}_${tenantId}`);
        }
      });
    });
    
    // === GESTIÓ DE DESCONNEXIÓ ===
    
    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket desconnectat: ${userId} - Motiu: ${reason}`);
      
      // Notificar que l'usuari ja no està escrivint en cap sala
      // (les sales es netegen automàticament)
    });
    
    // Gestió d'errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });
  
  // === FUNCIONS D'UTILITAT ===
  
  // Enviar notificació a un usuari específic
  io.notifyUser = (userId, notification) => {
    io.to(`user_${userId}`).emit('notification', notification);
  };
  
  // Enviar notificació a tots els usuaris d'un tenant
  io.notifyTenant = (tenantId, notification) => {
    io.to(`tenant_${tenantId}`).emit('notification', notification);
  };
  
  // Enviar notificació a usuaris amb rol específic en un tenant
  io.notifyTenantRole = (tenantId, role, notification) => {
    io.to(`tenant_${tenantId}_${role}`).emit('notification', notification);
  };
  
  // Broadcast actualització d'assistència
  io.broadcastAttendanceUpdate = (tenantId, attendanceData) => {
    io.to(`tenant_${tenantId}`).emit('attendance_updated', attendanceData);
  };
  
  // Broadcast nova factura
  io.broadcastInvoiceCreated = (userId, invoice) => {
    io.to(`user_${userId}`).emit('invoice_created', invoice);
  };
  
  logger.info('🔌 Socket.io handler configurat correctament');
}

module.exports = socketHandler;
