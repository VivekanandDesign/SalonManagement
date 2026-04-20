const prisma = require('../config/db');
const whatsapp = require('../services/whatsappService');
const { getSalonName } = require('../utils/salonName');

// ── Auto-send WhatsApp helper (fire-and-forget, never blocks response) ──
async function autoSendWhatsApp(customerId, type, content) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
    if (!customer?.phone) return;
    const sent = await whatsapp.sendMessage(customer.phone, content);
    await prisma.messageLog.create({
      data: { customerId, type, channel: 'whatsapp', content, status: sent ? 'SENT' : 'FAILED', sentAt: sent ? new Date() : null },
    });
  } catch (err) {
    console.error(`Auto-send ${type} failed:`, err.message);
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const appointmentController = {
  async list(req, res, next) {
    try {
      const { date, stylistId, status, page = 1, limit = 50 } = req.query;
      const where = {};
      if (date) {
        const d = new Date(date);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date = { gte: d, lt: nextDay };
      }
      if (stylistId) where.stylistId = stylistId;
      if (status) where.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            stylist: { select: { id: true, name: true } },
            services: { include: { service: true } },
          },
          orderBy: { startTime: 'asc' },
        }),
        prisma.appointment.count({ where }),
      ]);

      res.json({ data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id },
        include: {
          customer: true,
          stylist: { select: { id: true, name: true, phone: true } },
          services: { include: { service: true } },
          invoice: true,
        },
      });
      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
      res.json(appointment);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      let { customerId, stylistId, date, startTime, serviceIds, isWalkin, notes, customerName } = req.body;

      // For walk-in customers without an existing customerId, auto-create a customer record
      if (!customerId && isWalkin && customerName) {
        const walkin = await prisma.customer.create({ data: { name: customerName, phone: '' } });
        customerId = walkin.id;
      }
      if (!customerId) {
        return res.status(400).json({ error: 'Customer is required' });
      }

      // Calculate total duration from services
      const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
      const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

      const start = new Date(startTime);
      const end = new Date(start.getTime() + totalDuration * 60000);

      // Check for conflicts
      const conflict = await prisma.appointment.findFirst({
        where: {
          stylistId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (conflict) {
        return res.status(409).json({ error: 'Stylist has a conflicting appointment at this time' });
      }

      const appointment = await prisma.appointment.create({
        data: {
          customerId,
          stylistId,
          date: new Date(date),
          startTime: start,
          endTime: end,
          isWalkin: isWalkin || false,
          notes,
          status: isWalkin ? 'IN_PROGRESS' : 'BOOKED',
          services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          stylist: { select: { id: true, name: true } },
          services: { include: { service: true } },
        },
      });

      res.status(201).json(appointment);

      // ── Auto-send booking confirmation (non-blocking) ──
      if (!isWalkin && appointment.customer?.phone) {
        const serviceNames = appointment.services.map(s => s.service.name).join(', ');
        getSalonName().then(salon => {
          const msg = `Hi ${appointment.customer.name}! Your appointment at ${salon} is confirmed.\n\n📅 ${fmtDate(start)}\n⏰ ${fmtTime(start)}\n💇 ${serviceNames}\n👤 ${appointment.stylist?.name || 'Any available'}\n\nSee you soon!`;
          autoSendWhatsApp(appointment.customerId, 'CONFIRMATION', msg);
        });
      }
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const { stylistId, date, startTime, serviceIds, notes } = req.body;
      const data = {};
      if (notes !== undefined) data.notes = notes;
      if (date) data.date = new Date(date);

      if (stylistId) data.stylistId = stylistId;

      if (startTime || serviceIds) {
        const existing = await prisma.appointment.findUnique({
          where: { id: req.params.id },
          include: { services: true },
        });

        const sIds = serviceIds || existing.services.map((s) => s.serviceId);
        const services = await prisma.service.findMany({ where: { id: { in: sIds } } });
        const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

        const start = startTime ? new Date(startTime) : existing.startTime;
        const end = new Date(start.getTime() + totalDuration * 60000);
        data.startTime = start;
        data.endTime = end;

        // Check for conflicts (exclude current appointment)
        const targetStylistId = stylistId || existing.stylistId;
        const conflict = await prisma.appointment.findFirst({
          where: {
            id: { not: req.params.id },
            stylistId: targetStylistId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (conflict) {
          return res.status(409).json({ error: 'Stylist has a conflicting appointment at this time' });
        }

        if (serviceIds) {
          await prisma.appointmentService.deleteMany({ where: { appointmentId: req.params.id } });
          await prisma.appointmentService.createMany({
            data: serviceIds.map((serviceId) => ({ appointmentId: req.params.id, serviceId })),
          });
        }
      }

      const appointment = await prisma.appointment.update({
        where: { id: req.params.id },
        data,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          stylist: { select: { id: true, name: true } },
          services: { include: { service: true } },
        },
      });
      res.json(appointment);

      // ── Auto-send reschedule notification if date/time changed (non-blocking) ──
      if ((startTime || date) && appointment.customer?.phone && !appointment.isWalkin) {
        const serviceNames = appointment.services.map(s => s.service.name).join(', ');
        getSalonName().then(salon => {
          const msg = `Hi ${appointment.customer.name}! Your appointment at ${salon} has been rescheduled.\n\n📅 ${fmtDate(appointment.startTime)}\n⏰ ${fmtTime(appointment.startTime)}\n💇 ${serviceNames}\n👤 ${appointment.stylist?.name || 'Any available'}\n\nPlease let us know if this works for you!`;
          autoSendWhatsApp(appointment.customerId, 'RESCHEDULE', msg);
        });
      }
    } catch (err) { next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const appointment = await prisma.appointment.update({
        where: { id: req.params.id },
        data: { status },
        include: {
          customer: true,
          services: { include: { service: true } },
        },
      });

      // If completed, update customer stats + auto-generate invoice
      if (status === 'COMPLETED') {
        const totalPrice = appointment.services.reduce((sum, as) => sum + as.service.price, 0);
        await prisma.customer.update({
          where: { id: appointment.customerId },
          data: {
            totalVisits: { increment: 1 },
            totalSpent: { increment: totalPrice },
            lastVisitAt: new Date(),
            tag: 'REGULAR',
          },
        });

        // Auto-generate invoice if none exists
        const existingInvoice = await prisma.invoice.findUnique({
          where: { appointmentId: appointment.id },
        });
        if (!existingInvoice) {
          const now = new Date();
          const y = now.getFullYear().toString().slice(-2);
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          const rand = Math.floor(1000 + Math.random() * 9000);
          const invoiceNumber = `INV-${y}${m}${d}-${rand}`;

          const invoice = await prisma.invoice.create({
            data: {
              invoiceNumber,
              customerId: appointment.customerId,
              appointmentId: appointment.id,
              subtotal: totalPrice,
              totalAmount: totalPrice,
              paymentMode: 'PENDING',
              paymentStatus: 'DUE',
              items: {
                create: appointment.services.map((as) => ({
                  serviceId: as.serviceId,
                  price: as.service.price,
                  quantity: 1,
                })),
              },
            },
            include: { items: { include: { service: true } } },
          });
          appointment.invoice = invoice;
        }

        // Check loyalty milestones
        const customer = await prisma.customer.findUnique({ where: { id: appointment.customerId } });
        const configs = await prisma.loyaltyConfig.findMany({ where: { isActive: true } });
        for (const config of configs) {
          if (customer.totalVisits >= config.visitThreshold) {
            const existing = await prisma.loyaltyReward.findFirst({
              where: { customerId: customer.id, loyaltyConfigId: config.id },
            });
            if (!existing) {
              await prisma.loyaltyReward.create({
                data: { customerId: customer.id, loyaltyConfigId: config.id },
              });
              // Send loyalty milestone WhatsApp notification
              const discount = config.discountType === 'percentage'
                ? `${config.discountValue}% off`
                : `₹${config.discountValue} off`;
              const milestoneMsg = `🎉 Congratulations ${customer.name}! You've unlocked "${config.milestoneName}" — ${discount} on your next visit!\n\nThank you for being a loyal customer. Redeem this reward on your next appointment! 💖`;
              autoSendWhatsApp(customer.id, 'LOYALTY', milestoneMsg);
            }
          }
        }
      }

      res.json(appointment);

      // ── Auto-send status-based WhatsApp messages (non-blocking) ──
      if (appointment.customer?.phone) {
        const name = appointment.customer.name;
        const serviceNames = appointment.services.map(s => s.service.name).join(', ');

        getSalonName().then(salon => {
          if (status === 'COMPLETED') {
            const msg = `Thank you for visiting ${salon}, ${name}! 💖\n\nWe hope you loved your ${serviceNames}. See you again soon!`;
            autoSendWhatsApp(appointment.customerId, 'THANK_YOU', msg);
          } else if (status === 'CANCELLED') {
            const msg = `Hi ${name}, your appointment at ${salon} for ${serviceNames} on ${fmtDate(appointment.date)} has been cancelled.\n\nWe'd love to see you — feel free to rebook anytime!`;
            autoSendWhatsApp(appointment.customerId, 'CANCELLATION', msg);
          }
        });
      }
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          services: { include: { service: true } },
        },
      });
      res.json(appointment);

      // ── Auto-send cancellation (non-blocking) ──
      if (appointment.customer?.phone) {
        const serviceNames = appointment.services.map(s => s.service.name).join(', ');
        getSalonName().then(salon => {
          const msg = `Hi ${appointment.customer.name}, your appointment at ${salon} for ${serviceNames} on ${fmtDate(appointment.date)} has been cancelled.\n\nWe'd love to see you — feel free to rebook anytime!`;
          autoSendWhatsApp(appointment.customerId, 'CANCELLATION', msg);
        });
      }
    } catch (err) { next(err); }
  },
};

module.exports = appointmentController;
