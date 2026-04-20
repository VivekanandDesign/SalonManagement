const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();
router.use(authenticate);

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getById);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST'),
  [
    body('customerId').notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.serviceId').notEmpty(),
    body('items.*.price').isFloat({ min: 0 }),
    body('paymentMode').isIn(['CASH', 'UPI', 'CARD', 'PENDING']),
  ],
  validate,
  invoiceController.create
);

router.put('/:id/payment', authorize('ADMIN', 'RECEPTIONIST'), invoiceController.updatePayment);

module.exports = router;
