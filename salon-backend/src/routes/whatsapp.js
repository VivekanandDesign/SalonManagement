const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/whatsappController');

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/status', ctrl.status);
router.get('/qr', ctrl.qr);
router.post('/connect', ctrl.connect);
router.post('/disconnect', ctrl.disconnect);
router.post('/logout', ctrl.logout);
router.post('/send-test', ctrl.sendTest);
router.post('/send', ctrl.sendToCustomer);

module.exports = router;
