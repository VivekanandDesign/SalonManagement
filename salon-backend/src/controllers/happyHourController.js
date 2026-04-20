const prisma = require('../config/db');

const happyHourController = {
  async list(_req, res, next) {
    try {
      const rules = await prisma.happyHour.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ data: rules });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, daysOfWeek, startTime, endTime, discountType, discountValue } = req.body;
      const rule = await prisma.happyHour.create({
        data: {
          name,
          daysOfWeek: JSON.stringify(daysOfWeek),
          startTime,
          endTime,
          discountType,
          discountValue,
        },
      });
      res.status(201).json(rule);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { name, daysOfWeek, startTime, endTime, discountType, discountValue, isActive } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (daysOfWeek !== undefined) data.daysOfWeek = JSON.stringify(daysOfWeek);
      if (startTime !== undefined) data.startTime = startTime;
      if (endTime !== undefined) data.endTime = endTime;
      if (discountType !== undefined) data.discountType = discountType;
      if (discountValue !== undefined) data.discountValue = discountValue;
      if (isActive !== undefined) data.isActive = isActive;

      const rule = await prisma.happyHour.update({ where: { id: req.params.id }, data });
      res.json(rule);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await prisma.happyHour.delete({ where: { id: req.params.id } });
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  },

  // Check if any happy hour is active right now (used during billing)
  async checkCurrent(_req, res, next) {
    try {
      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = dayNames[now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

      const rules = await prisma.happyHour.findMany({ where: { isActive: true } });
      const active = rules.filter(r => {
        const days = JSON.parse(r.daysOfWeek);
        return days.includes(today) && currentTime >= r.startTime && currentTime <= r.endTime;
      });

      res.json({ active: active.length > 0, rules: active });
    } catch (err) { next(err); }
  },
};

module.exports = happyHourController;
