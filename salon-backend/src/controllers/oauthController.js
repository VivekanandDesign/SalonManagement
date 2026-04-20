const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/db');
const { generateToken } = require('../utils/jwt');
const config = require('../config');

const googleClient = new OAuth2Client(config.googleClientId);

function buildUserResponse(user) {
  const token = generateToken(user);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    token,
  };
}

const oauthController = {
  /**
   * POST /auth/google
   * Body: { credential } — Google ID token from frontend
   */
  async google(req, res, next) {
    try {
      const { credential } = req.body;
      if (!credential) return res.status(400).json({ error: 'Google credential is required' });

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      if (!email) return res.status(400).json({ error: 'Email not available from Google account' });

      // Check if user exists by googleId or email
      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
      });

      if (user) {
        // Link Google account if not already linked
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId, provider: user.provider === 'LOCAL' ? 'GOOGLE' : user.provider, avatar: user.avatar || picture },
          });
        }
        if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      } else {
        // Create new user - first user gets OWNER role for open-source deployment
        const userCount = await prisma.user.count();
        const isFirstUser = userCount === 0;
        user = await prisma.user.create({
          data: {
            name,
            email,
            googleId,
            provider: 'GOOGLE',
            avatar: picture,
            role: isFirstUser ? 'OWNER' : 'CUSTOMER',
          },
        });
      }

      res.json(buildUserResponse(user));
    } catch (err) {
      if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token') || err.message?.includes('Wrong number of segments') || err.message?.includes('Invalid value')) {
        return res.status(401).json({ error: 'Invalid or expired Google token' });
      }
      next(err);
    }
  },

  /**
   * POST /auth/facebook
   * Body: { accessToken, userID }
   */
  async facebook(req, res, next) {
    try {
      const { accessToken, userID } = req.body;
      if (!accessToken || !userID) return res.status(400).json({ error: 'Facebook access token and user ID are required' });

      // Verify token with Facebook Graph API
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${userID}?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
      );

      if (!fbRes.ok) return res.status(401).json({ error: 'Invalid Facebook token' });

      const fbData = await fbRes.json();
      if (fbData.error) return res.status(401).json({ error: 'Facebook verification failed' });

      const { id: facebookId, name, email, picture } = fbData;
      const avatar = picture?.data?.url;

      if (!email) {
        return res.status(400).json({ error: 'Email permission is required. Please allow email access in Facebook.' });
      }

      // Check if user exists by facebookId or email
      let user = await prisma.user.findFirst({
        where: { OR: [{ facebookId }, { email }] },
      });

      if (user) {
        if (!user.facebookId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { facebookId, provider: user.provider === 'LOCAL' ? 'FACEBOOK' : user.provider, avatar: user.avatar || avatar },
          });
        }
        if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      } else {
        // Create new user - first user gets OWNER role for open-source deployment
        const userCount = await prisma.user.count();
        const isFirstUser = userCount === 0;
        user = await prisma.user.create({
          data: {
            name,
            email,
            facebookId,
            provider: 'FACEBOOK',
            avatar,
            role: isFirstUser ? 'OWNER' : 'CUSTOMER',
          },
        });
      }

      res.json(buildUserResponse(user));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = oauthController;
