const prisma = require('../config/db');
const whatsapp = require('../services/whatsappService');
const { getSalonName } = require('../utils/salonName');

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

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

const publicController = {
  // GET /api/public/salon — salon info for header
  async salonInfo(_req, res, next) {
    try {
      const settings = await prisma.settings.findFirst({
        select: { salonName: true, logo: true, address: true, phone: true, openTime: true, closeTime: true, weeklyOff: true, workingHours: true, onlineBookingEnabled: true },
      });
      if (!settings?.onlineBookingEnabled) {
        return res.status(403).json({ error: 'Online booking is currently disabled' });
      }
      res.json(settings);
    } catch (err) { next(err); }
  },

  // GET /api/public/services — active services grouped by category
  async services(_req, res, next) {
    try {
      const categories = await prisma.serviceCategory.findMany({
        include: {
          services: {
            where: { isActive: true },
            select: { id: true, name: true, duration: true, price: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.json(categories.filter(c => c.services.length > 0));
    } catch (err) { next(err); }
  },

  // GET /api/public/stylists?serviceId= — stylists for a service (or all active)
  async stylists(req, res, next) {
    try {
      const { serviceId } = req.query;
      const where = { isActive: true, role: { in: ['STYLIST', 'ADMIN'] } };

      let stylists;
      if (serviceId) {
        stylists = await prisma.user.findMany({
          where: {
            ...where,
            staffServices: { some: { serviceId } },
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      } else {
        stylists = await prisma.user.findMany({
          where,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
      }
      res.json(stylists);
    } catch (err) { next(err); }
  },

  // GET /api/public/slots?date=YYYY-MM-DD&duration= — available time slots (across all stylists)
  async slots(req, res, next) {
    try {
      const { date, duration = 30 } = req.query;
      if (!date) return res.status(400).json({ error: 'date is required' });

      const settings = await prisma.settings.findFirst();
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Get working hours for this day
      let openTime = settings?.openTime || '09:00';
      let closeTime = settings?.closeTime || '21:00';
      let isDayOff = false;

      if (settings?.workingHours && typeof settings.workingHours === 'object') {
        const dayHours = settings.workingHours[dayOfWeek];
        if (dayHours) {
          if (dayHours.off) isDayOff = true;
          else { openTime = dayHours.open || openTime; closeTime = dayHours.close || closeTime; }
        }
      } else if (settings?.weeklyOff) {
        const offDays = settings.weeklyOff.toLowerCase().split(',').map(d => d.trim());
        if (offDays.includes(dayOfWeek)) isDayOff = true;
      }

      if (isDayOff) return res.json([]);

      // Get all active stylists
      const allStylists = await prisma.user.findMany({
        where: { isActive: true, role: { in: ['STYLIST', 'ADMIN'] } },
        select: { id: true },
      });
      if (allStylists.length === 0) return res.json([]);

      // Get existing appointments for ALL stylists on this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.appointment.findMany({
        where: {
          stylistId: { in: allStylists.map(s => s.id) },
          date: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { stylistId: true, startTime: true, endTime: true },
      });

      // Generate time slots — a slot is available if at least one stylist is free
      const slotDuration = parseInt(duration);
      const slots = [];
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);

      const current = new Date(date);
      current.setHours(openH, openM, 0, 0);
      const closing = new Date(date);
      closing.setHours(closeH, closeM, 0, 0);

      const now = new Date();

      while (current.getTime() + slotDuration * 60000 <= closing.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + slotDuration * 60000);

        // Skip past slots
        if (slotStart > now) {
          // Check if at least one stylist is free
          const hasFree = allStylists.some(stylist => {
            return !existing.some(appt =>
              appt.stylistId === stylist.id &&
              new Date(appt.startTime) < slotEnd && new Date(appt.endTime) > slotStart
            );
          });

          if (hasFree) {
            slots.push({
              time: current.toTimeString().slice(0, 5),
              startTime: slotStart.toISOString(),
            });
          }
        }

        current.setMinutes(current.getMinutes() + 30); // 30-min intervals
      }

      res.json(slots);
    } catch (err) { next(err); }
  },

  // POST /api/public/book — create appointment from public page
  async book(req, res, next) {
    try {
      const { name, phone, serviceIds, date, startTime, notes } = req.body;

      if (!name || !phone || !serviceIds?.length || !date || !startTime) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Sanitize phone
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      // Find or create customer
      let customer = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { name: name.trim(), phone: cleanPhone } });
      }

      // Calculate duration
      const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
      if (services.length === 0) return res.status(400).json({ error: 'Invalid services' });
      const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

      const start = new Date(startTime);
      const end = new Date(start.getTime() + totalDuration * 60000);

      // Auto-assign first available stylist
      const allStylists = await prisma.user.findMany({
        where: { isActive: true, role: { in: ['STYLIST', 'ADMIN'] } },
        select: { id: true },
      });

      let stylistId = null;
      for (const s of allStylists) {
        const conflict = await prisma.appointment.findFirst({
          where: {
            stylistId: s.id,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (!conflict) { stylistId = s.id; break; }
      }

      if (!stylistId) return res.status(409).json({ error: 'No stylists available for this time slot. Please pick another.' });

      // Conflict check (double-check)
      const conflict = await prisma.appointment.findFirst({
        where: {
          stylistId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });
      if (conflict) return res.status(409).json({ error: 'This time slot is no longer available. Please pick another.' });

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          stylistId,
          date: new Date(date),
          startTime: start,
          endTime: end,
          notes: notes || null,
          status: 'BOOKED',
          services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          stylist: { select: { id: true, name: true } },
          services: { include: { service: true } },
        },
      });

      res.status(201).json({ message: 'Appointment booked successfully!', appointment });

      // Auto-send confirmation WhatsApp
      const serviceNames = appointment.services.map(s => s.service.name).join(', ');
      const salon = await getSalonName();
      const msg = `Hi ${customer.name}! Your appointment at ${salon} is confirmed.\n\n📅 ${fmtDate(start)}\n⏰ ${fmtTime(start)}\n💇 ${serviceNames}\n👤 ${appointment.stylist?.name || 'Any available'}\n\nSee you soon!`;
      autoSendWhatsApp(customer.id, 'CONFIRMATION', msg);
    } catch (err) { next(err); }
  },
};

module.exports = publicController;
