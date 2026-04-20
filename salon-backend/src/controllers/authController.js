const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { generateOTP, sendVerificationEmail } = require('../utils/email');

const OTP_EXPIRY_MINUTES = 10;

const authController = {
  /**
   * Public signup — creates OWNER role for first user, CUSTOMER for others (open-source deployment).
   * Staff users are created by admins/owners via the staff management UI.
   * Account is unverified until OTP is confirmed.
   */
  async register(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // If user exists but not verified, allow resending OTP
        if (!existing.isVerified && existing.provider === 'LOCAL') {
          const otp = generateOTP();
          const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
          await prisma.user.update({
            where: { email },
            data: { verificationOtp: otp, otpExpiresAt },
          });
          await sendVerificationEmail(email, otp, existing.name);
          return res.status(200).json({
            message: 'Account exists but is not verified. A new OTP has been sent.',
            requiresVerification: true,
            email,
          });
        }
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Check if this is the first user (for open-source deployment)
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;

      const user = await prisma.user.create({
        data: {
          name, email, password: hashedPassword, phone,
          role: isFirstUser ? 'OWNER' : 'CUSTOMER', provider: 'LOCAL',
          isVerified: false,
          verificationOtp: otp,
          otpExpiresAt,
        },
        select: { id: true, name: true, email: true, role: true, avatar: true },
      });

      await sendVerificationEmail(email, otp, name);

      res.status(201).json({
        message: 'Account created. Please verify your email with the OTP sent.',
        requiresVerification: true,
        email,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify OTP and activate account
   */
  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: 'Account is already verified' });
      }

      if (!user.verificationOtp || !user.otpExpiresAt) {
        return res.status(400).json({ error: 'No OTP request found. Please request a new one.' });
      }

      if (new Date() > user.otpExpiresAt) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (user.verificationOtp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
      }

      // Mark as verified and clear OTP fields
      const verified = await prisma.user.update({
        where: { email },
        data: { isVerified: true, verificationOtp: null, otpExpiresAt: null },
        select: { id: true, name: true, email: true, role: true, avatar: true },
      });

      const token = generateToken(verified);
      res.json({ user: verified, token, message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resend OTP for unverified accounts
   */
  async resendOtp(req, res, next) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: 'Account is already verified' });
      }

      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: { verificationOtp: otp, otpExpiresAt },
      });

      await sendVerificationEmail(email, otp, user.name);

      res.json({ message: 'A new OTP has been sent to your email' });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // OAuth-only accounts can't login with password
      if (!user.password) {
        const providerName = user.provider === 'GOOGLE' ? 'Google' : user.provider === 'FACEBOOK' ? 'Facebook' : 'social login';
        return res.status(401).json({ error: `This account uses ${providerName}. Please sign in with ${providerName}.` });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check email verification for LOCAL accounts
      if (user.provider === 'LOCAL' && !user.isVerified) {
        // Auto-send a new OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await prisma.user.update({
          where: { email },
          data: { verificationOtp: otp, otpExpiresAt },
        });
        await sendVerificationEmail(email, otp, user.name);

        return res.status(403).json({
          error: 'Please verify your email before logging in. A new OTP has been sent.',
          requiresVerification: true,
          email,
        });
      }

      const token = generateToken(user);
      res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
        token,
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, avatar: true, provider: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      // OAuth users setting password for first time
      if (!user.password) {
        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
          where: { id: req.user.id },
          data: { password: hashed },
        });
        return res.json({ message: 'Password set successfully' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashed },
      });

      res.json({ message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
