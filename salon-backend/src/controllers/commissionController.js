const prisma = require('../config/db');

const commissionController = {
  // GET /api/commissions — list commissions with filters
  async list(req, res, next) {
    try {
      const { userId, from, to, page = 1, limit = 50 } = req.query;
      const where = {};
      if (userId) where.userId = userId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [commissions, total] = await Promise.all([
        prisma.staffCommission.findMany({
          where, skip, take: parseInt(limit),
          include: {
            user: { select: { id: true, name: true } },
            invoice: { select: { invoiceNumber: true, totalAmount: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.staffCommission.count({ where }),
      ]);

      res.json({ data: commissions, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  // GET /api/commissions/summary — per-staff summary for a period
  async summary(req, res, next) {
    try {
      const { from, to } = req.query;
      const where = {};
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const grouped = await prisma.staffCommission.groupBy({
        by: ['userId'],
        where,
        _sum: { amount: true },
        _count: true,
      });

      // Enrich with staff names
      const userIds = grouped.map(g => g.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, commissionPercent: true },
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      const data = grouped.map(g => ({
        userId: g.userId,
        name: userMap[g.userId]?.name || 'Unknown',
        commissionPercent: userMap[g.userId]?.commissionPercent || 0,
        totalCommission: g._sum.amount || 0,
        invoiceCount: g._count,
      }));

      res.json({ data });
    } catch (err) { next(err); }
  },

  // POST /api/commissions/calculate — auto-calculate commissions for an invoice
  async calculate(req, res, next) {
    try {
      const { invoiceId } = req.body;
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { appointment: { select: { stylistId: true } }, items: { include: { service: true } } },
      });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const stylistId = invoice.appointment?.stylistId;
      if (!stylistId) return res.status(400).json({ error: 'No stylist linked to this invoice' });

      const stylist = await prisma.user.findUnique({ where: { id: stylistId } });
      const commPct = stylist?.commissionPercent || 0;
      if (commPct <= 0) return res.json({ message: 'No commission configured for this stylist', amount: 0 });

      const serviceTotal = invoice.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const commissionAmount = Math.round(serviceTotal * commPct / 100);

      // Avoid duplicate
      const existing = await prisma.staffCommission.findFirst({
        where: { userId: stylistId, invoiceId },
      });
      if (existing) return res.json({ message: 'Commission already recorded', commission: existing });

      const commission = await prisma.staffCommission.create({
        data: { userId: stylistId, invoiceId, amount: commissionAmount },
      });

      res.status(201).json(commission);
    } catch (err) { next(err); }
  },

  // ── Tips ──
  async listTips(req, res, next) {
    try {
      const { userId, from, to } = req.query;
      const where = {};
      if (userId) where.userId = userId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const tips = await prisma.tip.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const total = tips.reduce((s, t) => s + t.amount, 0);
      res.json({ data: tips, total });
    } catch (err) { next(err); }
  },

  async addTip(req, res, next) {
    try {
      const { userId, amount, paymentMode } = req.body;
      const tip = await prisma.tip.create({
        data: { userId, amount, paymentMode: paymentMode || 'CASH' },
      });
      res.status(201).json(tip);
    } catch (err) { next(err); }
  },
};

module.exports = commissionController;
