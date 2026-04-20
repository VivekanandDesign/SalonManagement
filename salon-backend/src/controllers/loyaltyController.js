const prisma = require('../config/db');

const loyaltyController = {
  async listConfigs(req, res, next) {
    try {
      const configs = await prisma.loyaltyConfig.findMany({ orderBy: { visitThreshold: 'asc' } });
      res.json({ data: configs });
    } catch (err) { next(err); }
  },

  async createConfig(req, res, next) {
    try {
      const { milestoneName, visitThreshold, discountType, discountValue } = req.body;
      const config = await prisma.loyaltyConfig.create({
        data: { milestoneName, visitThreshold, discountType, discountValue },
      });
      res.status(201).json(config);
    } catch (err) { next(err); }
  },

  async updateConfig(req, res, next) {
    try {
      const config = await prisma.loyaltyConfig.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(config);
    } catch (err) { next(err); }
  },

  async deleteConfig(req, res, next) {
    try {
      await prisma.loyaltyConfig.delete({ where: { id: req.params.id } });
      res.json({ message: 'Loyalty config deleted' });
    } catch (err) { next(err); }
  },

  async listRewards(req, res, next) {
    try {
      const { customerId, redeemed } = req.query;
      const where = {};
      if (customerId) where.customerId = customerId;
      if (redeemed !== undefined) where.isRedeemed = redeemed === 'true';

      const rewards = await prisma.loyaltyReward.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          loyaltyConfig: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: rewards });
    } catch (err) { next(err); }
  },

  async redeemReward(req, res, next) {
    try {
      const reward = await prisma.loyaltyReward.update({
        where: { id: req.params.id },
        data: { isRedeemed: true, redeemedAt: new Date() },
      });
      res.json(reward);
    } catch (err) { next(err); }
  },
};

module.exports = loyaltyController;
