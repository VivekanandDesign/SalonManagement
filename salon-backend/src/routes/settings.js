const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Public route — no auth needed (branding info only)
router.get('/public', settingsController.getPublic);

router.use(authenticate);

router.get('/', settingsController.get);
router.put('/', authorize('ADMIN'), settingsController.update);
router.get('/backup', authorize('ADMIN'), settingsController.backup);

module.exports = router;
