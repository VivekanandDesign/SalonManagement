const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/vipTierController');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.put('/', authorize('ADMIN'), c.upsert);
router.post('/auto-promote', authorize('ADMIN'), c.autoPromote);

module.exports = router;
