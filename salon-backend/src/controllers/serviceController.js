const prisma = require('../config/db');

const serviceController = {
  // ── Categories ──
  async listCategories(req, res, next) {
    try {
      const categories = await prisma.serviceCategory.findMany({
        include: { services: true },
        orderBy: { name: 'asc' },
      });
      res.json({ data: categories });
    } catch (err) { next(err); }
  },

  async createCategory(req, res, next) {
    try {
      const category = await prisma.serviceCategory.create({ data: { name: req.body.name } });
      res.status(201).json(category);
    } catch (err) { next(err); }
  },

  async updateCategory(req, res, next) {
    try {
      const category = await prisma.serviceCategory.update({
        where: { id: req.params.id },
        data: { name: req.body.name },
      });
      res.json(category);
    } catch (err) { next(err); }
  },

  async deleteCategory(req, res, next) {
    try {
      await prisma.serviceCategory.delete({ where: { id: req.params.id } });
      res.json({ message: 'Category deleted' });
    } catch (err) { next(err); }
  },

  // ── Services ──
  async list(req, res, next) {
    try {
      const { categoryId, active } = req.query;
      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (active !== undefined) where.isActive = active === 'true';

      const services = await prisma.service.findMany({
        where,
        include: { category: true, staffServices: { include: { user: { select: { id: true, name: true } } } } },
        orderBy: { name: 'asc' },
      });
      res.json({ data: services });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const service = await prisma.service.findUnique({
        where: { id: req.params.id },
        include: { category: true, staffServices: { include: { user: { select: { id: true, name: true } } } } },
      });
      if (!service) return res.status(404).json({ error: 'Service not found' });
      res.json(service);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, categoryId, duration, price, staffIds } = req.body;
      const service = await prisma.service.create({
        data: {
          name,
          categoryId,
          duration: parseInt(duration),
          price: parseFloat(price),
          staffServices: staffIds?.length
            ? { create: staffIds.map((userId) => ({ userId })) }
            : undefined,
        },
        include: { category: true },
      });
      res.status(201).json(service);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { name, categoryId, duration, price, isActive, staffIds } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (duration !== undefined) data.duration = parseInt(duration);
      if (price !== undefined) data.price = parseFloat(price);
      if (isActive !== undefined) data.isActive = isActive;

      if (staffIds !== undefined) {
        await prisma.staffService.deleteMany({ where: { serviceId: req.params.id } });
        if (staffIds.length) {
          await prisma.staffService.createMany({
            data: staffIds.map((userId) => ({ userId, serviceId: req.params.id })),
          });
        }
      }

      const service = await prisma.service.update({
        where: { id: req.params.id },
        data,
        include: { category: true },
      });
      res.json(service);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await prisma.service.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      res.json({ message: 'Service deactivated' });
    } catch (err) { next(err); }
  },

  // ── Combos ──
  async listCombos(req, res, next) {
    try {
      const combos = await prisma.combo.findMany({
        include: { items: { include: { service: true } } },
        orderBy: { name: 'asc' },
      });
      res.json({ data: combos });
    } catch (err) { next(err); }
  },

  async createCombo(req, res, next) {
    try {
      const { name, price, serviceIds } = req.body;
      const combo = await prisma.combo.create({
        data: {
          name,
          price: parseFloat(price),
          items: { create: serviceIds.map((serviceId) => ({ serviceId })) },
        },
        include: { items: { include: { service: true } } },
      });
      res.status(201).json(combo);
    } catch (err) { next(err); }
  },

  async updateCombo(req, res, next) {
    try {
      const { name, price, isActive, serviceIds } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (price !== undefined) data.price = parseFloat(price);
      if (isActive !== undefined) data.isActive = isActive;

      if (serviceIds !== undefined) {
        await prisma.comboItem.deleteMany({ where: { comboId: req.params.id } });
        if (serviceIds.length) {
          await prisma.comboItem.createMany({
            data: serviceIds.map((serviceId) => ({ comboId: req.params.id, serviceId })),
          });
        }
      }

      const combo = await prisma.combo.update({
        where: { id: req.params.id },
        data,
        include: { items: { include: { service: true } } },
      });
      res.json(combo);
    } catch (err) { next(err); }
  },

  async deleteCombo(req, res, next) {
    try {
      await prisma.combo.delete({ where: { id: req.params.id } });
      res.json({ message: 'Combo deleted' });
    } catch (err) { next(err); }
  },
};

module.exports = serviceController;
