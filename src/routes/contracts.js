const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Contract, Student, User, Tenant } = require('../models');
const auth = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Aplicar middleware d'autenticació i tenant a totes les rutes
router.use(auth);
router.use(tenantMiddleware);

/**
 * === CONFIGURACIÓ DE PREUS ===
 * Preus per defecte del sistema (EUR)
 */
const PRICING_CONFIG = {
  menjador: {
    fixe: 7.54,        // Preu per ús amb contracte fixe
    esporadic: 3.86,   // Preu per ús esporàdic 
    gratuito: 0        // Preu amb beca 100%
  },
  acollida: {
    fixe: 4.50,        // Preu per hora contracte fixe
    esporadic: 4.50    // Preu per hora esporàdic (mateix preu)
  },
  beques: {
    BC70: 0.30,        // 30% del preu (70% beca)
    BC100: 0          // Gratuït (100% beca)
  }
};

/**
 * GET /api/contracts
 * Llistar contractes amb filtres
 */
router.get('/', [
  query('status').optional().isIn(['ACTIU', 'INACTIU', 'FINALITZAT']),
  query('type').optional().isIn(['FIXE', 'ESPORÀDIC']),
  query('service').optional().isIn(['MENJADOR', 'ACOLLIDA', 'BOTH']),
  query('student_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    const {
      status,
      type,
      service,
      student_id,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtres
    const where = {
      tenant_id: req.tenantId
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (service) {
      if (service === 'BOTH') {
        where[Op.and] = [
          { has_menjador: true },
          { has_acollida: true }
        ];
      } else {
        where[`has_${service.toLowerCase()}`] = true;
      }
    }
    if (student_id) where.student_id = student_id;

    // Si no és ADMIN o COORDINADOR, només veure contractes propis (famílies)
    if (req.userRole === 'FAMILIA') {
      const userStudents = await Student.findAll({
        where: { family_user_id: req.userId },
        attributes: ['id']
      });
      
      where.student_id = {
        [Op.in]: userStudents.map(s => s.id)
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: contracts } = await Contract.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'birth_date']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calcular informació de paginació
    const totalPages = Math.ceil(count / limit);

    res.json({
      contracts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        limit: parseInt(limit)
      }
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACTS_LISTED',
      { filters: { status, type, service }, count },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error llistant contractes:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'han pogut carregar els contractes'
    });
  }
});

/**
 * GET /api/contracts/:id
 * Obtenir detalls d'un contracte específic
 */
router.get('/:id', [
  param('id').isUUID().withMessage('ID de contracte invàlid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    const where = {
      id: req.params.id,
      tenant_id: req.tenantId
    };

    // Restriccions per famílies
    if (req.userRole === 'FAMILIA') {
      const userStudents = await Student.findAll({
        where: { family_user_id: req.userId },
        attributes: ['id']
      });
      
      where.student_id = {
        [Op.in]: userStudents.map(s => s.id)
      };
    }

    const contract = await Contract.findOne({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'birth_date', 'allergies', 'observations']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ]
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contracte no trobat'
      });
    }

    // Calcular preus actuals basats en configuració
    const pricing = contract.calculatePricing();

    res.json({
      contract,
      pricing
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACT_VIEWED',
      { contractId: contract.id, studentId: contract.student_id },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error obtenint contracte:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut carregar el contracte'
    });
  }
});

/**
 * POST /api/contracts
 * Crear nou contracte
 */
router.post('/', [
  body('student_id').isUUID().withMessage('ID d\'estudiant requerit'),
  body('type').isIn(['FIXE', 'ESPORÀDIC']).withMessage('Tipus de contracte invàlid'),
  body('has_menjador').isBoolean().withMessage('Servei menjador requerit'),
  body('has_acollida').isBoolean().withMessage('Servei acollida requerit'),
  body('start_date').isISO8601().withMessage('Data d\'inici invàlida'),
  body('end_date').optional().isISO8601().withMessage('Data final invàlida'),
  body('menjador_days').optional().isArray().withMessage('Dies menjador han de ser un array'),
  body('acollida_hours').optional().isNumeric().withMessage('Hores d\'acollida han de ser numèriques'),
  body('scholarship_type').optional().isIn(['BC70', 'BC100']).withMessage('Tipus de beca invàlid'),
  body('observations').optional().isLength({ max: 1000 }).withMessage('Observacions massa llargues')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només ADMIN i COORDINADOR poden crear contractes
    if (!['ADMIN', 'COORDINADOR'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per crear contractes'
      });
    }

    const {
      student_id,
      type,
      has_menjador,
      has_acollida,
      start_date,
      end_date,
      menjador_days = [],
      acollida_hours = 0,
      scholarship_type,
      observations
    } = req.body;

    // Verificar que l'estudiant existeix i pertany al tenant
    const student = await Student.findOne({
      where: {
        id: student_id,
        tenant_id: req.tenantId
      }
    });

    if (!student) {
      return res.status(404).json({
        error: 'Estudiant no trobat'
      });
    }

    // Validar que almenys un servei està activat
    if (!has_menjador && !has_acollida) {
      return res.status(400).json({
        error: 'Cal activar almenys un servei (menjador o acollida)'
      });
    }

    // Validar dates
    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : null;
    
    if (endDate && endDate <= startDate) {
      return res.status(400).json({
        error: 'La data final ha de ser posterior a la data d\'inici'
      });
    }

    // Verificar contractes solapats
    const existingContract = await Contract.findOne({
      where: {
        student_id,
        status: 'ACTIU',
        start_date: {
          [Op.lte]: endDate || new Date('2099-12-31')
        },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: startDate } }
        ]
      }
    });

    if (existingContract) {
      return res.status(400).json({
        error: 'Ja existeix un contracte actiu per aquest estudiant en el període especificat'
      });
    }

    // Crear contracte
    const contract = await Contract.create({
      tenant_id: req.tenantId,
      student_id,
      type,
      has_menjador,
      has_acollida,
      start_date: startDate,
      end_date: endDate,
      menjador_days: has_menjador ? menjador_days : [],
      acollida_hours: has_acollida ? acollida_hours : 0,
      scholarship_type,
      observations,
      status: 'ACTIU',
      created_by: req.userId
    });

    // Carregar contracte amb relacions
    const newContract = await Contract.findByPk(contract.id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Contracte creat correctament',
      contract: newContract,
      pricing: newContract.calculatePricing()
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACT_CREATED',
      { 
        contractId: contract.id, 
        studentId: student_id, 
        type, 
        services: { menjador: has_menjador, acollida: has_acollida }
      },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error creant contracte:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut crear el contracte'
    });
  }
});

/**
 * PUT /api/contracts/:id
 * Actualitzar contracte existent
 */
router.put('/:id', [
  param('id').isUUID().withMessage('ID de contracte invàlid'),
  body('type').optional().isIn(['FIXE', 'ESPORÀDIC']).withMessage('Tipus de contracte invàlid'),
  body('has_menjador').optional().isBoolean().withMessage('Servei menjador ha de ser booleà'),
  body('has_acollida').optional().isBoolean().withMessage('Servei acollida ha de ser booleà'),
  body('end_date').optional().isISO8601().withMessage('Data final invàlida'),
  body('menjador_days').optional().isArray().withMessage('Dies menjador han de ser un array'),
  body('acollida_hours').optional().isNumeric().withMessage('Hores d\'acollida han de ser numèriques'),
  body('scholarship_type').optional().isIn(['BC70', 'BC100']).withMessage('Tipus de beca invàlid'),
  body('status').optional().isIn(['ACTIU', 'INACTIU', 'FINALITZAT']).withMessage('Estat invàlid'),
  body('observations').optional().isLength({ max: 1000 }).withMessage('Observacions massa llargues')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només ADMIN i COORDINADOR poden modificar contractes
    if (!['ADMIN', 'COORDINADOR'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per modificar contractes'
      });
    }

    const contract = await Contract.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contracte no trobat'
      });
    }

    const allowedUpdates = [
      'type', 'has_menjador', 'has_acollida', 'end_date',
      'menjador_days', 'acollida_hours', 'scholarship_type',
      'status', 'observations'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validar que almenys un servei està activat
    const hasMenjador = updates.has_menjador !== undefined ? updates.has_menjador : contract.has_menjador;
    const hasAcollida = updates.has_acollida !== undefined ? updates.has_acollida : contract.has_acollida;
    
    if (!hasMenjador && !hasAcollida) {
      return res.status(400).json({
        error: 'Cal mantenir almenys un servei actiu (menjador o acollida)'
      });
    }

    // Actualitzar contracte
    await contract.update(updates);
    await contract.reload();

    res.json({
      message: 'Contracte actualitzat correctament',
      contract,
      pricing: contract.calculatePricing()
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACT_UPDATED',
      { contractId: contract.id, updates: Object.keys(updates) },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error actualitzant contracte:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut actualitzar el contracte'
    });
  }
});

/**
 * DELETE /api/contracts/:id
 * Eliminar contracte (soft delete)
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('ID de contracte invàlid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només ADMIN pot eliminar contractes
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Només els administradors poden eliminar contractes'
      });
    }

    const contract = await Contract.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contracte no trobat'
      });
    }

    // Soft delete
    await contract.destroy();

    res.json({
      message: 'Contracte eliminat correctament'
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACT_DELETED',
      { contractId: contract.id, studentId: contract.student_id },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error eliminant contracte:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut eliminar el contracte'
    });
  }
});

/**
 * GET /api/contracts/:id/pricing
 * Calcular preus actualitzats per un contracte
 */
router.get('/:id/pricing', [
  param('id').isUUID().withMessage('ID de contracte invàlid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    const contract = await Contract.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contracte no trobat'
      });
    }

    const pricing = contract.calculatePricing();

    res.json({
      contractId: contract.id,
      type: contract.type,
      services: {
        menjador: contract.has_menjador,
        acollida: contract.has_acollida
      },
      scholarship: contract.scholarship_type,
      pricing,
      config: PRICING_CONFIG
    });

  } catch (error) {
    logger.error('Error calculant preus:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'han pogut calcular els preus'
    });
  }
});

/**
 * POST /api/contracts/:id/duplicate
 * Duplicar contracte per nou període
 */
router.post('/:id/duplicate', [
  param('id').isUUID().withMessage('ID de contracte invàlid'),
  body('start_date').isISO8601().withMessage('Data d\'inici requerida'),
  body('end_date').optional().isISO8601().withMessage('Data final invàlida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només ADMIN i COORDINADOR poden duplicar contractes
    if (!['ADMIN', 'COORDINADOR'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per duplicar contractes'
      });
    }

    const originalContract = await Contract.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    if (!originalContract) {
      return res.status(404).json({
        error: 'Contracte original no trobat'
      });
    }

    const { start_date, end_date } = req.body;
    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : null;

    // Crear contracte duplicat
    const duplicatedContract = await Contract.create({
      tenant_id: req.tenantId,
      student_id: originalContract.student_id,
      type: originalContract.type,
      has_menjador: originalContract.has_menjador,
      has_acollida: originalContract.has_acollida,
      start_date: startDate,
      end_date: endDate,
      menjador_days: originalContract.menjador_days,
      acollida_hours: originalContract.acollida_hours,
      scholarship_type: originalContract.scholarship_type,
      observations: `Duplicat de contracte ${originalContract.id}`,
      status: 'ACTIU',
      created_by: req.userId
    });

    // Carregar contracte amb relacions
    const newContract = await Contract.findByPk(duplicatedContract.id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Contracte duplicat correctament',
      original: originalContract.id,
      contract: newContract,
      pricing: newContract.calculatePricing()
    });

    logger.logActions.userAction(
      req.userId,
      'CONTRACT_DUPLICATED',
      { originalId: originalContract.id, newId: duplicatedContract.id },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error duplicant contracte:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut duplicar el contracte'
    });
  }
});

module.exports = router;
