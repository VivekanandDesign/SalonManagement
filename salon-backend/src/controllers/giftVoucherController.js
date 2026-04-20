const prisma = require('../config/db');
const crypto = require('crypto');

function generateVoucherCode() {
  return 'GIFT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const giftVoucherController = {
  async list(req, res, next) {
    try {
      const { status } = req.query;
      const where = {};
      if (status) where.status = status;

      const vouchers = await prisma.giftVoucher.findMany({
        where,
        include: {
          purchaser: { select: { id: true, name: true, phone: true } },
          redeemedBy: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: vouchers });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { amount, purchaserId, recipientName, recipientPhone, message, expiresInDays } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 365));

      const voucher = await prisma.giftVoucher.create({
        data: {
          code: generateVoucherCode(),
          amount,
          balance: amount,
          purchaserId: purchaserId || null,
          recipientName,
          recipientPhone,
          message,
          expiresAt,
        },
      });
      res.status(201).json(voucher);
    } catch (err) { next(err); }
  },

  // Validate & get voucher by code
  async validate(req, res, next) {
    try {
      const { code } = req.body;
      const voucher = await prisma.giftVoucher.findUnique({ where: { code } });
      if (!voucher) return res.status(404).json({ error: 'Invalid voucher code' });
      if (voucher.status === 'EXPIRED' || voucher.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Voucher has expired' });
      }
      if (voucher.status === 'REDEEMED' || voucher.balance <= 0) {
        return res.status(400).json({ error: 'Voucher fully redeemed' });
      }
      res.json({ valid: true, balance: voucher.balance, voucher });
    } catch (err) { next(err); }
  },

  // Redeem (deduct from voucher balance) — used during billing
  async redeem(req, res, next) {
    try {
      const { code, amount, customerId } = req.body;
      const voucher = await prisma.giftVoucher.findUnique({ where: { code } });
      if (!voucher || voucher.status !== 'ACTIVE') return res.status(400).json({ error: 'Invalid or inactive voucher' });
      if (voucher.expiresAt < new Date()) return res.status(400).json({ error: 'Voucher expired' });

      const deductAmount = Math.min(amount, voucher.balance);
      const newBalance = voucher.balance - deductAmount;

      await prisma.giftVoucher.update({
        where: { code },
        data: {
          balance: newBalance,
          status: newBalance <= 0 ? 'REDEEMED' : 'ACTIVE',
          redeemedById: customerId || null,
        },
      });

      res.json({ deducted: deductAmount, remaining: newBalance });
    } catch (err) { next(err); }
  },
};

module.exports = giftVoucherController;
