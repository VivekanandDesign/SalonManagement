const whatsapp = require('../services/whatsappService');
const prisma = require('../config/db');

const whatsappController = {
  // Get connection status
  async status(req, res) {
    const status = whatsapp.getStatus();
    const retryStats = whatsapp.getRetryQueueStats();
    res.json({ ...status, retryQueue: retryStats });
  },

  // Get QR code (just returns current QR, does NOT start connection)
  async qr(req, res) {
    const qr = whatsapp.getQR();
    const status = whatsapp.getStatus();
    res.json({ qr: qr || null, status: status.status });
  },

  // Start WhatsApp connection and wait for initial QR
  async connect(req, res) {
    const currentStatus = whatsapp.getStatus();
    if (currentStatus.status === 'connected') {
      return res.json({ message: 'Already connected', ...currentStatus });
    }

    // Start the connection (non-blocking)
    whatsapp.connect();

    // Wait up to 15s for the QR to appear
    let attempts = 0;
    const maxAttempts = 30;
    const qr = await new Promise((resolve) => {
      const interval = setInterval(() => {
        attempts++;
        const qrNow = whatsapp.getQR();
        const s = whatsapp.getStatus();
        if (qrNow || s.status === 'connected' || attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(qrNow);
        }
      }, 500);
    });

    const finalStatus = whatsapp.getStatus();
    res.json({ qr, ...finalStatus });
  },

  // Disconnect WhatsApp
  async disconnect(req, res) {
    whatsapp.disconnect();
    res.json({ message: 'Disconnected' });
  },

  // Logout and clear session
  async logout(req, res) {
    whatsapp.clearSession();
    res.json({ message: 'Session cleared' });
  },

  // Send a test message
  async sendTest(req, res, next) {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }

      const status = whatsapp.getStatus();
      if (status.status !== 'connected') {
        return res.json({ success: false, message: 'WhatsApp is not connected. Please connect first.' });
      }

      const sent = await whatsapp.sendMessage(phone, message);
      res.json({
        success: sent,
        message: sent ? `Message sent to ${phone}` : `Failed to send — ensure ${phone} is a valid WhatsApp number with country code (e.g. 919876543210)`,
      });
    } catch (err) { next(err); }
  },

  // Send message to a customer (by customerId)
  async sendToCustomer(req, res, next) {
    try {
      const { customerId, content, type } = req.body;
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      if (!customer.phone) return res.status(400).json({ error: 'Customer has no phone number' });

      const sent = await whatsapp.sendMessage(customer.phone, content);

      // Log the message
      const log = await prisma.messageLog.create({
        data: {
          customerId,
          type: type || 'MANUAL',
          channel: 'whatsapp',
          content,
          status: sent ? 'SENT' : 'FAILED',
          sentAt: sent ? new Date() : null,
        },
      });

      res.status(201).json({ success: sent, log });
    } catch (err) { next(err); }
  },
};

module.exports = whatsappController;
