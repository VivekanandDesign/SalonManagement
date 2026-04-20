const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/productController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/low-stock', c.lowStock);
router.get('/sales', c.salesHistory);
router.post('/', authorize('ADMIN'), [body('name').notEmpty(), body('price').isFloat({ min: 0 })], validate, c.create);
router.put('/:id', authorize('ADMIN'), c.update);
router.delete('/:id', authorize('ADMIN'), c.delete);
router.post('/sales', authorize('ADMIN', 'RECEPTIONIST'), [body('productId').notEmpty(), body('quantity').isInt({ min: 1 }), body('price').isFloat({ min: 0 })], validate, c.recordSale);

module.exports = router;
