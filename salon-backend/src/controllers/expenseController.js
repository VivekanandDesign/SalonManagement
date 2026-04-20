const prisma = require('../config/db');

const expenseController = {
  // List expenses with filters & pagination
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, categoryId, paymentMode, from, to } = req.query;
      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (paymentMode) where.paymentMode = paymentMode;
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            category: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        }),
        prisma.expense.count({ where }),
      ]);

      res.json({ data: expenses, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  // Get single expense
  async getById(req, res, next) {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: req.params.id },
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      res.json(expense);
    } catch (err) { next(err); }
  },

  // Create expense
  async create(req, res, next) {
    try {
      const { title, amount, date, categoryId, paymentMode, notes, receiptUrl } = req.body;
      const expense = await prisma.expense.create({
        data: {
          title,
          amount: parseFloat(amount),
          date: new Date(date),
          categoryId,
          paymentMode: paymentMode || 'CASH',
          notes: notes || null,
          receiptUrl: receiptUrl || null,
          createdById: req.user.id,
        },
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      res.status(201).json(expense);
    } catch (err) { next(err); }
  },

  // Update expense
  async update(req, res, next) {
    try {
      const { title, amount, date, categoryId, paymentMode, notes, receiptUrl } = req.body;
      const data = {};
      if (title !== undefined) data.title = title;
      if (amount !== undefined) data.amount = parseFloat(amount);
      if (date !== undefined) data.date = new Date(date);
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (paymentMode !== undefined) data.paymentMode = paymentMode;
      if (notes !== undefined) data.notes = notes;
      if (receiptUrl !== undefined) data.receiptUrl = receiptUrl;

      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      res.json(expense);
    } catch (err) { next(err); }
  },

  // Delete expense
  async delete(req, res, next) {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      res.json({ message: 'Expense deleted' });
    } catch (err) { next(err); }
  },

  // List categories
  async categories(req, res, next) {
    try {
      const categories = await prisma.expenseCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      res.json(categories);
    } catch (err) { next(err); }
  },

  // Summary: totals grouped by category for a date range
  async summary(req, res, next) {
    try {
      const { from, to } = req.query;
      const where = {};
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
      }

      const expenses = await prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      });

      const categories = await prisma.expenseCategory.findMany();
      const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

      const totalAmount = expenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

      const breakdown = expenses.map(e => ({
        categoryId: e.categoryId,
        categoryName: catMap[e.categoryId] || 'Unknown',
        total: e._sum.amount || 0,
        count: e._count.id,
        percentage: totalAmount > 0 ? Math.round(((e._sum.amount || 0) / totalAmount) * 100) : 0,
      })).sort((a, b) => b.total - a.total);

      res.json({ totalAmount, breakdown });
    } catch (err) { next(err); }
  },

  // Monthly trend: last 6 months totals
  async monthlyTrend(req, res, next) {
    try {
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const result = await prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        });
        months.push({
          month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
          total: result._sum.amount || 0,
        });
      }
      res.json(months);
    } catch (err) { next(err); }
  },
};

module.exports = expenseController;
