const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();
router.use(authenticate);

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST'),
  [
    body('customerId').optional(),
    body('customerName').optional().isString(),
    body('stylistId').notEmpty(),
    body('date').notEmpty(),
    body('startTime').notEmpty(),
    body('serviceIds').isArray({ min: 1 }),
  ],
  validate,
  appointmentController.create
);

router.put('/:id', authorize('ADMIN', 'RECEPTIONIST'), appointmentController.update);
router.patch('/:id/status', appointmentController.updateStatus);
router.delete('/:id', authorize('ADMIN', 'RECEPTIONIST'), appointmentController.cancel);

module.exports = router;
