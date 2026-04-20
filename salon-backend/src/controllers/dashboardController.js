const prisma = require('../config/db');

const dashboardController = {
  async summary(req, res, next) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        todaysAppointments,
        todaysRevenue,
        newCustomersThisMonth,
        totalCustomers,
        noShowCount,
        totalAppointmentsThisMonth,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { date: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        }),
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: 'PAID' },
        }),
        prisma.customer.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        prisma.customer.count(),
        prisma.appointment.count({
          where: { date: { gte: startOfMonth }, status: 'NO_SHOW' },
        }),
        prisma.appointment.count({
          where: { date: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        }),
      ]);

      res.json({
        todaysAppointments,
        todaysRevenue: todaysRevenue._sum.totalAmount || 0,
        newCustomersThisMonth,
        totalCustomers,
        noShowRate: totalAppointmentsThisMonth > 0
          ? ((noShowCount / totalAppointmentsThisMonth) * 100).toFixed(1)
          : 0,
      });
    } catch (err) { next(err); }
  },

  async revenueChart(req, res, next) {
    try {
      const { months = 6 } = req.query;
      const data = [];
      const now = new Date();

      for (let i = parseInt(months) - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const result = await prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { createdAt: { gte: start, lte: end }, paymentStatus: { not: 'DUE' } },
        });

        data.push({
          month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
          revenue: result._sum.totalAmount || 0,
        });
      }

      res.json({ data });
    } catch (err) { next(err); }
  },

  async topServices(req, res, next) {
    try {
      const { limit = 5 } = req.query;
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const results = await prisma.appointmentService.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        where: {
          appointment: { date: { gte: startOfMonth }, status: 'COMPLETED' },
        },
        orderBy: { _count: { serviceId: 'desc' } },
        take: parseInt(limit),
      });

      const serviceIds = results.map((r) => r.serviceId);
      const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });

      const data = results.map((r) => {
        const service = services.find((s) => s.id === r.serviceId);
        return {
          serviceId: r.serviceId,
          name: service?.name || 'Unknown',
          bookings: r._count.serviceId,
          revenue: (service?.price || 0) * r._count.serviceId,
        };
      });

      res.json({ data });
    } catch (err) { next(err); }
  },

  async stylistPerformance(req, res, next) {
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const stylists = await prisma.user.findMany({
        where: { role: 'STYLIST', isActive: true },
        select: { id: true, name: true },
      });

      const data = await Promise.all(
        stylists.map(async (stylist) => {
          const [appointmentCount, revenue] = await Promise.all([
            prisma.appointment.count({
              where: { stylistId: stylist.id, date: { gte: startOfMonth }, status: 'COMPLETED' },
            }),
            prisma.invoice.aggregate({
              _sum: { totalAmount: true },
              where: {
                appointment: { stylistId: stylist.id, date: { gte: startOfMonth }, status: 'COMPLETED' },
                paymentStatus: 'PAID',
              },
            }),
          ]);
          return {
            stylistId: stylist.id,
            name: stylist.name,
            appointments: appointmentCount,
            revenue: revenue._sum.totalAmount || 0,
          };
        })
      );

      res.json({ data: data.sort((a, b) => b.revenue - a.revenue) });
    } catch (err) { next(err); }
  },

  async customerBreakdown(req, res, next) {
    try {
      const [newCustomers, returningCustomers, total] = await Promise.all([
        prisma.customer.count({ where: { totalVisits: { lte: 1 } } }),
        prisma.customer.count({ where: { totalVisits: { gt: 1 } } }),
        prisma.customer.count(),
      ]);

      res.json({
        data: {
          new: newCustomers,
          returning: returningCustomers,
          total,
          newPercent: total > 0 ? ((newCustomers / total) * 100).toFixed(1) : 0,
          returningPercent: total > 0 ? ((returningCustomers / total) * 100).toFixed(1) : 0,
        },
      });
    } catch (err) { next(err); }
  },
};

module.exports = dashboardController;
