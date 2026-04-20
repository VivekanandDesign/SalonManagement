require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ──
function generateInvoiceNumber(date, idx) {
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `INV-${y}${m}${d}-${String(idx).padStart(4, '0')}`;
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randomInt(0, arr.length - 1)]; }

function setTime(base, hours, minutes) {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Settings ──
  await prisma.settings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      salonName: 'Orrenza Unisex Salon',
      address: '123 Main Street, City',
      phone: '+91 98765 43210',
      email: 'hello@orrenza.com',
      openTime: '09:00',
      closeTime: '21:00',
      weeklyOff: 'Monday',
      reminderTemplate: 'Hi {{name}}, this is a reminder for your appointment at {{time}} tomorrow at Orrenza Unisex Salon.',
      birthdayTemplate: 'Happy Birthday {{name}}! 🎉 Enjoy 15% off your next visit at Orrenza Unisex Salon.',
      thankYouTemplate: 'Thank you for visiting Orrenza Unisex Salon, {{name}}! We hope to see you again soon.',
      reEngagementTemplate: 'Hi {{name}}, we miss you! It\'s been a while since your last visit. Book now and get 10% off!',
    },
  });

  // ── Admin User ──
  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@orrenza.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@orrenza.com',
      password: adminPassword,
      phone: '+91 98765 43210',
      role: 'ADMIN',
    },
  });

  // ── Stylists ──
  const stylistPassword = await bcrypt.hash(process.env.SEED_STYLIST_PASSWORD || 'stylist123', 12);
  const stylists = [];
  const stylistData = [
    { name: 'Priya Sharma', email: 'priya@orrenza.com', phone: '+91 98765 11111' },
    { name: 'Rahul Verma', email: 'rahul@orrenza.com', phone: '+91 98765 22222' },
    { name: 'Anita Desai', email: 'anita@orrenza.com', phone: '+91 98765 33333' },
  ];

  for (const s of stylistData) {
    const stylist = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, password: stylistPassword, role: 'STYLIST' },
    });
    stylists.push(stylist);
  }

  // ── Receptionist ──
  const recepPassword = await bcrypt.hash(process.env.SEED_RECEPTIONIST_PASSWORD || 'recep123', 12);
  await prisma.user.upsert({
    where: { email: 'reception@orrenza.com' },
    update: {},
    create: {
      name: 'Sneha Patel',
      email: 'reception@orrenza.com',
      password: recepPassword,
      phone: '+91 98765 44444',
      role: 'RECEPTIONIST',
    },
  });

  // ── Service Categories ──
  const categories = {};
  const catNames = ['Hair', 'Skin', 'Nails', 'Spa'];
  for (const name of catNames) {
    const cat = await prisma.serviceCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat;
  }

  // ── Services ──
  const serviceData = [
    { name: 'Haircut (Men)', category: 'Hair', duration: 30, price: 300 },
    { name: 'Haircut (Women)', category: 'Hair', duration: 45, price: 500 },
    { name: 'Hair Coloring', category: 'Hair', duration: 90, price: 2000 },
    { name: 'Hair Spa', category: 'Hair', duration: 60, price: 1500 },
    { name: 'Blow Dry', category: 'Hair', duration: 30, price: 400 },
    { name: 'Facial (Basic)', category: 'Skin', duration: 45, price: 800 },
    { name: 'Facial (Premium)', category: 'Skin', duration: 60, price: 1500 },
    { name: 'Cleanup', category: 'Skin', duration: 30, price: 500 },
    { name: 'Manicure', category: 'Nails', duration: 30, price: 400 },
    { name: 'Pedicure', category: 'Nails', duration: 45, price: 500 },
    { name: 'Nail Art', category: 'Nails', duration: 30, price: 600 },
    { name: 'Full Body Massage', category: 'Spa', duration: 60, price: 2000 },
    { name: 'Head Massage', category: 'Spa', duration: 30, price: 500 },
  ];

  const services = [];
  for (const s of serviceData) {
    const service = await prisma.service.upsert({
      where: { id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      update: {},
      create: {
        id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: s.name,
        categoryId: categories[s.category].id,
        duration: s.duration,
        price: s.price,
      },
    });
    services.push(service);
  }

  // ── Assign services to stylists ──
  for (const stylist of stylists) {
    for (const service of services) {
      await prisma.staffService.upsert({
        where: { userId_serviceId: { userId: stylist.id, serviceId: service.id } },
        update: {},
        create: { userId: stylist.id, serviceId: service.id },
      });
    }
  }

  // ── Sample Customers (15 customers for realistic data) ──
  const customerData = [
    { name: 'Meera Joshi', phone: '+91 99001 10001', email: 'meera@email.com', gender: 'Female', tag: 'REGULAR', dob: new Date('1990-06-15') },
    { name: 'Arjun Singh', phone: '+91 99001 10002', email: 'arjun@email.com', gender: 'Male', tag: 'VIP', dob: new Date('1985-03-22') },
    { name: 'Kavita Reddy', phone: '+91 99001 10003', gender: 'Female', tag: 'NEW' },
    { name: 'Rohan Malhotra', phone: '+91 99001 10004', gender: 'Male', tag: 'REGULAR', dob: new Date('1992-11-05') },
    { name: 'Neha Gupta', phone: '+91 99001 10005', email: 'neha@email.com', gender: 'Female', tag: 'REGULAR', dob: new Date('1988-09-18') },
    { name: 'Vikram Patel', phone: '+91 99001 10006', email: 'vikram@email.com', gender: 'Male', tag: 'REGULAR', dob: new Date('1991-01-30') },
    { name: 'Sneha Iyer', phone: '+91 99001 10007', gender: 'Female', tag: 'VIP', dob: new Date('1987-12-05') },
    { name: 'Aditya Rao', phone: '+91 99001 10008', gender: 'Male', tag: 'REGULAR', dob: new Date('1994-07-12') },
    { name: 'Pooja Mehta', phone: '+91 99001 10009', email: 'pooja@email.com', gender: 'Female', tag: 'REGULAR', dob: new Date('1993-04-25') },
    { name: 'Ravi Kumar', phone: '+91 99001 10010', gender: 'Male', tag: 'NEW', dob: new Date('1989-08-19') },
    { name: 'Anjali Nair', phone: '+91 99001 10011', email: 'anjali@email.com', gender: 'Female', tag: 'REGULAR', dob: new Date('1995-02-14') },
    { name: 'Sanjay Chopra', phone: '+91 99001 10012', gender: 'Male', tag: 'INACTIVE', dob: new Date('1982-10-08') },
    { name: 'Divya Sharma', phone: '+91 99001 10013', email: 'divya@email.com', gender: 'Female', tag: 'REGULAR', dob: new Date('1996-05-21') },
    { name: 'Manish Tiwari', phone: '+91 99001 10014', gender: 'Male', tag: 'NEW', dob: new Date('1990-11-17') },
    { name: 'Priti Saxena', phone: '+91 99001 10015', email: 'priti@email.com', gender: 'Female', tag: 'VIP', dob: new Date('1986-03-09') },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
    customers.push(customer);
  }

  // ── Loyalty Config ──
  await prisma.loyaltyConfig.upsert({
    where: { id: 'loyalty-10' },
    update: {},
    create: {
      id: 'loyalty-10',
      milestoneName: '10th Visit Reward',
      visitThreshold: 10,
      discountType: 'percentage',
      discountValue: 20,
    },
  });

  await prisma.loyaltyConfig.upsert({
    where: { id: 'loyalty-25' },
    update: {},
    create: {
      id: 'loyalty-25',
      milestoneName: '25th Visit VIP Reward',
      visitThreshold: 25,
      discountType: 'percentage',
      discountValue: 30,
    },
  });

  // ══════════════════════════════════════════════════════
  // ── REALISTIC TRANSACTIONAL DATA (past 3 months) ──
  // ══════════════════════════════════════════════════════
  console.log('📊 Generating appointments, invoices & messages...');

  const today = new Date('2026-04-10');
  const paymentModes = ['CASH', 'UPI', 'CARD', 'UPI', 'UPI', 'CASH']; // weighted toward UPI & Cash
  const timeSlots = [
    [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
    [12, 0], [14, 0], [14, 30], [15, 0], [15, 30], [16, 0],
    [16, 30], [17, 0], [17, 30], [18, 0], [18, 30], [19, 0],
  ];

  let invoiceIdx = 1;
  const allAppointments = [];

  // Generate data for past 90 days
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // Skip Mondays (weekly off)
    if (date.getDay() === 1) continue;

    // Determine number of appointments for the day (3-8, more on weekends)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const numAppts = isWeekend ? randomInt(5, 8) : randomInt(3, 6);

    const usedSlots = new Set();

    for (let a = 0; a < numAppts; a++) {
      const customer = pick(customers);
      const stylist = pick(stylists);

      // Pick 1-2 services
      const numServices = Math.random() < 0.3 ? 2 : 1;
      const selectedServices = [];
      const usedServiceIds = new Set();
      for (let s = 0; s < numServices; s++) {
        let svc;
        do { svc = pick(services); } while (usedServiceIds.has(svc.id));
        usedServiceIds.add(svc.id);
        selectedServices.push(svc);
      }

      // Pick a time slot (avoid duplicates per stylist)
      let slotIdx;
      let attempts = 0;
      do {
        slotIdx = randomInt(0, timeSlots.length - 1);
        attempts++;
      } while (usedSlots.has(`${stylist.id}-${slotIdx}`) && attempts < 20);
      usedSlots.add(`${stylist.id}-${slotIdx}`);

      const [h, min] = timeSlots[slotIdx];
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      const startTime = setTime(date, h, min);
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);

      // Determine status: past appointments mostly COMPLETED, some NO_SHOW
      let status;
      if (daysAgo === 0) {
        status = pick(['BOOKED', 'CONFIRMED', 'IN_PROGRESS']);
      } else if (daysAgo <= 2) {
        status = Math.random() < 0.85 ? 'COMPLETED' : pick(['COMPLETED', 'NO_SHOW', 'CANCELLED']);
      } else {
        const r = Math.random();
        if (r < 0.80) status = 'COMPLETED';
        else if (r < 0.90) status = 'NO_SHOW';
        else status = 'CANCELLED';
      }

      const isWalkin = Math.random() < 0.2;

      try {
        const appointment = await prisma.appointment.create({
          data: {
            customerId: customer.id,
            stylistId: stylist.id,
            date,
            startTime,
            endTime,
            status,
            isWalkin,
            createdAt: startTime,
            services: { create: selectedServices.map(s => ({ serviceId: s.id })) },
          },
        });

        allAppointments.push({ appointment, customer, selectedServices, date, status });

        // Create invoice for COMPLETED appointments
        if (status === 'COMPLETED') {
          const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
          const hasDiscount = Math.random() < 0.15;
          const discountType = hasDiscount ? (Math.random() < 0.5 ? 'flat' : 'percentage') : null;
          const discountValue = hasDiscount ? (discountType === 'flat' ? pick([50, 100, 200]) : pick([5, 10, 15])) : null;
          let totalAmount = subtotal;
          if (discountType === 'flat' && discountValue) totalAmount = subtotal - discountValue;
          else if (discountType === 'percentage' && discountValue) totalAmount = subtotal * (1 - discountValue / 100);
          totalAmount = Math.max(0, Math.round(totalAmount));

          const paymentMode = pick(paymentModes);

          await prisma.invoice.create({
            data: {
              invoiceNumber: generateInvoiceNumber(date, invoiceIdx++),
              customerId: customer.id,
              appointmentId: appointment.id,
              subtotal,
              discountType,
              discountValue,
              totalAmount,
              paymentMode,
              paymentStatus: 'PAID',
              paidAt: endTime,
              createdAt: endTime,
              items: {
                create: selectedServices.map(s => ({
                  serviceId: s.id,
                  price: s.price,
                  quantity: 1,
                })),
              },
            },
          });

          // Update customer stats
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              totalVisits: { increment: 1 },
              totalSpent: { increment: totalAmount },
              lastVisitAt: endTime,
            },
          });
        }
      } catch (err) {
        // Skip conflicts silently (e.g. unique constraint on appointmentId in invoice)
        if (!err.message?.includes('Unique constraint')) {
          console.warn(`  ⚠️  Skipped appointment: ${err.message}`);
        }
      }
    }
  }

  // ── Update VIP tags for high-visit customers ──
  const highVisitCustomers = await prisma.customer.findMany({
    where: { totalVisits: { gte: 15 } },
  });
  for (const c of highVisitCustomers) {
    await prisma.customer.update({
      where: { id: c.id },
      data: { tag: 'VIP' },
    });
  }

  // ── Loyalty rewards for qualifying customers ──
  const configs = await prisma.loyaltyConfig.findMany({ where: { isActive: true } });
  const allCustomers = await prisma.customer.findMany();
  for (const customer of allCustomers) {
    for (const config of configs) {
      if (customer.totalVisits >= config.visitThreshold) {
        const existing = await prisma.loyaltyReward.findFirst({
          where: { customerId: customer.id, loyaltyConfigId: config.id },
        });
        if (!existing) {
          await prisma.loyaltyReward.create({
            data: { customerId: customer.id, loyaltyConfigId: config.id },
          });
        }
      }
    }
  }

  // ── Sample Messages (past communication history) ──
  const messageTypes = ['REMINDER_24H', 'THANK_YOU', 'BIRTHDAY', 'MANUAL'];
  const completedAppts = allAppointments.filter(a => a.status === 'COMPLETED');
  const sampleMsgs = completedAppts.slice(0, 40); // ~40 messages from recent appointments

  for (const { customer, date } of sampleMsgs) {
    const type = pick(messageTypes);
    let content;
    if (type === 'REMINDER_24H') content = `Hi ${customer.name}, your appointment at Orrenza Unisex Salon is tomorrow. See you there!`;
    else if (type === 'THANK_YOU') content = `Thank you for visiting Orrenza Unisex Salon, ${customer.name}! We hope to see you again soon.`;
    else if (type === 'BIRTHDAY') content = `Happy Birthday ${customer.name}! 🎉 Enjoy 15% off your next visit at Orrenza Unisex Salon.`;
    else content = `Hi ${customer.name}, we have exciting offers for you this week at Orrenza Unisex Salon!`;

    await prisma.messageLog.create({
      data: {
        customerId: customer.id,
        type,
        channel: Math.random() < 0.6 ? 'whatsapp' : 'sms',
        content,
        status: Math.random() < 0.9 ? 'DELIVERED' : 'FAILED',
        sentAt: date,
      },
    });
  }

  // ── Today's upcoming appointments (for dashboard) ──
  for (let i = 0; i < 4; i++) {
    const customer = customers[i];
    const stylist = stylists[i % stylists.length];
    const svc = services[i];
    const startTime = setTime(today, 10 + i * 2, 0);
    const endTime = new Date(startTime.getTime() + svc.duration * 60000);

    try {
      await prisma.appointment.create({
        data: {
          customerId: customer.id,
          stylistId: stylist.id,
          date: today,
          startTime,
          endTime,
          status: i === 0 ? 'IN_PROGRESS' : 'BOOKED',
          services: { create: [{ serviceId: svc.id }] },
        },
      });
    } catch (err) { /* skip conflicts */ }
  }

  // ── Summary ──
  const [apptCount, invCount, custCount, msgCount] = await Promise.all([
    prisma.appointment.count(),
    prisma.invoice.count(),
    prisma.customer.count(),
    prisma.messageLog.count(),
  ]);

  console.log('✅ Seed complete!');
  console.log(`   📅 ${apptCount} appointments`);
  console.log(`   🧾 ${invCount} invoices`);
  console.log(`   👥 ${custCount} customers`);
  console.log(`   💬 ${msgCount} messages`);
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:        admin@orrenza.com / admin123');
  console.log('  Receptionist: reception@orrenza.com / recep123');
  console.log('  Stylist:      priya@orrenza.com / stylist123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
