const express = require('express');
const router = express.Router();

// Placeholder per altres routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Informes route - En desenvolupament'
  });
});

module.exports = router;
