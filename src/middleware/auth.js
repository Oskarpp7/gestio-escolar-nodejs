const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware d'autenticació JWT
 * Verifica tokens i carrega informació de l'usuari
 */
class AuthMiddleware {
  
  /**
   * Verificar token JWT i carregar usuari
   */
  static async verifyToken(req, res, next) {
    try {
      // Obtenir token del header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token d\'accés requerit'
        });
      }
      
      const token = authHeader.substring(7); // Treure "Bearer "
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Carregar usuari complet
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'code', 'name', 'status', 'plan']
          }
        ]
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuari no trobat'
        });
      }
      
      // Verificar que l'usuari estigui actiu
      if (!user.isActive()) {
        return res.status(401).json({
          success: false,
          message: 'Compte d\'usuari inactiu'
        });
      }
      
      // Verificar tenant actiu (excepte SUPER_ADMIN)
      if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.isActive()) {
        return res.status(401).json({
          success: false,
          message: 'Centre educatiu inactiu'
        });
      }
      
      // Afegir usuari i tenant al request
      req.user = user;
      req.tenant = user.tenant;
      req.tenantId = user.tenant_id;
      
      // Actualitzar última connexió
      user.last_login_at = new Date();
      user.last_login_ip = req.ip || req.connection.remoteAddress;
      await user.save({ silent: true });
      
      next();
      
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invàlid'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token caducat'
        });
      }
      
      logger.error('Error verificant token:', error);
      return res.status(500).json({
        success: false,
        message: 'Error intern del servidor'
      });
    }
  }
  
  /**
   * Verificar token opcional (per routes públiques amb funcionalitat extra per usuaris autenticats)
   */
  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No hi ha token, continuar sense usuari
        req.user = null;
        req.tenant = null;
        req.tenantId = null;
        return next();
      }
      
      // Si hi ha token, verificar-lo
      await AuthMiddleware.verifyToken(req, res, next);
      
    } catch (error) {
      // Si hi ha error amb el token opcional, continuar sense usuari
      req.user = null;
      req.tenant = null;
      req.tenantId = null;
      next();
    }
  }
  
  /**
   * Requerir rol específic
   */
  static requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticació requerida'
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficients'
        });
      }
      
      next();
    };
  }
  
  /**
   * Requerir permís específic
   */
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticació requerida'
        });
      }
      
      if (!req.user.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permís '${permission}' requerit`
        });
      }
      
      next();
    };
  }
  
  /**
   * Verificar que l'usuari tingui accés al tenant
   */
  static requireTenantAccess(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticació requerida'
      });
    }
    
    // SUPER_ADMIN té accés a tots els tenants
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Verificar que l'usuari pertanyi al tenant
    const requestedTenantId = req.params.tenantId || req.query.tenantId || req.tenantId;
    
    if (!req.user.canAccessTenant(requestedTenantId)) {
      return res.status(403).json({
        success: false,
        message: 'Accés denegat al centre educatiu'
      });
    }
    
    next();
  }
  
  /**
   * Verificar que l'usuari pugui accedir a les dades d'un estudiant
   */
  static async requireStudentAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticació requerida'
        });
      }
      
      const studentId = req.params.studentId;
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'ID d\'estudiant requerit'
        });
      }
      
      // SUPER_ADMIN i ADMIN tenen accés complet
      if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        return next();
      }
      
      // Per altres rols, verificar accés específic
      const { Student, StudentFamily } = require('../models');
      
      if (req.user.role === 'FAMILIA') {
        // Verificar que la família tingui accés a l'estudiant
        const studentFamily = await StudentFamily.findOne({
          where: {
            student_id: studentId,
            family_user_id: req.user.id
          }
        });
        
        if (!studentFamily) {
          return res.status(403).json({
            success: false,
            message: 'Accés denegat a les dades de l\'estudiant'
          });
        }
      } else {
        // Per COORDINADOR i MONITOR, verificar que l'estudiant pertanyi al mateix tenant
        const student = await Student.findOne({
          where: {
            id: studentId,
            tenant_id: req.tenantId
          }
        });
        
        if (!student) {
          return res.status(403).json({
            success: false,
            message: 'Estudiant no trobat o accés denegat'
          });
        }
      }
      
      next();
      
    } catch (error) {
      logger.error('Error verificant accés a estudiant:', error);
      return res.status(500).json({
        success: false,
        message: 'Error intern del servidor'
      });
    }
  }
  
  /**
   * Rate limiting per usuari autenticat
   */
  static userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const userRequestCounts = new Map();
    
    return (req, res, next) => {
      if (!req.user) {
        return next();
      }
      
      const userId = req.user.id;
      const now = Date.now();
      const userKey = `${userId}_${Math.floor(now / windowMs)}`;
      
      const count = userRequestCounts.get(userKey) || 0;
      
      if (count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Massa peticions. Prova més tard.'
        });
      }
      
      userRequestCounts.set(userKey, count + 1);
      
      // Netejar entrades antigues cada hora
      if (Math.random() < 0.01) {
        const cutoff = Math.floor((now - windowMs * 2) / windowMs);
        for (const [key] of userRequestCounts.entries()) {
          const keyTime = parseInt(key.split('_')[1]);
          if (keyTime < cutoff) {
            userRequestCounts.delete(key);
          }
        }
      }
      
      next();
    };
  }
  
  /**
   * Generar token JWT
   */
  static generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      algorithm: 'HS256'
    });
  }
  
  /**
   * Generar refresh token
   */
  static generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    });
  }
  
  /**
   * Verificar refresh token
   */
  static async verifyRefreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Token type invalid');
      }
      
      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Tenant, as: 'tenant' }]
      });
      
      if (!user || !user.isActive()) {
        throw new Error('User not found or inactive');
      }
      
      return user;
      
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = AuthMiddleware;
