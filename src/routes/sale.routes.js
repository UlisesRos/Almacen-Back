const express = require('express');
const router = express.Router();
const { getSalesStats, getTodaySales, getSale, getSales, createSale, cancelSale, sendSaleEmail } = require('../controllers/sale.controller');
const { protect } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas especiales (deben ir antes de las rutas con :id)
router.get('/stats/summary', getSalesStats);
router.get('/today', getTodaySales);

// Rutas CRUD básicas
router.route('/')
  .get( getSales )
  .post( createSale );

router.route('/:id')
  .get( getSale )
  .delete( cancelSale );

router.post('/:id/send-email', sendSaleEmail);

module.exports = router;