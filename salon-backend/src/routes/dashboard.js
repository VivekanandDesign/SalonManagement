const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticate);

router.get('/summary', dashboardController.summary);
router.get('/revenue-chart', dashboardController.revenueChart);
router.get('/top-services', dashboardController.topServices);
router.get('/stylist-performance', dashboardController.stylistPerformance);
router.get('/customer-breakdown', dashboardController.customerBreakdown);

module.exports = router;
