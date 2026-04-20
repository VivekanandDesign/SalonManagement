const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/membershipController');

const router = express.Router();
router.use(authenticate);

// Plans
router.get('/plans', c.listPlans);
router.post('/plans', authorize('ADMIN'), [body('name').notEmpty(), body('price').isFloat({ min: 0 })], validate, c.createPlan);
router.put('/plans/:id', authorize('ADMIN'), c.updatePlan);
router.delete('/plans/:id', authorize('ADMIN'), c.deletePlan);

// Customer memberships
router.get('/', c.listCustomerMemberships);
router.post('/', authorize('ADMIN', 'RECEPTIONIST'), [body('customerId').notEmpty(), body('planId').notEmpty()], validate, c.assignMembership);
router.delete('/:id', authorize('ADMIN'), c.cancelMembership);
router.get('/check-usage', c.checkUsage);

module.exports = router;
