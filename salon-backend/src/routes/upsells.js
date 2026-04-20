const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/upsellController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/suggestions', c.getSuggestions);
router.post('/', authorize('ADMIN'), c.create);
router.put('/:id', authorize('ADMIN'), c.update);
router.delete('/:id', authorize('ADMIN'), c.delete);

module.exports = router;
