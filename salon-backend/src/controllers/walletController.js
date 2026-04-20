const prisma = require('../config/db');

const walletController = {
  // GET /api/wallet/:customerId — get balance + recent transactions
  async getWallet(req, res, next) {
    try {
      const { customerId } = req.params;
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, walletBalance: true },
      });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const transactions = await prisma.walletTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({ balance: customer.walletBalance, transactions });
    } catch (err) { next(err); }
  },

  // POST /api/wallet/topup — add credits
  async topUp(req, res, next) {
    try {
      const { customerId, amount, description } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: { increment: amount } },
      });

      const txn = await prisma.walletTransaction.create({
        data: {
          customerId,
          type: 'TOPUP',
          amount,
          balance: customer.walletBalance,
          description: description || 'Wallet top-up',
        },
      });

      res.status(201).json({ balance: customer.walletBalance, transaction: txn });
    } catch (err) { next(err); }
  },

  // POST /api/wallet/deduct — pay from wallet (used during billing)
  async deduct(req, res, next) {
    try {
      const { customerId, amount, description } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      if (customer.walletBalance < amount) return res.status(400).json({ error: 'Insufficient wallet balance' });

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: { decrement: amount } },
      });

      const txn = await prisma.walletTransaction.create({
        data: {
          customerId,
          type: 'PAYMENT',
          amount: -amount,
          balance: updated.walletBalance,
          description: description || 'Payment from wallet',
        },
      });

      res.json({ balance: updated.walletBalance, transaction: txn });
    } catch (err) { next(err); }
  },

  // POST /api/wallet/bonus — add bonus credits (loyalty, referral, etc.)
  async addBonus(req, res, next) {
    try {
      const { customerId, amount, description } = req.body;
      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: { increment: amount } },
      });

      await prisma.walletTransaction.create({
        data: {
          customerId,
          type: 'BONUS',
          amount,
          balance: customer.walletBalance,
          description: description || 'Bonus credits',
        },
      });

      res.json({ balance: customer.walletBalance });
    } catch (err) { next(err); }
  },
};

module.exports = walletController;
