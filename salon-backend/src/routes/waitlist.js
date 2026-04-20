const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/waitlistController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', authorize('ADMIN', 'RECEPTIONIST'), c.add);
router.patch('/:id/notified', authorize('ADMIN', 'RECEPTIONIST'), c.markNotified);
router.patch('/:id/fulfilled', authorize('ADMIN', 'RECEPTIONIST'), c.markFulfilled);
router.delete('/:id', authorize('ADMIN', 'RECEPTIONIST'), c.remove);

module.exports = router;
