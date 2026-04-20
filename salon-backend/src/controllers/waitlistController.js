const prisma = require('../config/db');

const waitlistController = {
  async list(req, res, next) {
    try {
      const { date, fulfilled } = req.query;
      const where = {};
      if (date) where.date = new Date(date);
      if (fulfilled === 'false') where.isFulfilled = false;

      const entries = await prisma.waitlistEntry.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: entries });
    } catch (err) { next(err); }
  },

  async add(req, res, next) {
    try {
      const { customerId, date, preferredTime, serviceIds } = req.body;
      const entry = await prisma.waitlistEntry.create({
        data: {
          customerId,
          date: new Date(date),
          preferredTime,
          serviceIds: serviceIds ? JSON.stringify(serviceIds) : null,
        },
        include: { customer: { select: { name: true, phone: true } } },
      });
      res.status(201).json(entry);
    } catch (err) { next(err); }
  },

  async markNotified(req, res, next) {
    try {
      const entry = await prisma.waitlistEntry.update({
        where: { id: req.params.id },
        data: { isNotified: true },
      });
      res.json(entry);
    } catch (err) { next(err); }
  },

  async markFulfilled(req, res, next) {
    try {
      const entry = await prisma.waitlistEntry.update({
        where: { id: req.params.id },
        data: { isFulfilled: true },
      });
      res.json(entry);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await prisma.waitlistEntry.delete({ where: { id: req.params.id } });
      res.json({ message: 'Removed from waitlist' });
    } catch (err) { next(err); }
  },
};

module.exports = waitlistController;
