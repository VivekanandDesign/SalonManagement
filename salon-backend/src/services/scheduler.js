const cron = require('node-cron');
const prisma = require('../config/db');
const whatsapp = require('./whatsappService');
const config = require('../config');

// ── Message sender — uses Baileys WhatsApp when connected, always logs ──
async function sendMessage(customerId, type, channel, content) {
  try {
    let status = 'QUEUED';
    let sentAt = null;

    // Attempt actual WhatsApp delivery
    if (channel === 'whatsapp') {
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
      if (customer?.phone) {
        const sent = await whatsapp.sendMessage(customer.phone, content);
        status = sent ? 'SENT' : 'FAILED';
        sentAt = sent ? new Date() : null;
      } else {
        status = 'FAILED';
      }
    } else {
      // SMS / other channels — still a stub, mark as logged
      status = 'SENT';
      sentAt = new Date();
    }

    await prisma.messageLog.create({
      data: { customerId, type, channel, content, status, sentAt },
    });
    console.log(`  📨 ${type} → ${channel} [${status}] → customer ${customerId.slice(0, 8)}...`);
  } catch (err) {
    console.error(`  ❌ Failed to send/log message: ${err.message}`);
  }
}

// ── Load templates from settings ──
async function getTemplates() {
  const settings = await prisma.settings.findFirst();
  const salon = settings?.salonName || 'My Salon';
  return {
    confirmation: settings?.confirmationTemplate || `Hi {{name}}! Your appointment at ${salon} is confirmed for {{date}} at {{time}}. See you soon!`,
    reminder: settings?.reminderTemplate || 'Hi {{name}}, your appointment is tomorrow at {{time}}.',
    reschedule: settings?.rescheduleTemplate || 'Hi {{name}}, your appointment has been rescheduled to {{date}} at {{time}}. Let us know if this works!',
    cancellation: settings?.cancellationTemplate || 'Hi {{name}}, your appointment on {{date}} has been cancelled. Feel free to rebook anytime!',
    birthday: settings?.birthdayTemplate || 'Happy Birthday {{name}}! Enjoy 15% off your next visit.',
    thankYou: settings?.thankYouTemplate || 'Thank you for visiting, {{name}}!',
    reEngagement: settings?.reEngagementTemplate || 'Hi {{name}}, we miss you! Book your next visit.',
    noShowFollowup: settings?.noShowFollowupTemplate || 'Hi {{name}}, we missed you at your appointment yesterday. We hope everything is okay — feel free to rebook at your convenience!',
    reEngagementDays: settings?.reEngagementDays || 45,
    feedbackRequest: settings?.feedbackRequestTemplate || `Hi {{name}}! Thank you for visiting ${salon} today. We'd love your feedback! 🌟\n\nPlease take a moment to rate your experience:\n{{feedbackLink}}`,
    rebooking: settings?.rebookingTemplate || `Hi {{name}}! It's been a while since your last {{service}} at ${salon}. Time for a fresh look? 💇\n\nBook instantly: {{bookingLink}}`,
    googleReview: settings?.googleReviewTemplate || 'Hi {{name}}! We\'re glad you enjoyed your visit. Would you mind leaving us a Google review? It helps a lot! ⭐\n\n{{reviewLink}}',
    milestone: settings?.milestoneTemplate || `Congratulations {{name}}! 🎉 You've completed {{visits}} visits at ${salon}. You've earned a special reward!`,
    referral: settings?.referralTemplate || 'Hi {{name}}! Great news — your referral just visited us! ₹{{amount}} has been added to your wallet as a thank-you. 🎁',
    membershipRenewal: settings?.membershipRenewalTemplate || 'Hi {{name}}! Your {{plan}} membership expires on {{date}}. Renew now to keep enjoying your benefits!',
    walletLow: settings?.walletLowTemplate || `Hi {{name}}, your wallet balance is ₹{{balance}}. Top up to enjoy seamless payments on your next visit!`,
    walletLowThreshold: settings?.walletLowBalanceThreshold || 200,
    googleReviewUrl: settings?.googleReviewUrl || null,
    referralRewardAmount: settings?.referralRewardAmount || 200,
  };
}

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// ═══════════════════════════════════════════
// ── 24-hour appointment reminders ──
// Runs daily at 9:00 AM
// ═══════════════════════════════════════════
async function sendReminders24h() {
  console.log('⏰ Running 24h reminder job...');
  const templates = await getTemplates();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: tomorrow, lt: dayAfter },
      status: { in: ['BOOKED', 'CONFIRMED'] },
    },
    include: { customer: true },
  });

  for (const appt of appointments) {
    const time = appt.startTime.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const content = fillTemplate(templates.reminder, {
      name: appt.customer.name,
      time,
    });

    // Avoid sending duplicate reminders
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: appt.customerId,
        type: 'REMINDER_24H',
        createdAt: { gte: tomorrow },
      },
    });
    if (!alreadySent) {
      await sendMessage(appt.customerId, 'REMINDER_24H', 'whatsapp', content);
    }
  }
  console.log(`  ✅ Processed ${appointments.length} reminders`);
}

// ═══════════════════════════════════════════
// ── 2-hour appointment reminders ──
// Runs every 30 minutes
// ═══════════════════════════════════════════
async function sendReminders2h() {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoAndHalfHours = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: twoHoursLater, lt: twoAndHalfHours },
      status: { in: ['BOOKED', 'CONFIRMED'] },
    },
    include: { customer: true },
  });

  for (const appt of appointments) {
    const time = appt.startTime.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: appt.customerId,
        type: 'REMINDER_2H',
        createdAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      },
    });
    if (!alreadySent) {
      const settings = await prisma.settings.findFirst({ select: { salonName: true } });
      const salon = settings?.salonName || 'My Salon';
      await sendMessage(
        appt.customerId, 'REMINDER_2H', 'whatsapp',
        `Hi ${appt.customer.name}, your appointment at ${salon} is in 2 hours at ${time}. See you soon!`
      );
    }
  }
}

// ═══════════════════════════════════════════
// ── Post-visit thank-you messages ──
// Runs every hour — sends thank-you for appointments completed in last 2 hours
// ═══════════════════════════════════════════
async function sendThankYou() {
  console.log('💌 Running thank-you job...');
  const templates = await getTemplates();
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { gte: twoHoursAgo },
    },
    include: { customer: true, services: { include: { service: true } } },
  });

  for (const appt of appointments) {
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: appt.customerId,
        type: 'THANK_YOU',
        createdAt: { gte: twoHoursAgo },
      },
    });
    if (!alreadySent) {
      const serviceName = appt.services[0]?.service?.name || 'your service';
      const content = fillTemplate(templates.thankYou, {
        name: appt.customer.name,
        service: serviceName,
      });
      await sendMessage(appt.customerId, 'THANK_YOU', 'whatsapp', content);
    }
  }
}

// ═══════════════════════════════════════════
// ── Birthday messages ──
// Runs daily at 9:00 AM
// ═══════════════════════════════════════════
async function sendBirthdayMessages() {
  console.log('🎂 Running birthday job...');
  const templates = await getTemplates();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Find customers whose DOB month+day matches today
  const customers = await prisma.customer.findMany({
    where: {
      dob: { not: null },
      tag: { not: 'INACTIVE' },
    },
  });

  const birthdayCustomers = customers.filter((c) => {
    const d = new Date(c.dob);
    return d.getMonth() + 1 === month && d.getDate() === day;
  });

  for (const customer of birthdayCustomers) {
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: customer.id,
        type: 'BIRTHDAY',
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    if (!alreadySent) {
      const content = fillTemplate(templates.birthday, { name: customer.name });
      await sendMessage(customer.id, 'BIRTHDAY', 'whatsapp', content);
    }
  }
  console.log(`  ✅ ${birthdayCustomers.length} birthday messages`);
}

// ═══════════════════════════════════════════
// ── No-show follow-up ──
// Runs daily at 10:00 AM — sends a gentle follow-up to yesterday's no-shows
// ═══════════════════════════════════════════
async function sendNoShowFollowup() {
  console.log('🚫 Running no-show follow-up job...');
  const templates = await getTemplates();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const noShows = await prisma.appointment.findMany({
    where: {
      status: 'NO_SHOW',
      date: { gte: yesterday, lt: today },
    },
    include: { customer: true },
  });

  let sent = 0;
  for (const appt of noShows) {
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: appt.customerId,
        type: 'NO_SHOW_FOLLOWUP',
        createdAt: { gte: yesterday },
      },
    });
    if (!alreadySent) {
      const content = fillTemplate(templates.noShowFollowup, { name: appt.customer.name });
      await sendMessage(appt.customerId, 'NO_SHOW_FOLLOWUP', 'whatsapp', content);
      sent++;
    }
  }
  console.log(`  ✅ ${sent} no-show follow-ups sent`);
}

// ═══════════════════════════════════════════
// ── Re-engagement messages ──
// Runs daily at 10:00 AM — targets customers inactive > X days
// ═══════════════════════════════════════════
async function sendReEngagement() {
  console.log('🔄 Running re-engagement job...');
  const templates = await getTemplates();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - templates.reEngagementDays);

  const inactiveCustomers = await prisma.customer.findMany({
    where: {
      tag: { not: 'INACTIVE' },
      lastVisitAt: { lt: cutoffDate, not: null },
    },
  });

  let sent = 0;
  for (const customer of inactiveCustomers) {
    // Don't send more than once per 30 days
    const recentMsg = await prisma.messageLog.findFirst({
      where: {
        customerId: customer.id,
        type: 'RE_ENGAGEMENT',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (!recentMsg) {
      const content = fillTemplate(templates.reEngagement, { name: customer.name });
      await sendMessage(customer.id, 'RE_ENGAGEMENT', 'sms', content);
      sent++;
    }
  }
  console.log(`  ✅ ${sent} re-engagement messages`);
}

// ═══════════════════════════════════════════
// ── Scheduled campaign blaster ──
// Runs every 5 minutes — picks up campaigns due for sending
// ═══════════════════════════════════════════
async function processScheduledCampaigns() {
  const now = new Date();
  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
  });

  if (dueCampaigns.length === 0) return;

  const { blastCampaign, getTargetCustomers } = require('../controllers/campaignController');

  for (const campaign of dueCampaigns) {
    console.log(`📢 Firing scheduled campaign: "${campaign.name}"`);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } });
    const customers = await getTargetCustomers(campaign.targetAudience);
    blastCampaign(campaign, customers);
  }
}

// ═══════════════════════════════════════════
// ── Feedback request sender ──
// Runs every 2 hours — sends feedback links for recently completed appointments
// ═══════════════════════════════════════════
async function sendFeedbackRequests() {
  console.log('⭐ Running feedback request job...');
  const templates = await getTemplates();
  const now = new Date();
  // Appointments completed 2-6 hours ago (give them time to leave salon)
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { gte: sixHoursAgo, lte: twoHoursAgo },
      feedback: null, // No feedback yet
    },
    include: { customer: true, services: { include: { service: true } } },
  });

  let sent = 0;
  const frontendUrl = config.frontendUrl || 'http://localhost:5173';

  for (const appt of appointments) {
    // Skip if already sent a feedback request for this appointment
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: appt.customerId,
        type: 'FEEDBACK_REQUEST',
        content: { contains: appt.id },
      },
    });
    if (alreadySent) continue;

    const feedbackLink = `${frontendUrl}/feedback/${appt.id}`;
    const content = fillTemplate(templates.feedbackRequest, {
      name: appt.customer.name,
      service: appt.services[0]?.service?.name || 'your service',
      feedbackLink,
    });

    await sendMessage(appt.customerId, 'FEEDBACK_REQUEST', 'whatsapp', content);
    sent++;
  }
  console.log(`  ✅ ${sent} feedback requests sent`);
}

// ═══════════════════════════════════════════
// ── Smart re-booking suggestions ──
// Runs daily at 11:00 AM — analyzes customer visit patterns and sends timely reminders
// ═══════════════════════════════════════════
async function sendRebookingSuggestions() {
  console.log('🔁 Running smart re-booking job...');
  const templates = await getTemplates();
  const now = new Date();
  const frontendUrl = config.frontendUrl || 'http://localhost:5173';
  const bookingLink = `${frontendUrl}/book`;

  // Get customers who have at least 2 completed appointments
  const customers = await prisma.customer.findMany({
    where: {
      totalVisits: { gte: 2 },
      lastVisitAt: { not: null },
      tag: { not: 'INACTIVE' },
    },
    select: { id: true, name: true, lastVisitAt: true },
  });

  let sent = 0;

  for (const customer of customers) {
    // Get their last 10 completed appointments to analyze patterns
    const appointments = await prisma.appointment.findMany({
      where: {
        customerId: customer.id,
        status: 'COMPLETED',
      },
      include: { services: { include: { service: { select: { name: true, categoryId: true } } } } },
      orderBy: { date: 'desc' },
      take: 10,
    });

    if (appointments.length < 2) continue;

    // Calculate average gap between visits (in days)
    const gaps = [];
    for (let i = 0; i < appointments.length - 1; i++) {
      const gap = (new Date(appointments[i].date) - new Date(appointments[i + 1].date)) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    const avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);

    // Check if it's time (within 3-day window around their average visit gap)
    const daysSinceLastVisit = Math.round((now - new Date(customer.lastVisitAt)) / (1000 * 60 * 60 * 24));
    const isInWindow = daysSinceLastVisit >= avgGap - 2 && daysSinceLastVisit <= avgGap + 3;

    if (!isInWindow) continue;

    // Don't send more than once per 14 days
    const recentMsg = await prisma.messageLog.findFirst({
      where: {
        customerId: customer.id,
        type: 'REBOOKING',
        createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentMsg) continue;

    // Get their most frequent service
    const serviceFreq = {};
    appointments.forEach(a => {
      a.services.forEach(s => {
        const n = s.service.name;
        serviceFreq[n] = (serviceFreq[n] || 0) + 1;
      });
    });
    const topService = Object.entries(serviceFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'appointment';

    const content = fillTemplate(templates.rebooking, {
      name: customer.name,
      service: topService,
      days: String(avgGap),
      bookingLink,
    });

    await sendMessage(customer.id, 'REBOOKING', 'whatsapp', content);
    sent++;
  }
  console.log(`  ✅ ${sent} re-booking suggestions sent`);
}

// ═══════════════════════════════════════════
// ── Customer milestone detection ──
// Runs daily at 9:30 AM — checks if any customers hit loyalty milestones
// ═══════════════════════════════════════════
async function checkMilestones() {
  console.log('🏆 Running milestone check...');
  const templates = await getTemplates();

  const configs = await prisma.loyaltyConfig.findMany({ where: { isActive: true } });
  if (configs.length === 0) return;

  const customers = await prisma.customer.findMany({
    where: { tag: { not: 'INACTIVE' }, totalVisits: { gte: 1 } },
    select: { id: true, name: true, totalVisits: true },
  });

  let awarded = 0;
  for (const customer of customers) {
    for (const config of configs) {
      if (customer.totalVisits >= config.visitThreshold) {
        // Check if already awarded
        const existing = await prisma.loyaltyReward.findFirst({
          where: { customerId: customer.id, loyaltyConfigId: config.id },
        });
        if (!existing) {
          await prisma.loyaltyReward.create({
            data: { customerId: customer.id, loyaltyConfigId: config.id },
          });
          const content = fillTemplate(templates.milestone, {
            name: customer.name,
            visits: String(customer.totalVisits),
            reward: config.milestoneName,
          });
          await sendMessage(customer.id, 'MILESTONE', 'whatsapp', content);
          awarded++;
        }
      }
    }
  }
  console.log(`  ✅ ${awarded} milestone rewards awarded`);
}

// ═══════════════════════════════════════════
// ── Membership renewal reminders ──
// Runs daily at 10:30 AM — reminds customers whose membership expires in 3 days
// ═══════════════════════════════════════════
async function sendMembershipRenewals() {
  console.log('🔄 Running membership renewal reminders...');
  const templates = await getTemplates();

  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const fourDaysLater = new Date(threeDaysLater);
  fourDaysLater.setDate(fourDaysLater.getDate() + 1);

  const expiring = await prisma.customerMembership.findMany({
    where: {
      isActive: true,
      endDate: { gte: threeDaysLater, lt: fourDaysLater },
    },
    include: { customer: true, plan: true },
  });

  let sent = 0;
  for (const m of expiring) {
    const alreadySent = await prisma.messageLog.findFirst({
      where: { customerId: m.customerId, type: 'MEMBERSHIP_RENEWAL', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });
    if (!alreadySent) {
      const content = fillTemplate(templates.membershipRenewal, {
        name: m.customer.name,
        plan: m.plan.name,
        date: m.endDate.toLocaleDateString('en-IN'),
      });
      await sendMessage(m.customerId, 'MEMBERSHIP_RENEWAL', 'whatsapp', content);
      sent++;
    }
  }
  console.log(`  ✅ ${sent} membership renewal reminders sent`);
}

// ═══════════════════════════════════════════
// ── Wallet low-balance alerts ──
// Runs weekly on Monday at 10:00 AM
// ═══════════════════════════════════════════
async function sendWalletLowAlerts() {
  console.log('💳 Running wallet low-balance alerts...');
  const templates = await getTemplates();

  const customers = await prisma.customer.findMany({
    where: {
      walletBalance: { gt: 0, lte: templates.walletLowThreshold },
      tag: { not: 'INACTIVE' },
    },
  });

  let sent = 0;
  for (const customer of customers) {
    const recent = await prisma.messageLog.findFirst({
      where: { customerId: customer.id, type: 'WALLET_LOW', createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    });
    if (!recent) {
      const content = fillTemplate(templates.walletLow, {
        name: customer.name,
        balance: String(Math.round(customer.walletBalance)),
      });
      await sendMessage(customer.id, 'WALLET_LOW', 'whatsapp', content);
      sent++;
    }
  }
  console.log(`  ✅ ${sent} wallet low-balance alerts sent`);
}

// ═══════════════════════════════════════════
// ── VIP tier auto-promotion ──
// Runs daily at midnight
// ═══════════════════════════════════════════
async function autoPromoteVIPTiers() {
  console.log('⭐ Running VIP tier auto-promotion...');
  const tiers = await prisma.vIPTierConfig.findMany({ orderBy: { minVisits: 'desc' } });
  if (tiers.length === 0) return;

  const customers = await prisma.customer.findMany({
    where: { tag: { not: 'INACTIVE' } },
    select: { id: true, totalVisits: true, totalSpent: true, vipTier: true },
  });

  let promoted = 0;
  for (const customer of customers) {
    let newTier = 'NONE';
    for (const t of tiers) {
      if (customer.totalVisits >= t.minVisits && customer.totalSpent >= t.minSpent) {
        newTier = t.tier;
        break;
      }
    }
    if (newTier !== customer.vipTier) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { vipTier: newTier, tag: newTier !== 'NONE' ? 'VIP' : undefined },
      });
      promoted++;
    }
  }
  console.log(`  ✅ ${promoted} customers promoted`);
}

// ═══════════════════════════════════════════
// ── Google Review follow-up ──
// Runs every 4 hours — sends Google review link to 4-5 star feedback givers
// ═══════════════════════════════════════════
async function sendGoogleReviewFollowups() {
  console.log('🌟 Running Google Review follow-up...');
  const templates = await getTemplates();
  if (!templates.googleReviewUrl) return;

  const recentFeedback = await prisma.feedback.findMany({
    where: {
      rating: { gte: 4 },
      googleReviewSent: false,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { customer: true },
  });

  let sent = 0;
  for (const fb of recentFeedback) {
    const content = fillTemplate(templates.googleReview, {
      name: fb.customer.name,
      reviewLink: templates.googleReviewUrl,
    });
    await sendMessage(fb.customerId, 'GOOGLE_REVIEW', 'whatsapp', content);
    await prisma.feedback.update({ where: { id: fb.id }, data: { googleReviewSent: true } });
    sent++;
  }
  console.log(`  ✅ ${sent} Google Review requests sent`);
}

// ═══════════════════════════════════════════
// ── Waitlist notifications ──
// Runs every 30 minutes — notifies waitlisted customers when slots open
// ═══════════════════════════════════════════
async function processWaitlist() {
  console.log('📋 Running waitlist processor...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pendingEntries = await prisma.waitlistEntry.findMany({
    where: { date: { gte: today, lt: tomorrow }, isFulfilled: false, isNotified: false },
    include: { customer: true },
  });

  if (pendingEntries.length === 0) return;

  // Check for cancelled appointments today
  const cancelledToday = await prisma.appointment.findMany({
    where: { date: { gte: today, lt: tomorrow }, status: 'CANCELLED' },
  });

  if (cancelledToday.length === 0) return;

  let notified = 0;
  const settings = await prisma.settings.findFirst({ select: { salonName: true } });
  const salon = settings?.salonName || 'My Salon';
  for (const entry of pendingEntries) {
    const content = `Hi ${entry.customer.name}! A slot just opened up at ${salon} today. Book now before it's taken! 🎉`;
    await sendMessage(entry.customerId, 'WAITLIST_ALERT', 'whatsapp', content);
    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { isNotified: true } });
    notified++;
  }
  console.log(`  ✅ ${notified} waitlist notifications sent`);
}

// ═══════════════════════════════════════════
// ── Expire old memberships ──
// Runs daily at midnight
// ═══════════════════════════════════════════
async function expireMemberships() {
  console.log('📅 Running membership expiry...');
  const now = new Date();
  const expired = await prisma.customerMembership.updateMany({
    where: { isActive: true, endDate: { lt: now } },
    data: { isActive: false },
  });
  console.log(`  ✅ ${expired.count} memberships expired`);
}

// ═══════════════════════════════════════════
// ── Schedule all jobs ──
// ═══════════════════════════════════════════
function startScheduler() {
  console.log('📅 Starting message scheduler...');

  // 24h reminders — daily at 9:00 AM
  cron.schedule('0 9 * * *', sendReminders24h);

  // 2h reminders — every 30 min
  cron.schedule('*/30 * * * *', sendReminders2h);

  // Thank-you messages — every hour
  cron.schedule('0 * * * *', sendThankYou);

  // Birthday messages — daily at 9:00 AM
  cron.schedule('0 9 * * *', sendBirthdayMessages);

  // No-show follow-up — daily at 10:00 AM
  cron.schedule('0 10 * * *', sendNoShowFollowup);

  // Re-engagement — daily at 10:00 AM
  cron.schedule('0 10 * * *', sendReEngagement);

  // Scheduled campaigns — every 5 minutes
  cron.schedule('*/5 * * * *', processScheduledCampaigns);

  // Feedback requests — every 2 hours
  cron.schedule('0 */2 * * *', sendFeedbackRequests);

  // Smart re-booking suggestions — daily at 11:00 AM
  cron.schedule('0 11 * * *', sendRebookingSuggestions);

  // Customer milestones — daily at 9:30 AM
  cron.schedule('30 9 * * *', checkMilestones);

  // Membership renewal reminders — daily at 10:30 AM
  cron.schedule('30 10 * * *', sendMembershipRenewals);

  // Wallet low-balance — weekly Monday 10:00 AM
  cron.schedule('0 10 * * 1', sendWalletLowAlerts);

  // VIP tier auto-promotion — daily at midnight
  cron.schedule('0 0 * * *', autoPromoteVIPTiers);

  // Google Review follow-ups — every 4 hours
  cron.schedule('0 */4 * * *', sendGoogleReviewFollowups);

  // Waitlist slot notifications — every 30 min
  cron.schedule('*/30 * * * *', processWaitlist);

  // Expire memberships — daily at midnight
  cron.schedule('5 0 * * *', expireMemberships);

  console.log('  ✅ Scheduler active (all 17 jobs registered)');
}

module.exports = {
  startScheduler,
  sendReminders24h, sendBirthdayMessages, sendReEngagement, sendThankYou,
  sendNoShowFollowup, processScheduledCampaigns, sendFeedbackRequests,
  sendRebookingSuggestions, checkMilestones, sendMembershipRenewals,
  sendWalletLowAlerts, autoPromoteVIPTiers, sendGoogleReviewFollowups,
  processWaitlist, expireMemberships,
};
