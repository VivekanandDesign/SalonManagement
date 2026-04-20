const prisma = require('../config/db');

const referralController = {
  async list(req, res, next) {
    try {
      const { converted } = req.query;
      const where = {};
      if (converted === 'true') where.isConverted = true;
      if (converted === 'false') where.isConverted = false;

      const referrals = await prisma.referral.findMany({
        where,
        include: {
          referrer: { select: { id: true, name: true, phone: true } },
          referred: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: referrals });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { referrerId, referredId } = req.body;
      const settings = await prisma.settings.findFirst();
      const rewardAmount = settings?.referralRewardAmount || 200;

      const referral = await prisma.referral.create({
        data: {
          referrerId,
          referredId,
          referrerReward: rewardAmount,
          referredReward: rewardAmount,
        },
        include: { referrer: { select: { name: true } }, referred: { select: { name: true } } },
      });
      res.status(201).json(referral);
    } catch (err) { next(err); }
  },

  // Mark referral as converted (referred customer completed their first visit)
  async convert(req, res, next) {
    try {
      const referral = await prisma.referral.update({
        where: { id: req.params.id },
        data: { isConverted: true, convertedAt: new Date() },
      });

      // Credit wallet bonus to both
      if (referral.referrerReward) {
        await prisma.customer.update({
          where: { id: referral.referrerId },
          data: { walletBalance: { increment: referral.referrerReward } },
        });
        await prisma.walletTransaction.create({
          data: {
            customerId: referral.referrerId,
            type: 'BONUS',
            amount: referral.referrerReward,
            balance: 0, // will be overwritten
            description: 'Referral reward',
          },
        });
        // Fix balance
        const referrerCustomer = await prisma.customer.findUnique({ where: { id: referral.referrerId } });
        await prisma.walletTransaction.updateMany({
          where: { customerId: referral.referrerId, description: 'Referral reward' },
          data: { balance: referrerCustomer.walletBalance },
        });
      }

      res.json(referral);
    } catch (err) { next(err); }
  },

  // Stats
  async stats(_req, res, next) {
    try {
      const [total, converted, totalRewards] = await Promise.all([
        prisma.referral.count(),
        prisma.referral.count({ where: { isConverted: true } }),
        prisma.referral.aggregate({ where: { isConverted: true }, _sum: { referrerReward: true } }),
      ]);
      res.json({ total, converted, conversionRate: total > 0 ? Math.round(converted / total * 100) : 0, totalRewardsPaid: totalRewards._sum.referrerReward || 0 });
    } catch (err) { next(err); }
  },
};

module.exports = referralController;
