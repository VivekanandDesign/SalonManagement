const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();
router.use(authenticate);
router.use(authorize('ADMIN', 'RECEPTIONIST'));

router.get('/revenue', reportController.revenue);
router.get('/customer-breakdown', reportController.customerBreakdown);
router.get('/no-show-rate', reportController.noShowRate);
router.get('/appointment-stats', reportController.appointmentStats);
router.get('/customer-analytics', reportController.customerAnalytics);
router.get('/product-reports', reportController.productReports);
router.get('/membership-reports', reportController.membershipReports);
router.get('/discount-analytics', reportController.discountAnalytics);
router.get('/daily-summary', reportController.dailySummary);
router.get('/export/csv', reportController.exportCsv);

module.exports = router;
