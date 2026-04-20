const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/happyHourController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/current', c.checkCurrent);
router.post('/', authorize('ADMIN'), c.create);
router.put('/:id', authorize('ADMIN'), c.update);
router.delete('/:id', authorize('ADMIN'), c.delete);

module.exports = router;
