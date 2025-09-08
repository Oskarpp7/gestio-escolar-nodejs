const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');

// GET /api/family/dashboard
// Retorna dades bàsiques per al dashboard de família
router.get('/dashboard', auth.verifyToken, auth.requireRole('FAMILIA', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    // MVP: retornar estructura bàsica; implementació completa vindrà després
    const data = {
      children: [],
      weeklyAttendance: {},
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
});

module.exports = router;
