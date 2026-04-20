const prisma = require('../config/db');

const productController = {
  async list(req, res, next) {
    try {
      const { active } = req.query;
      const where = {};
      if (active === 'true') where.isActive = true;

      const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
      res.json({ data: products });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, brand, price, stock, restockDays } = req.body;
      const product = await prisma.product.create({
        data: { name, brand, price, stock: stock || 0, restockDays },
      });
      res.status(201).json(product);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { name, brand, price, stock, restockDays, isActive } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (brand !== undefined) data.brand = brand;
      if (price !== undefined) data.price = price;
      if (stock !== undefined) data.stock = stock;
      if (restockDays !== undefined) data.restockDays = restockDays;
      if (isActive !== undefined) data.isActive = isActive;

      const product = await prisma.product.update({ where: { id: req.params.id }, data });
      res.json(product);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ message: 'Product deactivated' });
    } catch (err) { next(err); }
  },

  // Record a sale (standalone or attached to invoice)
  async recordSale(req, res, next) {
    try {
      const { productId, invoiceId, customerId, quantity, price } = req.body;
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

      const [sale] = await prisma.$transaction([
        prisma.productSale.create({
          data: { productId, invoiceId, customerId, quantity, price: price || product.price },
        }),
        prisma.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        }),
      ]);

      res.status(201).json(sale);
    } catch (err) { next(err); }
  },

  // Sales history
  async salesHistory(req, res, next) {
    try {
      const { from, to, productId } = req.query;
      const where = {};
      if (productId) where.productId = productId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const sales = await prisma.productSale.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const totalRevenue = sales.reduce((s, sale) => s + sale.price * sale.quantity, 0);
      res.json({ data: sales, totalRevenue });
    } catch (err) { next(err); }
  },

  // Low stock alert
  async lowStock(_req, res, next) {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true, stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
      });
      res.json({ data: products });
    } catch (err) { next(err); }
  },
};

module.exports = productController;
