const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/commissionController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/summary', c.summary);
router.post('/calculate', authorize('ADMIN', 'RECEPTIONIST'), [body('invoiceId').notEmpty()], validate, c.calculate);

// Tips
router.get('/tips', c.listTips);
router.post('/tips', authorize('ADMIN', 'RECEPTIONIST'), [body('userId').notEmpty(), body('amount').isFloat({ min: 1 })], validate, c.addTip);

module.exports = router;
