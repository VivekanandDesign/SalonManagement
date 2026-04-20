const express = require('express');
const { authenticate } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

const router = express.Router();

// Protected routes (admin panel)
router.get('/', authenticate, feedbackController.list);
router.get('/stats', authenticate, feedbackController.stats);

module.exports = router;
