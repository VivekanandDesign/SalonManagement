const prisma = require('../config/db');

const vipTierController = {
  // GET /api/vip-tiers — list tier configs
  async list(_req, res, next) {
    try {
      const tiers = await prisma.vIPTierConfig.findMany({ orderBy: { minVisits: 'asc' } });
      res.json({ data: tiers });
    } catch (err) { next(err); }
  },

  // PUT /api/vip-tiers — upsert all tier configs at once
  async upsert(req, res, next) {
    try {
      const { tiers } = req.body; // [{ tier, minVisits, minSpent, discountPercent, perks }]
      const results = [];
      for (const t of tiers) {
        const result = await prisma.vIPTierConfig.upsert({
          where: { tier: t.tier },
          create: { tier: t.tier, minVisits: t.minVisits || 0, minSpent: t.minSpent || 0, discountPercent: t.discountPercent || 0, perks: t.perks ? JSON.stringify(t.perks) : null },
          update: { minVisits: t.minVisits, minSpent: t.minSpent, discountPercent: t.discountPercent, perks: t.perks ? JSON.stringify(t.perks) : null },
        });
        results.push(result);
      }
      res.json({ data: results });
    } catch (err) { next(err); }
  },

  // POST /api/vip-tiers/auto-promote — run auto-promotion for all customers
  async autoPromote(_req, res, next) {
    try {
      const tiers = await prisma.vIPTierConfig.findMany({ orderBy: { minVisits: 'desc' } });
      if (tiers.length === 0) return res.json({ promoted: 0 });

      const customers = await prisma.customer.findMany({
        where: { tag: { not: 'INACTIVE' } },
        select: { id: true, totalVisits: true, totalSpent: true, vipTier: true },
      });

      let promoted = 0;
      for (const customer of customers) {
        let newTier = 'NONE';
        for (const tierConfig of tiers) {
          if (customer.totalVisits >= tierConfig.minVisits && customer.totalSpent >= tierConfig.minSpent) {
            newTier = tierConfig.tier;
            break;
          }
        }
        if (newTier !== customer.vipTier) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { vipTier: newTier, tag: newTier !== 'NONE' ? 'VIP' : undefined },
          });
          promoted++;
        }
      }

      res.json({ promoted, total: customers.length });
    } catch (err) { next(err); }
  },
};

module.exports = vipTierController;
