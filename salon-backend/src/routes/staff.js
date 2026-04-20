const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const staffController = require('../controllers/staffController');

const router = express.Router();
router.use(authenticate);

router.get('/', staffController.list);
router.get('/:id', staffController.getById);
router.get('/:id/schedule', staffController.getSchedule);

router.post(
  '/',
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['ADMIN', 'RECEPTIONIST', 'STYLIST']),
  ],
  validate,
  staffController.create
);

router.put('/:id', authorize('ADMIN'), staffController.update);
router.delete('/:id', authorize('ADMIN'), staffController.deactivate);

// Attendance
router.post('/:id/attendance', authorize('ADMIN', 'RECEPTIONIST'), staffController.markAttendance);
router.get('/:id/attendance', staffController.getAttendance);

module.exports = router;
