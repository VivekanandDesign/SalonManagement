require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin user found. Run main seed first.');
    process.exit(1);
  }

  // Get some services for applicable services
  const services = await prisma.service.findMany({ take: 5 });
  const svcIds = services.map(s => s.id);

  const campaigns = [
    {
      name: 'Monsoon Spa Special',
      description: 'Monsoon season spa discount for all customers',
      couponCode: 'MONSOON25',
      discountType: 'percentage',
      discountValue: 25,
      minBillAmount: 500,
      maxDiscount: 300,
      validFrom: new Date('2026-04-10'),
      validTo: new Date('2026-05-31'),
      applicableServices: null,
      targetAudience: 'ALL',
      messageTemplate: `Hi {{name}}! 🌧️

Monsoon Spa Special at Orrenza Unisex Salon!

Use code *{{coupon}}* to get *{{discount}}*!

Min bill ₹500 | Max discount ₹300
Valid till {{validTo}}.

Book now! 💆‍♀️`,
      status: 'DRAFT',
      sentCount: 0,
      deliveredCount: 0,
      redeemedCount: 0,
      createdById: admin.id,
    },
    {
      name: 'VIP Exclusive — Flat ₹200 Off',
      description: 'Exclusive offer for VIP tagged customers',
      couponCode: 'VIP200',
      discountType: 'flat',
      discountValue: 200,
      minBillAmount: 1000,
      maxDiscount: null,
      validFrom: new Date('2026-04-01'),
      validTo: new Date('2026-04-30'),
      applicableServices: null,
      targetAudience: 'VIP',
      messageTemplate: `Dear {{name}}, ✨

As our valued VIP client, here's an exclusive offer!

Use code *{{coupon}}* for a flat *{{discount}}* on your next visit.

Valid till {{validTo}}. You deserve the best! 💎

— Orrenza Unisex Salon`,
      status: 'SCHEDULED',
      scheduledAt: new Date('2026-04-12T10:00:00'),
      sentCount: 0,
      deliveredCount: 0,
      redeemedCount: 0,
      createdById: admin.id,
    },
    {
      name: 'Summer Hair Color Fest',
      description: 'Discount on hair coloring services for summer',
      couponCode: 'COLOR30',
      discountType: 'percentage',
      discountValue: 30,
      minBillAmount: 800,
      maxDiscount: 500,
      validFrom: new Date('2026-03-15'),
      validTo: new Date('2026-04-15'),
      applicableServices: svcIds.length >= 3 ? JSON.stringify(svcIds.slice(0, 3)) : null,
      targetAudience: 'REGULAR',
      messageTemplate: `Hey {{name}}! 🌈

Summer Hair Color Fest is HERE!

Get *{{discount}}* on hair color services with code *{{coupon}}*

Hurry, offer valid till {{validTo}} only!

Visit {{salon}} today! ✂️`,
      status: 'SENT',
      sentCount: 42,
      deliveredCount: 38,
      redeemedCount: 7,
      createdById: admin.id,
    },
    {
      name: 'New Customer Welcome — 15% Off',
      description: 'Welcome offer for customers joined in last 7 days',
      couponCode: 'WELCOME15',
      discountType: 'percentage',
      discountValue: 15,
      minBillAmount: 300,
      maxDiscount: 200,
      validFrom: new Date('2026-04-01'),
      validTo: new Date('2026-06-30'),
      applicableServices: null,
      targetAudience: 'NEW',
      messageTemplate: `Welcome to Orrenza, {{name}}! 🎉

We're happy to have you! Enjoy *{{discount}}* on your next visit.

Use code *{{coupon}}* at billing.
Valid till {{validTo}}.

See you soon! 💇‍♂️`,
      status: 'SENT',
      sentCount: 15,
      deliveredCount: 14,
      redeemedCount: 3,
      createdById: admin.id,
    },
    {
      name: 'Weekend Blowout — Flat ₹100 Off',
      description: 'Weekend promotional campaign — cancelled due to low interest',
      couponCode: 'WEEKEND100',
      discountType: 'flat',
      discountValue: 100,
      minBillAmount: 400,
      maxDiscount: null,
      validFrom: new Date('2026-03-01'),
      validTo: new Date('2026-03-31'),
      applicableServices: null,
      targetAudience: 'ALL',
      messageTemplate: `Hi {{name}}! 🎊

This weekend only — Flat *{{discount}}* at {{salon}}!

Use code *{{coupon}}* | Min bill ₹400
Valid till {{validTo}}.

Don't miss out! 💈`,
      status: 'CANCELLED',
      sentCount: 0,
      deliveredCount: 0,
      redeemedCount: 0,
      createdById: admin.id,
    },
  ];

  for (const c of campaigns) {
    // Upsert by couponCode (unique)
    await prisma.campaign.upsert({
      where: { couponCode: c.couponCode },
      update: {
        name: c.name,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minBillAmount: c.minBillAmount,
        maxDiscount: c.maxDiscount,
        validFrom: c.validFrom,
        validTo: c.validTo,
        applicableServices: c.applicableServices,
        targetAudience: c.targetAudience,
        messageTemplate: c.messageTemplate,
        scheduledAt: c.scheduledAt || null,
        status: c.status,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        redeemedCount: c.redeemedCount,
      },
      create: c,
    });
    console.log(`  ✓ Campaign: ${c.name} (${c.couponCode}) — ${c.status}`);
  }

  console.log(`\n✅ Seeded ${campaigns.length} campaigns`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
