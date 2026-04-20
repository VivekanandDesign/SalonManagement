const prisma = require('../config/db');
const whatsapp = require('../services/whatsappService');
const { getSalonName } = require('../utils/salonName');

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

const campaignController = {
  // ── List all campaigns ──
  async list(req, res, next) {
    try {
      const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      res.json({ data: campaigns });
    } catch (err) { next(err); }
  },

  // ── Get single campaign with logs ──
  async getById(req, res, next) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          createdBy: { select: { id: true, name: true } },
          logs: {
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      res.json(campaign);
    } catch (err) { next(err); }
  },

  // ── Create campaign (DRAFT) ──
  async create(req, res, next) {
    try {
      const {
        name, description, couponCode, discountType, discountValue,
        minBillAmount, maxDiscount, validFrom, validTo,
        applicableServices, targetAudience, messageTemplate, scheduledAt,
      } = req.body;

      const campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          couponCode: couponCode.toUpperCase().trim(),
          discountType,
          discountValue: parseFloat(discountValue),
          minBillAmount: minBillAmount ? parseFloat(minBillAmount) : 0,
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          applicableServices: applicableServices ? JSON.stringify(applicableServices) : null,
          targetAudience: targetAudience || 'ALL',
          messageTemplate,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
          createdById: req.user.id,
        },
      });
      res.status(201).json(campaign);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Coupon code already exists' });
      next(err);
    }
  },

  // ── Update draft/scheduled campaign ──
  async update(req, res, next) {
    try {
      const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
        return res.status(400).json({ error: 'Can only edit DRAFT or SCHEDULED campaigns' });
      }

      const data = { ...req.body };
      if (data.couponCode) data.couponCode = data.couponCode.toUpperCase().trim();
      if (data.discountValue) data.discountValue = parseFloat(data.discountValue);
      if (data.minBillAmount !== undefined) data.minBillAmount = parseFloat(data.minBillAmount) || 0;
      if (data.maxDiscount !== undefined) data.maxDiscount = data.maxDiscount ? parseFloat(data.maxDiscount) : null;
      if (data.validFrom) data.validFrom = new Date(data.validFrom);
      if (data.validTo) data.validTo = new Date(data.validTo);
      if (data.applicableServices) data.applicableServices = JSON.stringify(data.applicableServices);
      if (data.scheduledAt) {
        data.scheduledAt = new Date(data.scheduledAt);
        data.status = 'SCHEDULED';
      }

      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data,
      });
      res.json(campaign);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Coupon code already exists' });
      next(err);
    }
  },

  // ── Delete draft campaign ──
  async delete(req, res, next) {
    try {
      const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
        return res.status(400).json({ error: 'Can only delete DRAFT or CANCELLED campaigns' });
      }
      await prisma.campaign.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  // ── Send campaign NOW ──
  async send(req, res, next) {
    try {
      const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
        return res.status(400).json({ error: 'Campaign already sent or cancelled' });
      }

      // Mark as sending
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } });

      // Get target customers
      const customers = await getTargetCustomers(campaign.targetAudience);

      // Send in background (don't block response)
      res.json({ success: true, message: `Sending to ${customers.length} customers...`, targetCount: customers.length });

      // Fire-and-forget blast
      blastCampaign(campaign, customers);
    } catch (err) { next(err); }
  },

  // ── Cancel scheduled campaign ──
  async cancel(req, res, next) {
    try {
      const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Campaign not found' });
      if (!['DRAFT', 'SCHEDULED', 'SENDING'].includes(existing.status)) {
        return res.status(400).json({ error: 'Campaign cannot be cancelled' });
      }
      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });
      res.json(campaign);
    } catch (err) { next(err); }
  },

  // ── Campaign stats ──
  async stats(req, res, next) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          logs: {
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const sent = campaign.logs.filter(l => l.status === 'SENT').length;
      const delivered = campaign.logs.filter(l => l.status === 'DELIVERED').length;
      const failed = campaign.logs.filter(l => l.status === 'FAILED').length;

      // Count redemptions from invoices with this coupon code
      const redeemed = await prisma.invoice.count({
        where: { couponCode: campaign.couponCode },
      });

      const revenue = await prisma.invoice.aggregate({
        where: { couponCode: campaign.couponCode },
        _sum: { totalAmount: true },
      });

      res.json({
        campaign,
        stats: { sent, delivered, failed, redeemed, revenueGenerated: revenue._sum.totalAmount || 0 },
      });
    } catch (err) { next(err); }
  },

  // ── Validate coupon (for billing) ──
  async validateCoupon(req, res, next) {
    try {
      const { couponCode, billAmount, serviceIds } = req.body;
      if (!couponCode) return res.status(400).json({ error: 'Coupon code is required' });

      const campaign = await prisma.campaign.findUnique({
        where: { couponCode: couponCode.toUpperCase().trim() },
      });

      if (!campaign) return res.status(404).json({ valid: false, error: 'Invalid coupon code' });

      const now = new Date();
      if (now < campaign.validFrom || now > campaign.validTo) {
        return res.json({ valid: false, error: 'Coupon has expired or is not yet active' });
      }
      if (!['SENT', 'SENDING', 'SCHEDULED', 'DRAFT'].includes(campaign.status) && campaign.status !== 'SENT') {
        // Allow SENT or any active status
      }
      if (campaign.minBillAmount && billAmount < campaign.minBillAmount) {
        return res.json({ valid: false, error: `Minimum bill amount is ₹${campaign.minBillAmount}` });
      }

      // Check applicable services
      if (campaign.applicableServices && serviceIds) {
        const applicable = JSON.parse(campaign.applicableServices);
        const hasMatch = serviceIds.some(id => applicable.includes(id));
        if (!hasMatch) {
          return res.json({ valid: false, error: 'Coupon not applicable for selected services' });
        }
      }

      // Calculate discount
      let discount = 0;
      if (campaign.discountType === 'percentage') {
        discount = (billAmount * campaign.discountValue) / 100;
        if (campaign.maxDiscount && discount > campaign.maxDiscount) {
          discount = campaign.maxDiscount;
        }
      } else {
        discount = campaign.discountValue;
      }

      res.json({
        valid: true,
        discount: Math.min(discount, billAmount),
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
        campaignName: campaign.name,
        couponCode: campaign.couponCode,
      });
    } catch (err) { next(err); }
  },
};

// ── Get customers by target audience ──
async function getTargetCustomers(audience) {
  const where = {};
  switch (audience) {
    case 'REGULAR': where.tag = 'REGULAR'; break;
    case 'VIP': where.tag = 'VIP'; break;
    case 'INACTIVE': where.tag = 'INACTIVE'; break;
    case 'NEW': where.tag = 'NEW'; break;
    // ALL = no filter
  }
  return prisma.customer.findMany({
    where,
    select: { id: true, name: true, phone: true },
  });
}

// ── Blast campaign to all target customers (runs in background) ──
async function blastCampaign(campaign, customers) {
  let sentCount = 0;
  let deliveredCount = 0;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const discountText = campaign.discountType === 'percentage'
    ? `${campaign.discountValue}% off`
    : `₹${campaign.discountValue} off`;

  for (const customer of customers) {
    try {
      const content = fillTemplate(campaign.messageTemplate, {
        name: customer.name,
        coupon: campaign.couponCode,
        discount: discountText,
        validFrom: fmtDate(campaign.validFrom),
        validTo: fmtDate(campaign.validTo),
        salon: await getSalonName(),
      });

      let status = 'FAILED';
      let sentAt = null;

      if (customer.phone) {
        const sent = await whatsapp.sendMessage(customer.phone, content);
        if (sent) {
          status = 'SENT';
          sentAt = new Date();
          sentCount++;
        }
      }

      await prisma.campaignLog.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          status,
          sentAt,
        },
      });

      // Also log in message_logs for history
      if (status === 'SENT') {
        await prisma.messageLog.create({
          data: {
            customerId: customer.id,
            type: 'CUSTOM',
            channel: 'whatsapp',
            content,
            status: 'SENT',
            sentAt,
          },
        });
      }
    } catch (err) {
      console.error(`Campaign blast failed for customer ${customer.id}:`, err.message);
    }
  }

  // Update campaign counts
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: 'SENT',
      sentCount,
      deliveredCount,
    },
  });

  console.log(`📢 Campaign "${campaign.name}" sent to ${sentCount}/${customers.length} customers`);
}

module.exports = { campaignController, blastCampaign, getTargetCustomers };
