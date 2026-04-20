require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;

if (nodeEnv === 'production') {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('change-this')) {
    console.error('❌ FATAL: JWT_SECRET must be a strong random string (≥32 chars) in production.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL is required in production.');
    process.exit(1);
  }
} else if (!jwtSecret || jwtSecret.includes('change-this')) {
  console.warn('⚠️  WARNING: Using weak JWT_SECRET. Set a strong random secret in production!');
}

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
};
