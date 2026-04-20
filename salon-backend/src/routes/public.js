const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const publicController = require('../controllers/publicController');
const feedbackController = require('../controllers/feedbackController');

const router = express.Router();

// No auth middleware — all routes are public

router.get('/salon', publicController.salonInfo);
router.get('/services', publicController.services);
router.get('/stylists', publicController.stylists);
router.get('/slots', publicController.slots);

// Feedback (public)
router.get('/feedback/:appointmentId', feedbackController.getAppointmentForFeedback);
router.post(
  '/feedback',
  [
    body('appointmentId').notEmpty().withMessage('Appointment ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').optional().trim(),
  ],
  validate,
  feedbackController.submit
);

router.post(
  '/book',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('serviceIds').isArray({ min: 1 }).withMessage('At least one service is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('startTime').notEmpty().withMessage('Time is required'),
  ],
  validate,
  publicController.book
);

module.exports = router;
