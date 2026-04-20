const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/referralController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/stats', c.stats);
router.post('/', authorize('ADMIN', 'RECEPTIONIST'), c.create);
router.patch('/:id/convert', authorize('ADMIN', 'RECEPTIONIST'), c.convert);

module.exports = router;
