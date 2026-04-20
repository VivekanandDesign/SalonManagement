const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const loyaltyController = require('../controllers/loyaltyController');

const router = express.Router();
router.use(authenticate);

// Configs
router.get('/configs', loyaltyController.listConfigs);
router.post('/configs', authorize('ADMIN'), loyaltyController.createConfig);
router.put('/configs/:id', authorize('ADMIN'), loyaltyController.updateConfig);
router.delete('/configs/:id', authorize('ADMIN'), loyaltyController.deleteConfig);

// Rewards
router.get('/rewards', loyaltyController.listRewards);
router.patch('/rewards/:id/redeem', loyaltyController.redeemReward);

module.exports = router;
