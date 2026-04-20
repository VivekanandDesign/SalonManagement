const prisma = require('../config/db');

const customerController = {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, tag, sortBy = 'createdAt', order = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (tag) where.tag = tag;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: order },
          include: {
            invoices: {
              where: { paymentStatus: 'DUE' },
              select: { totalAmount: true },
            },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      const customersWithDues = customers.map(c => {
        const outstandingDues = c.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const { invoices, ...rest } = c;
        return { ...rest, outstandingDues };
      });

      res.json({
        data: customersWithDues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) return res.json({ data: [] });

      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
      });

      res.json({ data: customers });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
          appointments: {
            include: { services: { include: { service: true } }, stylist: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
            take: 20,
          },
          invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
          loyaltyRewards: { include: { loyaltyConfig: true } },
        },
      });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, phone, email, dob, gender, tag, notes, referredBy, beverage, musicPref, allergies, preferredStylistId, area } = req.body;
      const customer = await prisma.customer.create({
        data: {
          name,
          phone,
          email: email || null,
          dob: dob ? new Date(dob) : null,
          gender,
          tag,
          notes,
          referredBy,
          beverage,
          musicPref,
          allergies,
          preferredStylistId,
          area,
        },
      });
      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { name, phone, email, dob, gender, tag, notes, referredBy, beverage, musicPref, allergies, preferredStylistId, area } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone;
      if (email !== undefined) data.email = email || null;
      if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
      if (gender !== undefined) data.gender = gender;
      if (tag !== undefined) data.tag = tag;
      if (notes !== undefined) data.notes = notes;
      if (referredBy !== undefined) data.referredBy = referredBy;
      if (beverage !== undefined) data.beverage = beverage;
      if (musicPref !== undefined) data.musicPref = musicPref;
      if (allergies !== undefined) data.allergies = allergies;
      if (preferredStylistId !== undefined) data.preferredStylistId = preferredStylistId;
      if (area !== undefined) data.area = area;

      const customer = await prisma.customer.update({
        where: { id: req.params.id },
        data,
      });
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async softDelete(req, res, next) {
    try {
      const customer = await prisma.customer.update({
        where: { id: req.params.id },
        data: { tag: 'INACTIVE' },
      });
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },

  async recordReferral(req, res, next) {
    try {
      const { referrerId, newCustomerName, newCustomerPhone } = req.body;
      const referrer = await prisma.customer.findUnique({ where: { id: referrerId } });
      if (!referrer) return res.status(404).json({ error: 'Referrer not found' });

      // Update or create the referred customer
      let referred = null;
      if (newCustomerPhone) {
        referred = await prisma.customer.findFirst({ where: { phone: newCustomerPhone } });
        if (referred) {
          await prisma.customer.update({ where: { id: referred.id }, data: { referredBy: referrer.name } });
        } else {
          referred = await prisma.customer.create({
            data: { name: newCustomerName, phone: newCustomerPhone, referredBy: referrer.name, tag: 'NEW' },
          });
        }
      }

      res.json({ message: 'Referral recorded', referrer: referrer.name, referred: referred?.name || newCustomerName });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = customerController;
