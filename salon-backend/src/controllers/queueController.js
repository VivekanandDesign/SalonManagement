const prisma = require('../config/db');

const queueController = {
  // GET /api/queue — today's queue
  async list(_req, res, next) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const entries = await prisma.queueEntry.findMany({
        where: { joinedAt: { gte: today, lt: tomorrow } },
        include: { customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { joinedAt: 'asc' },
      });

      // Calculate estimated wait for WAITING entries
      const waiting = entries.filter(e => e.status === 'WAITING');
      const inService = entries.filter(e => e.status === 'IN_SERVICE');

      res.json({ data: entries, stats: { waiting: waiting.length, inService: inService.length } });
    } catch (err) { next(err); }
  },

  // POST /api/queue — add to queue (walk-in)
  async add(req, res, next) {
    try {
      const { customerId, customerName, phone, serviceIds, estimatedWait } = req.body;
      const entry = await prisma.queueEntry.create({
        data: {
          customerId: customerId || null,
          customerName: customerId ? undefined : customerName,
          phone: customerId ? undefined : phone,
          serviceIds: serviceIds ? JSON.stringify(serviceIds) : null,
          estimatedWait,
        },
        include: { customer: { select: { name: true, phone: true } } },
      });
      res.status(201).json(entry);
    } catch (err) { next(err); }
  },

  // PATCH /api/queue/:id/call — call customer (WAITING → IN_SERVICE)
  async call(req, res, next) {
    try {
      const entry = await prisma.queueEntry.update({
        where: { id: req.params.id },
        data: { status: 'IN_SERVICE', calledAt: new Date() },
      });
      res.json(entry);
    } catch (err) { next(err); }
  },

  // PATCH /api/queue/:id/complete — mark done
  async complete(req, res, next) {
    try {
      const entry = await prisma.queueEntry.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      res.json(entry);
    } catch (err) { next(err); }
  },

  // PATCH /api/queue/:id/left — customer left
  async left(req, res, next) {
    try {
      const entry = await prisma.queueEntry.update({
        where: { id: req.params.id },
        data: { status: 'LEFT' },
      });
      res.json(entry);
    } catch (err) { next(err); }
  },

  // DELETE /api/queue/:id
  async remove(req, res, next) {
    try {
      await prisma.queueEntry.delete({ where: { id: req.params.id } });
      res.json({ message: 'Removed' });
    } catch (err) { next(err); }
  },
};

module.exports = queueController;
