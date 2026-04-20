const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/giftVoucherController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', authorize('ADMIN', 'RECEPTIONIST'), [body('amount').isFloat({ min: 1 })], validate, c.create);
router.post('/validate', c.validate);
router.post('/redeem', authorize('ADMIN', 'RECEPTIONIST'), [body('code').notEmpty(), body('amount').isFloat({ min: 0 })], validate, c.redeem);

module.exports = router;
