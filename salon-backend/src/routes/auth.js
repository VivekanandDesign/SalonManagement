const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  authController.register
);

// OAuth routes
router.post('/google', oauthController.google);
router.post('/facebook', oauthController.facebook);

// Email verification routes
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validate,
  authController.resendOtp
);

router.get('/me', authenticate, authController.me);

router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').optional(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validate,
  authController.changePassword
);

module.exports = router;
