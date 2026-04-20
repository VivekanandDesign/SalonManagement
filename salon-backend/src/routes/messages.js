const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

const router = express.Router();
router.use(authenticate);

router.get('/', messageController.list);
router.get('/stats', messageController.stats);
router.post('/send', authorize('ADMIN', 'RECEPTIONIST'), messageController.sendManual);

module.exports = router;
