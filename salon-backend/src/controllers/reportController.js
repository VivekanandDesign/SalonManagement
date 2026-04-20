const prisma = require('../config/db');

const reportController = {
  async revenue(req, res, next) {
    try {
      const { from, to, groupBy = 'day' } = req.query;
      const where = { paymentStatus: { not: 'DUE' } };
      if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
      if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

      const invoices = await prisma.invoice.findMany({
        where,
        select: { totalAmount: true, createdAt: true, paymentMode: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day/week/month
      const grouped = {};
      invoices.forEach((inv) => {
        let key;
        const d = new Date(inv.createdAt);
        if (groupBy === 'month') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = d.toISOString().split('T')[0];
        }
        if (!grouped[key]) grouped[key] = { date: key, revenue: 0, count: 0, cash: 0, upi: 0, card: 0 };
        grouped[key].revenue += inv.totalAmount;
        grouped[key].count += 1;
        if (inv.paymentMode === 'CASH') grouped[key].cash += inv.totalAmount;
        if (inv.paymentMode === 'UPI') grouped[key].upi += inv.totalAmount;
        if (inv.paymentMode === 'CARD') grouped[key].card += inv.totalAmount;
      });

      res.json({ data: Object.values(grouped) });
    } catch (err) { next(err); }
  },

  async customerBreakdown(req, res, next) {
    try {
      const [newCount, regularCount, vipCount, inactiveCount, total] = await Promise.all([
        prisma.customer.count({ where: { tag: 'NEW' } }),
        prisma.customer.count({ where: { tag: 'REGULAR' } }),
        prisma.customer.count({ where: { tag: 'VIP' } }),
        prisma.customer.count({ where: { tag: 'INACTIVE' } }),
        prisma.customer.count(),
      ]);

      res.json({
        data: { new: newCount, regular: regularCount, vip: vipCount, inactive: inactiveCount, total },
      });
    } catch (err) { next(err); }
  },

  async noShowRate(req, res, next) {
    try {
      const { from, to } = req.query;
      const where = { status: { not: 'CANCELLED' } };
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const [total, noShows] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.count({ where: { ...where, status: 'NO_SHOW' } }),
      ]);

      res.json({
        data: { total, noShows, rate: total > 0 ? ((noShows / total) * 100).toFixed(1) : 0 },
      });
    } catch (err) { next(err); }
  },

  async exportCsv(req, res, next) {
    try {
      const { type = 'invoices', from, to } = req.query;

      if (type === 'invoices') {
        const where = {};
        if (from || to) {
          where.createdAt = {};
          if (from) where.createdAt.gte = new Date(from);
          if (to) where.createdAt.lte = new Date(to);
        }

        const invoices = await prisma.invoice.findMany({
          where,
          include: { customer: { select: { name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        });

        const header = 'Invoice#,Customer,Phone,Subtotal,Discount,Total,PaymentMode,Status,Date\n';
        const rows = invoices.map((inv) =>
          [
            inv.invoiceNumber,
            `"${inv.customer.name}"`,
            inv.customer.phone,
            inv.subtotal,
            inv.discountValue || 0,
            inv.totalAmount,
            inv.paymentMode,
            inv.paymentStatus,
            inv.createdAt.toISOString().split('T')[0],
          ].join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
        res.send(header + rows);
      } else if (type === 'customers') {
        const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
        const header = 'Name,Phone,Email,Tag,TotalVisits,TotalSpent,LastVisit\n';
        const rows = customers.map((c) =>
          [
            `"${c.name}"`,
            c.phone,
            c.email || '',
            c.tag,
            c.totalVisits,
            c.totalSpent,
            c.lastVisitAt ? c.lastVisitAt.toISOString().split('T')[0] : '',
          ].join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
        res.send(header + rows);
      } else {
        res.status(400).json({ error: 'Invalid export type. Use "invoices" or "customers"' });
      }
    } catch (err) { next(err); }
  },

  // ── Appointment Stats ──
  async appointmentStats(req, res, next) {
    try {
      const { from, to } = req.query;
      const where = {};
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const [total, completed, cancelled, noShow, walkins] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.appointment.count({ where: { ...where, status: 'CANCELLED' } }),
        prisma.appointment.count({ where: { ...where, status: 'NO_SHOW' } }),
        prisma.appointment.count({ where: { ...where, isWalkin: true } }),
      ]);

      // Monthly trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const allAppts = await prisma.appointment.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true, status: true, isWalkin: true, startTime: true, endTime: true },
        orderBy: { date: 'asc' },
      });

      const monthly = {};
      allAppts.forEach(a => {
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { month: key, total: 0, completed: 0, cancelled: 0, noShow: 0, walkins: 0, totalDuration: 0 };
        monthly[key].total++;
        if (a.status === 'COMPLETED') monthly[key].completed++;
        if (a.status === 'CANCELLED') monthly[key].cancelled++;
        if (a.status === 'NO_SHOW') monthly[key].noShow++;
        if (a.isWalkin) monthly[key].walkins++;
        if (a.startTime && a.endTime) {
          monthly[key].totalDuration += (new Date(a.endTime) - new Date(a.startTime)) / 60000;
        }
      });

      // Day-of-week distribution
      const dayDist = [0, 0, 0, 0, 0, 0, 0];
      allAppts.forEach(a => { dayDist[new Date(a.date).getDay()]++; });

      res.json({
        data: {
          total, completed, cancelled, noShow, walkins,
          booked: total - walkins,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
          cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0,
          noShowRate: total > 0 ? ((noShow / total) * 100).toFixed(1) : 0,
          monthly: Object.values(monthly),
          dayDistribution: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => ({ day: d, count: dayDist[i] })),
        },
      });
    } catch (err) { next(err); }
  },

  // ── Customer Analytics ──
  async customerAnalytics(req, res, next) {
    try {
      const customers = await prisma.customer.findMany({
        select: { id: true, name: true, gender: true, tag: true, totalVisits: true, totalSpent: true, createdAt: true },
        orderBy: { totalSpent: 'desc' },
      });

      // Monthly new customer growth (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthly = {};
      customers.forEach(c => {
        const d = new Date(c.createdAt);
        if (d >= sixMonthsAgo) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthly[key]) monthly[key] = { month: key, count: 0 };
          monthly[key].count++;
        }
      });

      // Gender split
      const genderSplit = {};
      customers.forEach(c => {
        const g = c.gender || 'Unknown';
        genderSplit[g] = (genderSplit[g] || 0) + 1;
      });

      // Tag distribution
      const tagDist = {};
      customers.forEach(c => { tagDist[c.tag] = (tagDist[c.tag] || 0) + 1; });

      // Top 10 by spend
      const top10 = customers.slice(0, 10).map(c => ({
        name: c.name, totalSpent: c.totalSpent, totalVisits: c.totalVisits,
        avgSpend: c.totalVisits > 0 ? Math.round(c.totalSpent / c.totalVisits) : 0,
      }));

      // Returning vs new (visited > 1 = returning)
      const returning = customers.filter(c => c.totalVisits > 1).length;
      const newOnly = customers.filter(c => c.totalVisits <= 1).length;
      const avgSpendPerVisit = customers.reduce((s, c) => s + c.totalSpent, 0) / Math.max(1, customers.reduce((s, c) => s + c.totalVisits, 0));

      res.json({
        data: {
          total: customers.length,
          returning, newOnly,
          avgSpendPerVisit: Math.round(avgSpendPerVisit),
          monthlyGrowth: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
          genderSplit: Object.entries(genderSplit).map(([name, value]) => ({ name, value })),
          tagDistribution: Object.entries(tagDist).map(([tag, count]) => ({ tag, count })),
          top10,
        },
      });
    } catch (err) { next(err); }
  },

  // ── Product Reports ──
  async productReports(req, res, next) {
    try {
      const products = await prisma.product.findMany({
        include: { sales: true },
        orderBy: { name: 'asc' },
      });

      const productStats = products.map(p => {
        const totalQty = p.sales.reduce((s, sale) => s + sale.quantity, 0);
        const totalRev = p.sales.reduce((s, sale) => s + sale.price * sale.quantity, 0);
        return { id: p.id, name: p.name, brand: p.brand, stock: p.stock, price: p.price, totalSold: totalQty, revenue: totalRev };
      }).sort((a, b) => b.revenue - a.revenue);

      const totalProductRevenue = productStats.reduce((s, p) => s + p.revenue, 0);
      const lowStock = products.filter(p => p.stock <= 5 && p.isActive);

      // Monthly product sales trend
      const allSales = await prisma.productSale.findMany({
        select: { quantity: true, price: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      const monthly = {};
      allSales.forEach(sale => {
        const d = new Date(sale.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { month: key, revenue: 0, units: 0 };
        monthly[key].revenue += sale.price * sale.quantity;
        monthly[key].units += sale.quantity;
      });

      // Service vs product revenue comparison
      const serviceRevenue = await prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: { not: 'DUE' } } });

      res.json({
        data: {
          products: productStats,
          totalProductRevenue,
          totalServiceRevenue: serviceRevenue._sum.totalAmount || 0,
          lowStock: lowStock.map(p => ({ id: p.id, name: p.name, brand: p.brand, stock: p.stock })),
          monthlyTrend: Object.values(monthly),
        },
      });
    } catch (err) { next(err); }
  },

  // ── Membership Reports ──
  async membershipReports(req, res, next) {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const memberships = await prisma.customerMembership.findMany({
        include: { customer: { select: { name: true } }, plan: { select: { name: true, price: true } } },
      });

      const active = memberships.filter(m => m.isActive && new Date(m.endDate) >= now);
      const expired = memberships.filter(m => new Date(m.endDate) < now);
      const expiringSoon = active.filter(m => new Date(m.endDate) <= thirtyDaysFromNow);
      const totalRevenue = memberships.reduce((s, m) => s + (m.plan?.price || 0), 0);

      // Plan distribution
      const planDist = {};
      active.forEach(m => {
        const name = m.plan?.name || 'Unknown';
        planDist[name] = (planDist[name] || 0) + 1;
      });

      res.json({
        data: {
          total: memberships.length,
          active: active.length,
          expired: expired.length,
          expiringSoon: expiringSoon.length,
          totalRevenue,
          planDistribution: Object.entries(planDist).map(([name, count]) => ({ name, count })),
          expiringSoonList: expiringSoon.map(m => ({ customer: m.customer.name, plan: m.plan.name, endDate: m.endDate })),
        },
      });
    } catch (err) { next(err); }
  },

  // ── Discount Analytics ──
  async discountAnalytics(req, res, next) {
    try {
      const invoices = await prisma.invoice.findMany({
        select: { subtotal: true, totalAmount: true, discountType: true, discountValue: true, couponCode: true, couponDiscount: true, voucherDiscount: true, createdAt: true },
      });

      let totalGross = 0, totalDiscount = 0, discountedInvoices = 0;
      const monthly = {};
      const couponUsage = {};

      invoices.forEach(inv => {
        totalGross += inv.subtotal;
        const disc = (inv.discountValue || 0) + (inv.couponDiscount || 0) + (inv.voucherDiscount || 0);
        totalDiscount += disc;
        if (disc > 0) discountedInvoices++;

        const d = new Date(inv.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { month: key, gross: 0, discount: 0, net: 0, count: 0 };
        monthly[key].gross += inv.subtotal;
        monthly[key].discount += disc;
        monthly[key].net += inv.totalAmount;
        if (disc > 0) monthly[key].count++;

        if (inv.couponCode) {
          if (!couponUsage[inv.couponCode]) couponUsage[inv.couponCode] = { code: inv.couponCode, used: 0, totalDiscount: 0 };
          couponUsage[inv.couponCode].used++;
          couponUsage[inv.couponCode].totalDiscount += inv.couponDiscount || 0;
        }
      });

      // Avg bill with discount vs without
      const withDisc = invoices.filter(i => ((i.discountValue || 0) + (i.couponDiscount || 0) + (i.voucherDiscount || 0)) > 0);
      const withoutDisc = invoices.filter(i => ((i.discountValue || 0) + (i.couponDiscount || 0) + (i.voucherDiscount || 0)) === 0);
      const avgWithDisc = withDisc.length > 0 ? Math.round(withDisc.reduce((s, i) => s + i.totalAmount, 0) / withDisc.length) : 0;
      const avgWithoutDisc = withoutDisc.length > 0 ? Math.round(withoutDisc.reduce((s, i) => s + i.totalAmount, 0) / withoutDisc.length) : 0;

      res.json({
        data: {
          totalGross: Math.round(totalGross),
          totalDiscount: Math.round(totalDiscount),
          discountPercent: totalGross > 0 ? ((totalDiscount / totalGross) * 100).toFixed(1) : 0,
          discountedInvoices,
          totalInvoices: invoices.length,
          avgWithDiscount: avgWithDisc,
          avgWithoutDiscount: avgWithoutDisc,
          monthlyTrend: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
          topCoupons: Object.values(couponUsage).sort((a, b) => b.used - a.used).slice(0, 10),
        },
      });
    } catch (err) { next(err); }
  },

  // ── Daily Summary ──
  async dailySummary(req, res, next) {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      // Yesterday
      const yStart = new Date(start);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(end);
      yEnd.setDate(yEnd.getDate() - 1);

      // Last week same day
      const lwStart = new Date(start);
      lwStart.setDate(lwStart.getDate() - 7);
      const lwEnd = new Date(end);
      lwEnd.setDate(lwEnd.getDate() - 7);

      const getInvoiceStats = async (s, e) => {
        const invs = await prisma.invoice.findMany({
          where: { createdAt: { gte: s, lte: e } },
          select: { totalAmount: true, paymentMode: true, paymentStatus: true },
        });
        const total = invs.reduce((sum, i) => sum + i.totalAmount, 0);
        const cash = invs.filter(i => i.paymentMode === 'CASH').reduce((sum, i) => sum + i.totalAmount, 0);
        const digital = total - cash;
        return { total, cash, digital, count: invs.length };
      };

      const getApptStats = async (s, e) => {
        const [total, completed, walkins, noShows] = await Promise.all([
          prisma.appointment.count({ where: { date: { gte: s, lte: e } } }),
          prisma.appointment.count({ where: { date: { gte: s, lte: e }, status: 'COMPLETED' } }),
          prisma.appointment.count({ where: { date: { gte: s, lte: e }, isWalkin: true } }),
          prisma.appointment.count({ where: { date: { gte: s, lte: e }, status: 'NO_SHOW' } }),
        ]);
        return { total, completed, walkins, noShows };
      };

      const [today, yesterday, lastWeek] = await Promise.all([
        getInvoiceStats(start, end),
        getInvoiceStats(yStart, yEnd),
        getInvoiceStats(lwStart, lwEnd),
      ]);

      const [todayAppts, yesterdayAppts] = await Promise.all([
        getApptStats(start, end),
        getApptStats(yStart, yEnd),
      ]);

      // Top services today
      const todayInvoices = await prisma.invoice.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: { include: { service: { select: { name: true } } } } },
      });
      const svcCount = {};
      todayInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const name = item.service?.name || 'Unknown';
          svcCount[name] = (svcCount[name] || 0) + item.quantity;
        });
      });
      const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      // Expenses today
      const todayExpenses = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: start, lte: end } },
      });

      res.json({
        data: {
          date: start.toISOString().split('T')[0],
          collections: today,
          yesterdayCollections: yesterday,
          lastWeekCollections: lastWeek,
          appointments: todayAppts,
          yesterdayAppointments: yesterdayAppts,
          topServices,
          expenses: todayExpenses._sum.amount || 0,
          netProfit: today.total - (todayExpenses._sum.amount || 0),
        },
      });
    } catch (err) { next(err); }
  },
};

module.exports = reportController;
