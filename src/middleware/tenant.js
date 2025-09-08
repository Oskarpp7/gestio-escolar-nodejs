const { Tenant } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware multi-tenant
 * Extreu i valida el tenant des del codi d'accés o header
 */
class TenantMiddleware {
  
  // Cache dels tenants per millorar rendiment (definides després de la classe)
  
  /**
   * Extreure tenant del request
   * Pot venir de:
   * 1. Header X-Tenant-Code
   * 2. Query parameter tenant_code  
   * 3. Body tenant_code
   * 4. Subdomain (opcional)
   */
  static async extractTenant(req, res, next) {
    try {
      let tenantCode = null;
      
      // 1. Intentar obtenir des del header
      tenantCode = req.headers['x-tenant-code'];
      
      // 2. Si no, des del query parameter
      if (!tenantCode) {
        tenantCode = req.query.tenant_code;
      }
      
      // 3. Si no, des del body (per POST/PUT)
      if (!tenantCode && req.body) {
        tenantCode = req.body.tenant_code;
      }
      
      // 4. Intentar extreure des del subdomain (opcional)
      if (!tenantCode) {
        const host = req.headers.host;
        if (host && host.includes('.')) {
          const subdomain = host.split('.')[0];
          // Només si el subdomain sembla un codi de centre
          if (/^[A-Z]\d{3,4}$/i.test(subdomain)) {
            tenantCode = subdomain;
          }
        }
      }
      
      // Si no trobem codi de tenant, continuar sense tenant (per routes públiques)
      if (!tenantCode) {
        req.tenant = null;
        req.tenantId = null;
        return next();
      }
      
      // Normalitzar codi
      tenantCode = tenantCode.toUpperCase().trim();
      
      // Validar format del codi
      if (!/^[A-Z0-9]{3,10}$/i.test(tenantCode)) {
        return res.status(400).json({
          success: false,
          message: 'Format de codi de centre invàlid'
        });
      }
      
      // Buscar tenant (amb cache)
      const tenant = await TenantMiddleware.findTenantWithCache(tenantCode);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Centre educatiu no trobat'
        });
      }
      
      // Verificar que el tenant estigui actiu
      if (!tenant.isActive()) {
        return res.status(403).json({
          success: false,
          message: 'Centre educatiu inactiu o suspès'
        });
      }
      
      // Afegir tenant al request
      req.tenant = tenant;
      req.tenantId = tenant.id;
      req.tenantCode = tenant.code;
      
      // Log per debugging (només en desenvolupament)
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Tenant resolt: ${tenant.code} (${tenant.name})`);
      }
      
      next();
      
    } catch (error) {
      logger.error('Error extracting tenant:', error);
      return res.status(500).json({
        success: false,
        message: 'Error intern del servidor'
      });
    }
  }
  
  /**
   * Requerir tenant vàlid
   */
  static requireTenant(req, res, next) {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Codi de centre educatiu requerit'
      });
    }
    
    next();
  }
  
  /**
   * Validar que l'usuari pertanyi al tenant (per usar després de auth middleware)
   */
  static validateUserTenant(req, res, next) {
    if (!req.user || !req.tenant) {
      return next();
    }
    
    // SUPER_ADMIN té accés a tots els tenants
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Verificar que l'usuari pertanyi al tenant
    if (req.user.tenant_id !== req.tenant.id) {
      return res.status(403).json({
        success: false,
        message: 'Accés denegat a aquest centre educatiu'
      });
    }
    
    next();
  }
  
  /**
   * Middleware per filtrar queries per tenant
   */
  static filterByTenant(req, res, next) {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant requerit per aquesta operació'
      });
    }
    
    // Afegir tenant_id a les condicions de cerca
    if (!req.where) {
      req.where = {};
    }
    req.where.tenant_id = req.tenantId;
    
    next();
  }
  
  /**
   * Buscar tenant amb cache
   */
  static async findTenantWithCache(tenantCode) {
    const now = Date.now();
    
    // Verificar cache
    if (TenantMiddleware.tenantCache.has(tenantCode)) {
      const expiry = TenantMiddleware.cacheExpiry.get(tenantCode);
      if (expiry && now < expiry) {
        return TenantMiddleware.tenantCache.get(tenantCode);
      }
    }
    
    // Buscar a la base de dades
    const tenant = await Tenant.findByCode(tenantCode);
    
    // Guardar al cache si es troba
    if (tenant) {
      TenantMiddleware.tenantCache.set(tenantCode, tenant);
      TenantMiddleware.cacheExpiry.set(tenantCode, now + TenantMiddleware.CACHE_TTL);
    }
    
    return tenant;
  }
  
  /**
   * Netejar cache de tenant
   */
  static clearTenantCache(tenantCode = null) {
    if (tenantCode) {
      TenantMiddleware.tenantCache.delete(tenantCode);
      TenantMiddleware.cacheExpiry.delete(tenantCode);
    } else {
      TenantMiddleware.tenantCache.clear();
      TenantMiddleware.cacheExpiry.clear();
    }
    
    logger.info('Tenant cache cleared');
  }
  
  /**
   * Neteja periòdica del cache
   */
  static startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [code, expiry] of TenantMiddleware.cacheExpiry.entries()) {
        if (now >= expiry) {
          TenantMiddleware.tenantCache.delete(code);
          TenantMiddleware.cacheExpiry.delete(code);
        }
      }
      
      logger.debug(`Cache cleanup: ${TenantMiddleware.tenantCache.size} tenants cached`);
    }, 5 * 60 * 1000); // Cada 5 minuts
  }
  
  /**
   * Obtenir estadístiques del cache
   */
  static getCacheStats() {
    return {
      size: TenantMiddleware.tenantCache.size,
      entries: Array.from(TenantMiddleware.tenantCache.keys()),
      ttl: TenantMiddleware.CACHE_TTL / 1000 / 60 // en minuts
    };
  }
  
  /**
   * Middleware per validar limits del tenant
   */
  static checkTenantLimits(limitType) {
    return async (req, res, next) => {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant requerit'
        });
      }
      
      const limits = req.tenant.limits || {};
      
      switch (limitType) {
        case 'users': {
          const userCount = await req.tenant.countUsers();
          if (userCount >= (limits.max_users || Infinity)) {
            return res.status(403).json({
              success: false,
              message: 'Límit d\'usuaris assolit'
            });
          }
          break;
        }
        case 'students': {
          const studentCount = await req.tenant.countStudents();
          if (studentCount >= (limits.max_students || Infinity)) {
            return res.status(403).json({
              success: false,
              message: 'Límit d\'estudiants assolit'
            });
          }
          break;
        }
        case 'storage': {
          // TODO: Implementar càlcul d'espai utilitzat
          break;
        }
        default: {
          break;
        }
      }
      
      next();
    };
  }
  
  /**
   * Middleware per verificar funcionalitats disponibles
   */
  static requireFeature(feature) {
    return (req, res, next) => {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant requerit'
        });
      }
      
      if (!req.tenant.canUseFeature(feature)) {
        return res.status(403).json({
          success: false,
          message: `Funcionalitat '${feature}' no disponible en aquest pla`
        });
      }
      
      next();
    };
  }
}

// Definir camps estàtics fora de la classe per compatibilitat ESLint/Node
TenantMiddleware.tenantCache = new Map();
TenantMiddleware.cacheExpiry = new Map();
TenantMiddleware.CACHE_TTL = parseInt(process.env.TENANT_CACHE_TTL) || 3600000; // 1 hora

// Iniciar neteja automàtica del cache
if (process.env.NODE_ENV !== 'test') {
  TenantMiddleware.startCacheCleanup();
}

module.exports = TenantMiddleware;
