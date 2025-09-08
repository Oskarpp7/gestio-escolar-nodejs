const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Student, User, Attendance } = require('../models');

// GET /api/family/dashboard
// Retorna dades bàsiques per al dashboard de família
router.get(
  '/dashboard',
  auth.verifyToken,
  auth.requireRole('FAMILIA', 'ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenant_id;
    const familyUserId = req.user?.id;

    if (!tenantId || !familyUserId) {
      return res.status(400).json({ success: false, message: 'Falten dades de tenant o usuari' });
    }

    // Cercar fills vinculats a l'usuari família en aquest tenant (actius)
    const students = await Student.findAll({
      where: { tenant_id: tenantId, status: 'active' },
      attributes: ['id', 'first_name', 'last_name', 'class_group', 'academic_year', 'photo_url'],
      include: [
        {
          model: User,
          as: 'families',
          attributes: [],
          through: { attributes: [] },
          where: { id: familyUserId },
          required: true
        }
      ],
      order: [['last_name', 'ASC'], ['first_name', 'ASC']]
    });

    const children = students.map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      classroom: s.class_group || null,
      photoUrl: s.photo_url || null
    }));

    // Si no hi ha fills, retornar estructura bàsica
    if (children.length === 0) {
      return res.json({
        success: true,
        data: {
          children: [],
          weeklyAttendance: {},
          family: {
            name: req.user?.name || null,
            centre: req.tenant?.name || null
          }
        }
      });
    }

    // Calcular dates de la setmana actual (Dl-Dv)
    const today = new Date();
    const day = today.getDay(); // 0=dg,1=dl,...
    const diffToMonday = (day + 6) % 7; // dies enrere fins dilluns
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv'];
    const weekDates = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    const startOfWeek = weekDates[0].toISOString().slice(0, 10);
    const endOfWeek = weekDates[4].toISOString().slice(0, 10);

    const studentIds = children.map((c) => c.id);

    // Obtenir assistència de la setmana per a tots els fills
    const attendance = await Attendance.findAll({
      where: {
        tenant_id: tenantId,
        student_id: { [Op.in]: studentIds },
        attendance_date: { [Op.between]: [startOfWeek, endOfWeek] }
      },
      attributes: ['student_id', 'attendance_date', 'status'],
      order: [['attendance_date', 'ASC']]
    });

    // Helper per saber si és present segons status
    const isPresent = (status) => status === 'F' || status === 'EE' || status === 'ACE';

    // Construir mapa d'assistència per estudiant
    const weeklyAttendance = {};
    for (const child of children) {
      weeklyAttendance[child.id] = days.map((label) => ({ label, present: false }));
    }

    attendance.forEach((rec) => {
      const idx = weekDates.findIndex((d) => d.toISOString().slice(0, 10) === rec.attendance_date);
      if (idx >= 0 && weeklyAttendance[rec.student_id]) {
        weeklyAttendance[rec.student_id][idx] = {
          label: days[idx],
          present: isPresent(rec.status)
        };
      }
    });

    const data = {
      children,
      weeklyAttendance,
      family: {
        name: req.user?.name || null,
        centre: req.tenant?.name || null
      }
    };

    return res.json({ success: true, data });
  } catch (error) {
    // No usar logger aquí per simplicitat; es pot afegir si cal
    return res.status(500).json({ success: false, message: 'Error carregant dashboard família' });
  }
}
);

module.exports = router;
