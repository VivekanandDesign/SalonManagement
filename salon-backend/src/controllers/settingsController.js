const prisma = require('../config/db');

const settingsController = {
  // Public — returns only branding info (no auth required)
  async getPublic(req, res, next) {
    try {
      let settings = await prisma.settings.findFirst();
      if (!settings) settings = await prisma.settings.create({ data: {} });
      res.json({ salonName: settings.salonName, tagline: settings.tagline, logo: settings.logo });
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      let settings = await prisma.settings.findFirst();
      if (!settings) {
        settings = await prisma.settings.create({ data: {} });
      }
      // Parse workingHours JSON for the client
      const result = { ...settings };
      if (result.workingHours) {
        try { result.workingHours = JSON.parse(result.workingHours); } catch {}
      }
      res.json(result);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      let existing = await prisma.settings.findFirst();
      if (!existing) {
        existing = await prisma.settings.create({ data: {} });
      }

      const data = { ...req.body };
      // Serialize workingHours object to JSON string
      if (data.workingHours && typeof data.workingHours === 'object') {
        data.workingHours = JSON.stringify(data.workingHours);
      }

      const settings = await prisma.settings.update({
        where: { id: existing.id },
        data,
      });
      res.json(settings);
    } catch (err) { next(err); }
  },

  async backup(req, res, next) {
    try {
      const [customers, services, categories, appointments, invoices, staff, loyaltyConfigs, loyaltyRewards, messages, settings, combos] = await Promise.all([
        prisma.customer.findMany(),
        prisma.service.findMany({ include: { category: true } }),
        prisma.serviceCategory.findMany(),
        prisma.appointment.findMany({ include: { services: { include: { service: true } }, stylist: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } } }),
        prisma.invoice.findMany({ include: { items: { include: { service: true } }, customer: { select: { id: true, name: true } } } }),
        prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true } }),
        prisma.loyaltyConfig.findMany(),
        prisma.loyaltyReward.findMany(),
        prisma.messageLog.findMany(),
        prisma.settings.findFirst(),
        prisma.combo.findMany({ include: { items: { include: { service: true } } } }),
      ]);

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { customers, services, categories, appointments, invoices, staff, loyaltyConfigs, loyaltyRewards, messages, settings, combos },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=salon-backup-${new Date().toISOString().slice(0, 10)}.json`);
      res.json(backup);
    } catch (err) { next(err); }
  },
};

module.exports = settingsController;
