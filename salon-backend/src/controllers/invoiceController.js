const prisma = require('../config/db');

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

const invoiceController = {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, customerId, paymentStatus, from, to } = req.query;
      const where = {};
      if (customerId) where.customerId = customerId;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            items: { include: { service: true } },
            appointment: { include: { stylist: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({ data: invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: {
          customer: true,
          appointment: true,
          items: { include: { service: true } },
        },
      });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      res.json(invoice);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { customerId, appointmentId, items, discountType, discountValue, paymentMode, walletAmount, giftVoucherCode, products, couponCode, couponDiscount: couponDiscountInput } = req.body;

      const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
      const productTotal = (products || []).reduce((sum, p) => sum + p.price * (p.quantity || 1), 0);
      let totalAmount = subtotal + productTotal;

      if (discountType === 'flat' && discountValue) {
        totalAmount = totalAmount - discountValue;
      } else if (discountType === 'percentage' && discountValue) {
        totalAmount = totalAmount * (1 - discountValue / 100);
      }

      // Apply coupon discount
      const couponDiscount = couponDiscountInput && couponDiscountInput > 0 ? couponDiscountInput : 0;
      if (couponDiscount > 0) {
        totalAmount -= couponDiscount;
      }
      totalAmount = Math.max(0, totalAmount);

      // Gift voucher deduction
      let voucherDiscount = 0;
      if (giftVoucherCode) {
        const voucher = await prisma.giftVoucher.findUnique({ where: { code: giftVoucherCode } });
        if (voucher && voucher.status === 'ACTIVE' && voucher.expiresAt > new Date()) {
          voucherDiscount = Math.min(voucher.balance, totalAmount);
          totalAmount -= voucherDiscount;
          const newBal = voucher.balance - voucherDiscount;
          await prisma.giftVoucher.update({
            where: { code: giftVoucherCode },
            data: { balance: newBal, status: newBal <= 0 ? 'REDEEMED' : 'ACTIVE', redeemedById: customerId },
          });
        }
      }

      // Wallet deduction
      let walletUsed = 0;
      if (walletAmount && walletAmount > 0) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        walletUsed = Math.min(walletAmount, customer.walletBalance, totalAmount);
        if (walletUsed > 0) {
          totalAmount -= walletUsed;
          const updated = await prisma.customer.update({
            where: { id: customerId },
            data: { walletBalance: { decrement: walletUsed } },
          });
          await prisma.walletTransaction.create({
            data: { customerId, type: 'PAYMENT', amount: -walletUsed, balance: updated.walletBalance, description: 'Invoice payment' },
          });
        }
      }

      const paymentStatus = paymentMode === 'PENDING' ? 'DUE' : 'PAID';

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          customerId,
          appointmentId: appointmentId || null,
          subtotal: subtotal + productTotal,
          discountType,
          discountValue,
          totalAmount,
          walletUsed,
          couponCode: couponCode || null,
          couponDiscount: couponDiscount || 0,
          giftVoucherId: giftVoucherCode || null,
          voucherDiscount,
          paymentMode: totalAmount <= 0 ? 'WALLET' : paymentMode,
          paymentStatus: totalAmount <= 0 ? 'PAID' : paymentStatus,
          paidAt: (totalAmount <= 0 || paymentStatus === 'PAID') ? new Date() : null,
          items: {
            create: items.map((item) => ({
              serviceId: item.serviceId,
              price: item.price,
              quantity: item.quantity || 1,
            })),
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: { include: { service: true } },
        },
      });

      // Record product sales
      if (products && products.length > 0) {
        for (const p of products) {
          await prisma.productSale.create({
            data: { productId: p.productId, invoiceId: invoice.id, customerId, quantity: p.quantity || 1, price: p.price },
          });
          await prisma.product.update({ where: { id: p.productId }, data: { stock: { decrement: p.quantity || 1 } } });
        }
      }

      // Auto-calculate staff commission
      if (appointmentId) {
        try {
          const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { stylistId: true } });
          if (appt?.stylistId) {
            const stylist = await prisma.user.findUnique({ where: { id: appt.stylistId } });
            if (stylist?.commissionPercent > 0) {
              const commAmt = Math.round(subtotal * stylist.commissionPercent / 100);
              await prisma.staffCommission.create({ data: { userId: appt.stylistId, invoiceId: invoice.id, amount: commAmt } });
            }
          }
        } catch (_) { /* commission is best-effort */ }
      }

      res.status(201).json(invoice);
    } catch (err) { next(err); }
  },

  async updatePayment(req, res, next) {
    try {
      const { paymentMode, paymentStatus } = req.body;
      const data = {};
      if (paymentMode) data.paymentMode = paymentMode;
      if (paymentStatus) {
        data.paymentStatus = paymentStatus;
        if (paymentStatus === 'PAID') data.paidAt = new Date();
      }

      const invoice = await prisma.invoice.update({
        where: { id: req.params.id },
        data,
      });
      res.json(invoice);
    } catch (err) { next(err); }
  },
};

module.exports = invoiceController;
