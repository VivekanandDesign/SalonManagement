const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

const router = express.Router();
router.use(authenticate);

// Categories
router.get('/categories', expenseController.categories);

// Summary & trend
router.get('/summary', authorize('ADMIN'), expenseController.summary);
router.get('/monthly-trend', authorize('ADMIN'), expenseController.monthlyTrend);

// CRUD
router.get('/', expenseController.list);
router.get('/:id', expenseController.getById);

router.post('/',
  authorize('ADMIN'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('date').notEmpty().withMessage('Date is required'),
    body('categoryId').notEmpty().withMessage('Category is required'),
  ],
  validate,
  expenseController.create
);

router.put('/:id',
  authorize('ADMIN'),
  expenseController.update
);

router.delete('/:id',
  authorize('ADMIN'),
  expenseController.delete
);

module.exports = router;
