const express = require('express');
const { campaignController } = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', campaignController.list);
router.get('/:id', campaignController.getById);
router.post('/', campaignController.create);
router.put('/:id', campaignController.update);
router.delete('/:id', campaignController.delete);
router.post('/:id/send', campaignController.send);
router.post('/:id/cancel', campaignController.cancel);
router.get('/:id/stats', campaignController.stats);
router.post('/validate-coupon', campaignController.validateCoupon);

module.exports = router;
