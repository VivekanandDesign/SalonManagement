const prisma = require('../config/db');
const whatsapp = require('../services/whatsappService');

const messageController = {
  async list(req, res, next) {
    try {
      const { customerId, type, status, channel, from, to, page = 1, limit = 50 } = req.query;
      const where = {};
      if (customerId) where.customerId = customerId;
      if (type) where.type = type;
      if (status) where.status = status;
      if (channel) where.channel = channel;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from + 'T00:00:00Z');
        if (to) where.createdAt.lte = new Date(to + 'T23:59:59Z');
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [messages, total] = await Promise.all([
        prisma.messageLog.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: { customer: { select: { id: true, name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.messageLog.count({ where }),
      ]);

      res.json({ data: messages, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  async stats(req, res, next) {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

      const [total, sentToday, byStatus, byType, byChannel, dailyRaw] = await Promise.all([
        prisma.messageLog.count(),
        prisma.messageLog.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
        prisma.messageLog.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.messageLog.groupBy({ by: ['type'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        prisma.messageLog.groupBy({ by: ['channel'], _count: { id: true } }),
        prisma.$queryRaw`
          SELECT DATE("createdAt") as date, COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'SENT' OR status = 'DELIVERED')::int as delivered,
            COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed
          FROM "message_logs"
          WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE("createdAt")
          ORDER BY date DESC
        `,
      ]);

      const statusMap = {};
      byStatus.forEach(s => { statusMap[s.status] = s._count.id; });
      const typeMap = {};
      byType.forEach(t => { typeMap[t.type] = t._count.id; });
      const channelMap = {};
      byChannel.forEach(c => { channelMap[c.channel] = c._count.id; });

      const delivered = (statusMap.SENT || 0) + (statusMap.DELIVERED || 0);
      const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

      res.json({
        total,
        sentToday,
        delivered,
        failed: statusMap.FAILED || 0,
        queued: statusMap.QUEUED || 0,
        successRate,
        byType: typeMap,
        byChannel: channelMap,
        daily: dailyRaw.map(d => ({
          date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
          total: d.total,
          delivered: d.delivered,
          failed: d.failed,
        })),
      });
    } catch (err) { next(err); }
  },

  async sendManual(req, res, next) {
    try {
      const { customerId, content, channel, type } = req.body;
      const message = await prisma.messageLog.create({
        data: {
          customerId,
          type: type || 'MANUAL',
          channel: channel || 'whatsapp',
          content,
          status: 'QUEUED',
        },
      });

      let status = 'SENT';
      let sentAt = new Date();

      // Attempt WhatsApp delivery via Baileys
      if ((channel || 'whatsapp') === 'whatsapp') {
        const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
        if (customer?.phone) {
          const sent = await whatsapp.sendMessage(customer.phone, content);
          status = sent ? 'SENT' : 'FAILED';
          sentAt = sent ? new Date() : null;
        } else {
          status = 'FAILED';
          sentAt = null;
        }
      }

      const updated = await prisma.messageLog.update({
        where: { id: message.id },
        data: { status, sentAt },
      });
      res.status(201).json(updated);
    } catch (err) { next(err); }
  },
};

module.exports = messageController;
