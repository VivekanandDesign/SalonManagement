const prisma = require('../config/db');

const feedbackController = {
  // POST /api/public/feedback — submit feedback (public, no auth)
  async submit(req, res, next) {
    try {
      const { appointmentId, rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // If appointmentId provided, validate and link
      let customerId;
      if (appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { customerId: true, status: true },
        });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Check if already reviewed
        const existing = await prisma.feedback.findUnique({ where: { appointmentId } });
        if (existing) return res.status(409).json({ error: 'Feedback already submitted for this appointment' });

        customerId = appointment.customerId;
      }

      if (!customerId) {
        return res.status(400).json({ error: 'Appointment ID is required' });
      }

      const feedback = await prisma.feedback.create({
        data: {
          customerId,
          appointmentId: appointmentId || null,
          rating: parseInt(rating),
          comment: comment?.trim() || null,
        },
      });

      // If rating >= 4, offer Google Review redirect
      let googleReviewUrl = null;
      if (parseInt(rating) >= 4) {
        const settings = await prisma.settings.findFirst({ select: { googleReviewUrl: true } });
        if (settings?.googleReviewUrl) {
          googleReviewUrl = settings.googleReviewUrl;
          await prisma.feedback.update({ where: { id: feedback.id }, data: { googleReviewSent: true } });
        }
      }

      res.status(201).json({ message: 'Thank you for your feedback!', feedback, googleReviewUrl });
    } catch (err) { next(err); }
  },

  // GET /api/public/feedback/:appointmentId — check if feedback exists + get appointment details
  async getAppointmentForFeedback(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: { select: { name: true } },
          stylist: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
          feedback: true,
        },
      });

      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

      const settings = await prisma.settings.findFirst({ select: { salonName: true, logo: true } });

      res.json({
        salonName: settings?.salonName || 'My Salon',
        customerName: appointment.customer.name,
        stylistName: appointment.stylist?.name,
        services: appointment.services.map(s => s.service.name),
        date: appointment.date,
        alreadyReviewed: !!appointment.feedback,
        existingFeedback: appointment.feedback || null,
      });
    } catch (err) { next(err); }
  },

  // ── Protected routes (admin panel) ──

  // GET /api/feedback — list all feedback with filters
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, rating, from, to } = req.query;
      const where = {};

      if (rating) where.rating = parseInt(rating);
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [feedbacks, total] = await Promise.all([
        prisma.feedback.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            customer: { select: { name: true, phone: true } },
            appointment: {
              select: {
                date: true,
                services: { include: { service: { select: { name: true } } } },
                stylist: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.feedback.count({ where }),
      ]);

      res.json({ data: feedbacks, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) { next(err); }
  },

  // GET /api/feedback/stats — aggregate stats
  async stats(_req, res, next) {
    try {
      const [total, avgResult, distribution, recent] = await Promise.all([
        prisma.feedback.count(),
        prisma.feedback.aggregate({ _avg: { rating: true } }),
        prisma.feedback.groupBy({ by: ['rating'], _count: true, orderBy: { rating: 'asc' } }),
        prisma.feedback.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { name: true } },
            appointment: { select: { services: { include: { service: { select: { name: true } } } } } },
          },
        }),
      ]);

      const dist = {};
      for (let i = 1; i <= 5; i++) dist[i] = 0;
      distribution.forEach(d => { dist[d.rating] = d._count; });

      res.json({
        total,
        averageRating: Math.round((avgResult._avg.rating || 0) * 10) / 10,
        distribution: dist,
        recent,
      });
    } catch (err) { next(err); }
  },
};

module.exports = feedbackController;
