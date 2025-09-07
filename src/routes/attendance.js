const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Attendance, Contract, Student, User } = require('../models');
const auth = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Aplicar middleware d'autenticació i tenant a totes les rutes
router.use(auth);
router.use(tenantMiddleware);

/**
 * GET /api/attendance
 * Llistar assistència amb filtres
 */
router.get('/', [
  query('date').optional().isISO8601().withMessage('Data invàlida'),
  query('date_from').optional().isISO8601().withMessage('Data d\'inici invàlida'),
  query('date_to').optional().isISO8601().withMessage('Data final invàlida'),
  query('student_id').optional().isUUID().withMessage('ID d\'estudiant invàlid'),
  query('contract_id').optional().isUUID().withMessage('ID de contracte invàlid'),
  query('service').optional().isIn(['MENJADOR', 'ACOLLIDA']).withMessage('Servei invàlid'),
  query('status').optional().isIn(['PRESENT', 'ABSENT', 'JUSTIFIED']).withMessage('Estat invàlid'),
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
      date,
      date_from,
      date_to,
      student_id,
      contract_id,
      service,
      status,
      page = 1,
      limit = 50
    } = req.query;

    // Construir filtres
    const where = {};

    // Filtres de data
    if (date) {
      where.date = date;
    } else if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    } else {
      // Per defecte, mostrar només del mes actual
      const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
      where.date = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    if (student_id) where.student_id = student_id;
    if (contract_id) where.contract_id = contract_id;
    if (service) where.service_type = service;
    if (status) where.status = status;

    // Restriccions per famílies - només poden veure la seva assistència
    const contractWhere = { tenant_id: req.tenantId };
    
    if (req.userRole === 'FAMILIA') {
      const userStudents = await Student.findAll({
        where: { family_user_id: req.userId },
        attributes: ['id']
      });
      
      contractWhere.student_id = {
        [Op.in]: userStudents.map(s => s.id)
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: Contract,
          as: 'contract',
          where: contractWhere,
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'first_name', 'last_name', 'birth_date']
            }
          ]
        },
        {
          model: User,
          as: 'recordedByUser',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calcular estadístiques del període
    const stats = await calculateAttendanceStats(where, contractWhere);

    const totalPages = Math.ceil(count / limit);

    res.json({
      attendance: attendanceRecords,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        limit: parseInt(limit)
      }
    });

    logger.logActions.userAction(
      req.userId,
      'ATTENDANCE_LISTED',
      { filters: { date, service, status }, count },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error llistant assistència:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'han pogut carregar els registres d\'assistència'
    });
  }
});

/**
 * GET /api/attendance/daily/:date
 * Obtenir assistència per un dia específic (vista monitors)
 */
router.get('/daily/:date', [
  param('date').isISO8601().withMessage('Data invàlida'),
  query('service').optional().isIn(['MENJADOR', 'ACOLLIDA']).withMessage('Servei invàlid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només monitors i superiors poden accedir a vista diària
    if (!['MONITOR', 'COORDINADOR', 'ADMIN'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per accedir a la vista diària'
      });
    }

    const { date } = req.params;
    const { service } = req.query;

    // Obtenir contractes actius per la data
    const contractsWhere = {
      tenant_id: req.tenantId,
      status: 'ACTIU',
      start_date: { [Op.lte]: date },
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: date } }
      ]
    };

    if (service === 'MENJADOR') {
      contractsWhere.has_menjador = true;
    } else if (service === 'ACOLLIDA') {
      contractsWhere.has_acollida = true;
    }

    const contracts = await Contract.findAll({
      where: contractsWhere,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'birth_date', 'allergies']
        }
      ]
    });

    // Obtenir assistència existent per la data
    const existingAttendance = await Attendance.findAll({
      where: {
        date,
        contract_id: { [Op.in]: contracts.map(c => c.id) },
        ...(service && { service_type: service })
      },
      include: [
        {
          model: User,
          as: 'recordedByUser',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Crear mapa d'assistència existent
    const attendanceMap = new Map();
    existingAttendance.forEach(att => {
      const key = `${att.contract_id}_${att.service_type}`;
      attendanceMap.set(key, att);
    });

    // Construir llista amb estudiants i la seva assistència
    const dailyAttendance = [];
    
    contracts.forEach(contract => {
      const services = [];
      
      if (contract.has_menjador && (!service || service === 'MENJADOR')) {
        // Verificar si té menjador aquest dia de la setmana
        const dayOfWeek = moment(date).format('dddd').toLowerCase();
        const hasMenjadorToday = contract.menjador_days.includes(dayOfWeek) || contract.type === 'ESPORÀDIC';
        
        if (hasMenjadorToday) {
          const key = `${contract.id}_MENJADOR`;
          services.push({
            serviceType: 'MENJADOR',
            attendance: attendanceMap.get(key) || null,
            pricing: contract.calculateServicePrice('MENJADOR')
          });
        }
      }
      
      if (contract.has_acollida && (!service || service === 'ACOLLIDA')) {
        const key = `${contract.id}_ACOLLIDA`;
        services.push({
          serviceType: 'ACOLLIDA',
          attendance: attendanceMap.get(key) || null,
          pricing: contract.calculateServicePrice('ACOLLIDA')
        });
      }

      if (services.length > 0) {
        dailyAttendance.push({
          contract,
          student: contract.student,
          services
        });
      }
    });

    // Ordenar per nom d'estudiant
    dailyAttendance.sort((a, b) => {
      const nameA = `${a.student.last_name} ${a.student.first_name}`;
      const nameB = `${b.student.last_name} ${b.student.first_name}`;
      return nameA.localeCompare(nameB);
    });

    res.json({
      date,
      service: service || 'ALL',
      students: dailyAttendance,
      summary: {
        totalStudents: dailyAttendance.length,
        totalServices: dailyAttendance.reduce((sum, item) => sum + item.services.length, 0),
        recordedAttendance: existingAttendance.length
      }
    });

  } catch (error) {
    logger.error('Error obtenint assistència diària:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut carregar l\'assistència diària'
    });
  }
});

/**
 * POST /api/attendance
 * Registrar assistència
 */
router.post('/', [
  body('contract_id').isUUID().withMessage('ID de contracte requerit'),
  body('date').isISO8601().withMessage('Data requerida'),
  body('service_type').isIn(['MENJADOR', 'ACOLLIDA']).withMessage('Tipus de servei invàlid'),
  body('status').isIn(['PRESENT', 'ABSENT', 'JUSTIFIED']).withMessage('Estat d\'assistència invàlid'),
  body('hours_used').optional().isFloat({ min: 0 }).withMessage('Hores utilitzades invàlides'),
  body('observations').optional().isLength({ max: 500 }).withMessage('Observacions massa llargues')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només monitors i superiors poden registrar assistència
    if (!['MONITOR', 'COORDINADOR', 'ADMIN'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per registrar assistència'
      });
    }

    const {
      contract_id,
      date,
      service_type,
      status,
      hours_used = null,
      observations
    } = req.body;

    // Verificar que el contracte existeix i pertany al tenant
    const contract = await Contract.findOne({
      where: {
        id: contract_id,
        tenant_id: req.tenantId,
        status: 'ACTIU'
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
        error: 'Contracte no trobat o inactiu'
      });
    }

    // Verificar que el contracte té el servei sol·licitat
    if (service_type === 'MENJADOR' && !contract.has_menjador) {
      return res.status(400).json({
        error: 'El contracte no inclou servei de menjador'
      });
    }

    if (service_type === 'ACOLLIDA' && !contract.has_acollida) {
      return res.status(400).json({
        error: 'El contracte no inclou servei d\'acollida'
      });
    }

    // Verificar que la data està dins el període del contracte
    const requestDate = new Date(date);
    if (requestDate < contract.start_date || (contract.end_date && requestDate > contract.end_date)) {
      return res.status(400).json({
        error: 'La data està fora del període del contracte'
      });
    }

    // Verificar si ja existeix registre per aquest dia i servei
    const existingRecord = await Attendance.findOne({
      where: {
        contract_id,
        date,
        service_type
      }
    });

    if (existingRecord) {
      return res.status(400).json({
        error: 'Ja existeix un registre d\'assistència per aquest dia i servei',
        existing: existingRecord
      });
    }

    // Validar hores per acollida
    if (service_type === 'ACOLLIDA') {
      if (status === 'PRESENT' && (!hours_used || hours_used <= 0)) {
        return res.status(400).json({
          error: 'Cal especificar les hores utilitzades per al servei d\'acollida'
        });
      }
      
      if (hours_used > contract.acollida_hours && contract.type === 'FIXE') {
        return res.status(400).json({
          error: `Les hores utilitzades (${hours_used}) superen les contractades (${contract.acollida_hours})`
        });
      }
    }

    // Calcular preu
    const pricing = contract.calculateServicePrice(service_type);
    let finalPrice = 0;

    if (status === 'PRESENT') {
      if (service_type === 'MENJADOR') {
        finalPrice = pricing.unitPrice;
      } else if (service_type === 'ACOLLIDA') {
        finalPrice = pricing.unitPrice * (hours_used || 1);
      }
    }

    // Crear registre d'assistència
    const attendance = await Attendance.create({
      contract_id,
      student_id: contract.student_id,
      date: requestDate,
      service_type,
      status,
      hours_used: service_type === 'ACOLLIDA' ? hours_used : null,
      unit_price: pricing.unitPrice,
      total_price: finalPrice,
      observations,
      recorded_by: req.userId
    });

    // Carregar registre amb relacions
    const newAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        },
        {
          model: User,
          as: 'recordedByUser',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Assistència registrada correctament',
      attendance: newAttendance
    });

    // Emetre actualització via Socket.io si està disponible
    if (req.app.get('io')) {
      req.app.get('io').broadcastAttendanceUpdate(req.tenantId, {
        type: 'ATTENDANCE_RECORDED',
        attendance: newAttendance,
        date,
        service_type
      });
    }

    logger.logActions.userAction(
      req.userId,
      'ATTENDANCE_RECORDED',
      { 
        attendanceId: attendance.id,
        studentId: contract.student_id,
        date,
        service_type,
        status,
        price: finalPrice
      },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error registrant assistència:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut registrar l\'assistència'
    });
  }
});

/**
 * PUT /api/attendance/:id
 * Actualitzar registre d'assistència
 */
router.put('/:id', [
  param('id').isUUID().withMessage('ID d\'assistència invàlid'),
  body('status').optional().isIn(['PRESENT', 'ABSENT', 'JUSTIFIED']).withMessage('Estat invàlid'),
  body('hours_used').optional().isFloat({ min: 0 }).withMessage('Hores utilitzades invàlides'),
  body('observations').optional().isLength({ max: 500 }).withMessage('Observacions massa llargues')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només monitors i superiors poden actualitzar assistència
    if (!['MONITOR', 'COORDINADOR', 'ADMIN'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per actualitzar assistència'
      });
    }

    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          where: { tenant_id: req.tenantId },
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        error: 'Registre d\'assistència no trobat'
      });
    }

    const { status, hours_used, observations } = req.body;
    const updates = {};

    if (status !== undefined) updates.status = status;
    if (hours_used !== undefined) updates.hours_used = hours_used;
    if (observations !== undefined) updates.observations = observations;

    // Recalcular preu si canvia l'estat o les hores
    if (status !== undefined || hours_used !== undefined) {
      const finalStatus = status || attendance.status;
      const finalHours = hours_used !== undefined ? hours_used : attendance.hours_used;
      
      let newPrice = 0;
      if (finalStatus === 'PRESENT') {
        if (attendance.service_type === 'MENJADOR') {
          newPrice = attendance.unit_price;
        } else if (attendance.service_type === 'ACOLLIDA') {
          newPrice = attendance.unit_price * (finalHours || 1);
        }
      }
      
      updates.total_price = newPrice;
    }

    await attendance.update(updates);
    await attendance.reload();

    res.json({
      message: 'Assistència actualitzada correctament',
      attendance
    });

    // Emetre actualització via Socket.io
    if (req.app.get('io')) {
      req.app.get('io').broadcastAttendanceUpdate(req.tenantId, {
        type: 'ATTENDANCE_UPDATED',
        attendance,
        updates: Object.keys(updates)
      });
    }

    logger.logActions.userAction(
      req.userId,
      'ATTENDANCE_UPDATED',
      { attendanceId: attendance.id, updates: Object.keys(updates) },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error actualitzant assistència:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut actualitzar l\'assistència'
    });
  }
});

/**
 * DELETE /api/attendance/:id
 * Eliminar registre d'assistència (soft delete)
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('ID d\'assistència invàlid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dades de validació incorrectes',
        details: errors.array()
      });
    }

    // Només coordinadors i administradors poden eliminar assistència
    if (!['COORDINADOR', 'ADMIN'].includes(req.userRole)) {
      return res.status(403).json({
        error: 'Permisos insuficients per eliminar assistència'
      });
    }

    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          where: { tenant_id: req.tenantId }
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        error: 'Registre d\'assistència no trobat'
      });
    }

    await attendance.destroy();

    res.json({
      message: 'Registre d\'assistència eliminat correctament'
    });

    logger.logActions.userAction(
      req.userId,
      'ATTENDANCE_DELETED',
      { attendanceId: attendance.id, date: attendance.date },
      req.tenantId
    );

  } catch (error) {
    logger.error('Error eliminant assistència:', error);
    res.status(500).json({
      error: 'Error intern del servidor',
      message: 'No s\'ha pogut eliminar el registre'
    });
  }
});

/**
 * Funció auxiliar per calcular estadístiques d'assistència
 */
async function calculateAttendanceStats(where, contractWhere) {
  const totalRecords = await Attendance.count({
    where,
    include: [
      {
        model: Contract,
        as: 'contract',
        where: contractWhere
      }
    ]
  });

  const presentRecords = await Attendance.count({
    where: { ...where, status: 'PRESENT' },
    include: [
      {
        model: Contract,
        as: 'contract',
        where: contractWhere
      }
    ]
  });

  const absentRecords = await Attendance.count({
    where: { ...where, status: 'ABSENT' },
    include: [
      {
        model: Contract,
        as: 'contract',
        where: contractWhere
      }
    ]
  });

  const totalRevenue = await Attendance.sum('total_price', {
    where: { ...where, status: 'PRESENT' },
    include: [
      {
        model: Contract,
        as: 'contract',
        where: contractWhere
      }
    ]
  });

  return {
    totalRecords,
    presentRecords,
    absentRecords,
    justifiedRecords: totalRecords - presentRecords - absentRecords,
    attendanceRate: totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(2) : 0,
    totalRevenue: totalRevenue || 0
  };
}

module.exports = router;
