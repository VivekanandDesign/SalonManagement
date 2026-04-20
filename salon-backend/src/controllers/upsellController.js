const prisma = require('../config/db');

const upsellController = {
  async list(_req, res, next) {
    try {
      const upsells = await prisma.upsell.findMany({
        include: {
          baseService: { select: { id: true, name: true, price: true } },
          suggestedService: { select: { id: true, name: true, price: true } },
        },
        orderBy: { baseServiceId: 'asc' },
      });
      res.json({ data: upsells });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { baseServiceId, suggestedServiceId, prompt, discountedPrice } = req.body;
      const upsell = await prisma.upsell.create({
        data: { baseServiceId, suggestedServiceId, prompt, discountedPrice },
        include: { baseService: true, suggestedService: true },
      });
      res.status(201).json(upsell);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { prompt, discountedPrice, isActive } = req.body;
      const data = {};
      if (prompt !== undefined) data.prompt = prompt;
      if (discountedPrice !== undefined) data.discountedPrice = discountedPrice;
      if (isActive !== undefined) data.isActive = isActive;

      const upsell = await prisma.upsell.update({ where: { id: req.params.id }, data });
      res.json(upsell);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await prisma.upsell.delete({ where: { id: req.params.id } });
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  },

  // Get suggestions for services in current appointment
  async getSuggestions(req, res, next) {
    try {
      const { serviceIds } = req.query; // comma-separated
      if (!serviceIds) return res.json({ data: [] });

      const ids = serviceIds.split(',');
      const upsells = await prisma.upsell.findMany({
        where: { baseServiceId: { in: ids }, isActive: true, suggestedServiceId: { notIn: ids } },
        include: { suggestedService: { select: { id: true, name: true, price: true } } },
      });
      res.json({ data: upsells });
    } catch (err) { next(err); }
  },
};

module.exports = upsellController;
