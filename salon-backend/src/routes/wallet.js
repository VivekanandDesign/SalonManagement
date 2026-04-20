const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/walletController');

const router = express.Router();
router.use(authenticate);

router.get('/:customerId', c.getWallet);
router.post('/topup', authorize('ADMIN', 'RECEPTIONIST'), [body('customerId').notEmpty(), body('amount').isFloat({ min: 1 })], validate, c.topUp);
router.post('/deduct', authorize('ADMIN', 'RECEPTIONIST'), [body('customerId').notEmpty(), body('amount').isFloat({ min: 1 })], validate, c.deduct);
router.post('/bonus', authorize('ADMIN'), [body('customerId').notEmpty(), body('amount').isFloat({ min: 1 })], validate, c.addBonus);

module.exports = router;
