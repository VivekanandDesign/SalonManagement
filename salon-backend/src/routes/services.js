const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

const router = express.Router();
router.use(authenticate);

// Categories
router.get('/categories', serviceController.listCategories);
router.post(
  '/categories',
  authorize('ADMIN'),
  [body('name').trim().notEmpty()],
  validate,
  serviceController.createCategory
);
router.put('/categories/:id', authorize('ADMIN'), serviceController.updateCategory);
router.delete('/categories/:id', authorize('ADMIN'), serviceController.deleteCategory);

// Combos (before /:id to avoid conflicts)
router.get('/combos/all', serviceController.listCombos);
router.post('/combos', authorize('ADMIN'), serviceController.createCombo);
router.put('/combos/:id', authorize('ADMIN'), serviceController.updateCombo);
router.delete('/combos/:id', authorize('ADMIN'), serviceController.deleteCombo);

// Services
router.get('/', serviceController.list);
router.get('/:id', serviceController.getById);
router.post(
  '/',
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('categoryId').notEmpty(),
    body('duration').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
  ],
  validate,
  serviceController.create
);
router.put('/:id', authorize('ADMIN'), serviceController.update);
router.delete('/:id', authorize('ADMIN'), serviceController.remove);

module.exports = router;
