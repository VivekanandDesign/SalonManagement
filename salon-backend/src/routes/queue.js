const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/queueController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', authorize('ADMIN', 'RECEPTIONIST'), c.add);
router.patch('/:id/call', authorize('ADMIN', 'RECEPTIONIST'), c.call);
router.patch('/:id/complete', authorize('ADMIN', 'RECEPTIONIST'), c.complete);
router.patch('/:id/left', authorize('ADMIN', 'RECEPTIONIST'), c.left);
router.delete('/:id', authorize('ADMIN', 'RECEPTIONIST'), c.remove);

module.exports = router;
