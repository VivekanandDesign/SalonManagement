const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const staffController = {
  async list(req, res, next) {
    try {
      const { role, active } = req.query;
      const where = {};
      if (role) where.role = role;
      if (active !== undefined) where.isActive = active === 'true';

      const staff = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      res.json({ data: staff });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true,
          staffServices: { include: { service: { include: { category: true } } } },
        },
      });
      if (!user) return res.status(404).json({ error: 'Staff member not found' });
      res.json(user);
    } catch (err) { next(err); }
  },

  async getSchedule(req, res, next) {
    try {
      const { from, to } = req.query;
      const where = { stylistId: req.params.id };
      if (from) where.date = { ...where.date, gte: new Date(from) };
      if (to) where.date = { ...where.date, lte: new Date(to) };

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          services: { include: { service: true } },
        },
        orderBy: { startTime: 'asc' },
      });
      res.json({ data: appointments });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, email, password, phone, role, serviceIds } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name, email, password: hashedPassword, phone, role,
          staffServices: serviceIds?.length
            ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
            : undefined,
        },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
      res.status(201).json(user);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { name, email, phone, role, isActive, serviceIds } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (phone !== undefined) data.phone = phone;
      if (role !== undefined) data.role = role;
      if (isActive !== undefined) data.isActive = isActive;

      if (serviceIds !== undefined) {
        await prisma.staffService.deleteMany({ where: { userId: req.params.id } });
        if (serviceIds.length) {
          await prisma.staffService.createMany({
            data: serviceIds.map((serviceId) => ({ userId: req.params.id, serviceId })),
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      });
      res.json(user);
    } catch (err) { next(err); }
  },

  async deactivate(req, res, next) {
    try {
      await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ message: 'Staff member deactivated' });
    } catch (err) { next(err); }
  },

  async markAttendance(req, res, next) {
    try {
      const { date, status } = req.body;
      const attendance = await prisma.attendance.upsert({
        where: { userId_date: { userId: req.params.id, date: new Date(date) } },
        create: { userId: req.params.id, date: new Date(date), status: status || 'present' },
        update: { status: status || 'present' },
      });
      res.json(attendance);
    } catch (err) { next(err); }
  },

  async getAttendance(req, res, next) {
    try {
      const { month, year } = req.query;
      const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const attendance = await prisma.attendance.findMany({
        where: {
          userId: req.params.id,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      });
      res.json({ data: attendance });
    } catch (err) { next(err); }
  },
};

module.exports = staffController;
