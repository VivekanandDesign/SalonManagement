const prisma = require('../config/db');

const membershipController = {
  // ── Plans CRUD ──
  async listPlans(_req, res, next) {
    try {
      const plans = await prisma.membershipPlan.findMany({
        include: { services: { include: { service: { select: { id: true, name: true, price: true } } } } },
        orderBy: { price: 'asc' },
      });
      res.json({ data: plans });
    } catch (err) { next(err); }
  },

  async createPlan(req, res, next) {
    try {
      const { name, description, price, durationDays, services } = req.body;
      const plan = await prisma.membershipPlan.create({
        data: {
          name, description, price, durationDays: durationDays || 30,
          services: services?.length ? { create: services.map(s => ({ serviceId: s.serviceId, usageLimit: s.usageLimit || 0 })) } : undefined,
        },
        include: { services: { include: { service: true } } },
      });
      res.status(201).json(plan);
    } catch (err) { next(err); }
  },

  async updatePlan(req, res, next) {
    try {
      const { name, description, price, durationDays, isActive, services } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (price !== undefined) data.price = price;
      if (durationDays !== undefined) data.durationDays = durationDays;
      if (isActive !== undefined) data.isActive = isActive;

      if (services) {
        await prisma.membershipPlanService.deleteMany({ where: { planId: req.params.id } });
        data.services = { create: services.map(s => ({ serviceId: s.serviceId, usageLimit: s.usageLimit || 0 })) };
      }

      const plan = await prisma.membershipPlan.update({
        where: { id: req.params.id }, data,
        include: { services: { include: { service: true } } },
      });
      res.json(plan);
    } catch (err) { next(err); }
  },

  async deletePlan(req, res, next) {
    try {
      await prisma.membershipPlan.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ message: 'Plan deactivated' });
    } catch (err) { next(err); }
  },

  // ── Customer Memberships ──
  async listCustomerMemberships(req, res, next) {
    try {
      const { customerId, active } = req.query;
      const where = {};
      if (customerId) where.customerId = customerId;
      if (active === 'true') where.isActive = true;

      const memberships = await prisma.customerMembership.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true } }, plan: { include: { services: { include: { service: true } } } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: memberships });
    } catch (err) { next(err); }
  },

  async assignMembership(req, res, next) {
    try {
      const { customerId, planId, autoRenew } = req.body;
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      const membership = await prisma.customerMembership.create({
        data: { customerId, planId, startDate, endDate, autoRenew: autoRenew ?? true, usageLog: '{}' },
        include: { plan: true, customer: { select: { id: true, name: true } } },
      });
      res.status(201).json(membership);
    } catch (err) { next(err); }
  },

  async cancelMembership(req, res, next) {
    try {
      const membership = await prisma.customerMembership.update({
        where: { id: req.params.id },
        data: { isActive: false, autoRenew: false },
      });
      res.json(membership);
    } catch (err) { next(err); }
  },

  // Check if customer has active membership covering a service
  async checkUsage(req, res, next) {
    try {
      const { customerId, serviceId } = req.query;
      const now = new Date();
      const membership = await prisma.customerMembership.findFirst({
        where: { customerId, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
        include: { plan: { include: { services: true } } },
      });
      if (!membership) return res.json({ covered: false });

      const planService = membership.plan.services.find(s => s.serviceId === serviceId);
      if (!planService) return res.json({ covered: false });

      const usage = JSON.parse(membership.usageLog || '{}');
      const used = usage[serviceId] || 0;
      const covered = planService.usageLimit === 0 || used < planService.usageLimit;

      res.json({ covered, used, limit: planService.usageLimit, membershipId: membership.id });
    } catch (err) { next(err); }
  },
};

module.exports = membershipController;
