const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

const router = express.Router();
router.use(authenticate);

router.get('/', customerController.list);

router.get('/search', customerController.search);

router.get('/:id', customerController.getById);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional({ values: 'falsy' }).isEmail(),
    body('gender').optional().isIn(['Male', 'Female', 'Other']),
    body('tag').optional().isIn(['NEW', 'REGULAR', 'VIP', 'INACTIVE']),
  ],
  validate,
  customerController.create
);

router.put(
  '/:id',
  authorize('ADMIN', 'RECEPTIONIST'),
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('email').optional({ values: 'falsy' }).isEmail(),
  ],
  validate,
  customerController.update
);

router.delete('/:id', authorize('ADMIN'), customerController.softDelete);

router.post('/referral', authorize('ADMIN', 'RECEPTIONIST'), customerController.recordReferral);

module.exports = router;
