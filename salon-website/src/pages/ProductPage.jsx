import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import {
  Calendar, Users, Receipt, Bell, Scissors, Star, Shield, BarChart3,
  Sparkles, CreditCard, MessageCircle, Gift, Clock, TrendingUp,
  ArrowRight, Check, ChevronDown, Zap, Heart, Settings, UserCheck,
  Smartphone, Globe, Lock, Database, Palette, Monitor
} from 'lucide-react';

/* ─── Feature Grid ─── */
const allFeatures = [
  { icon: Calendar, title: 'Appointment Scheduling', desc: 'Calendar-based booking with daily and weekly views, walk-in support, and status tracking.' },
  { icon: Users, title: 'Customer CRM', desc: 'Complete profiles, visit history, preferences, tags, and spending analytics for every customer.' },
  { icon: Receipt, title: 'Invoicing & Billing', desc: 'Generate invoices, apply discounts, split services, handle multiple payment modes.' },
  { icon: MessageCircle, title: 'WhatsApp Automation', desc: 'Automated reminders, birthday wishes, re-engagement messages, and campaign manager.' },
  { icon: Gift, title: 'Loyalty & Rewards', desc: 'Visit milestones, referral rewards, membership plans, and digital wallet top-ups.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Revenue trends, service popularity, staff performance, and custom date range reports.' },
  { icon: Scissors, title: 'Service Management', desc: 'Categories, services, combos, pricing, duration, and staff assignment in one place.' },
  { icon: UserCheck, title: 'Staff Management', desc: 'Staff profiles, specializations, attendance tracking, and performance metrics.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'In-app notifications for appointments, payments, low stock, and important events.' },
  { icon: CreditCard, title: 'Multi-Payment Support', desc: 'Cash, card, UPI, wallet — track all payment methods with ease.' },
  { icon: Clock, title: 'Attendance Tracking', desc: 'Clock in/out, late tracking, overtime calculation, and monthly attendance reports.' },
  { icon: Star, title: 'Customer Reviews', desc: 'Collect and display ratings, track service quality trends over time.' },
  { icon: Settings, title: 'Business Settings', desc: 'Customize salon name, hours, tax rates, currency, and notification preferences.' },
  { icon: Smartphone, title: 'Responsive Design', desc: 'Works perfectly on desktop, tablet, and mobile — manage your salon from anywhere.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Admin, receptionist, stylist roles with appropriate permissions and views.' },
  { icon: Lock, title: 'Secure Authentication', desc: 'JWT-based auth with Google, Facebook OAuth, and secure password hashing.' },
  { icon: Database, title: 'Self-Hosted', desc: 'Host on your own server. Your data stays with you. Docker support included.' },
  { icon: Globe, title: 'Open Source', desc: 'MIT licensed. Full access to source code. Customize to your needs.' },
  { icon: Palette, title: 'Beautiful UI', desc: 'Modern, clean design with Tailwind CSS. Intuitive for your entire staff.' },
  { icon: Monitor, title: 'Real-time Dashboard', desc: 'Today\'s appointments, revenue, top services, and quick stats at a glance.' },
];

function FeatureGrid() {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? allFeatures : allFeatures.slice(0, 12);

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <Sparkles size={14} /> 20+ Features
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Built for Salons,{' '}
            <span className="gradient-text">By People Who Care</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            Every feature is designed to solve real problems faced by salon owners and their staff every day.
          </p>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" staggerDelay={0.05}>
          {display.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group bg-white rounded-xl border border-surface-100 p-5 hover:border-primary-200 hover:shadow-card-hover transition-all duration-300 h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                  <f.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-surface-800">{f.title}</h3>
                <p className="mt-1.5 text-xs text-surface-400 leading-relaxed">{f.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {!showAll && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              Show All {allFeatures.length} Features <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Deep Dive Sections ─── */
const deepDives = [
  {
    icon: Calendar,
    title: 'Smart Appointment Scheduling',
    subtitle: 'Never miss a booking again',
    description: 'Our calendar system supports daily and weekly views, drag-and-drop rescheduling, walk-in management, and intelligent conflict detection. Set up automated WhatsApp reminders to eliminate no-shows.',
    features: ['Daily & weekly calendar views', 'Walk-in appointment support', 'Double-booking prevention', 'Status tracking (Scheduled → Completed)', 'Automated reminder notifications', 'Service duration auto-calculation'],
    reversed: false,
  },
  {
    icon: Users,
    title: 'Complete Customer CRM',
    subtitle: 'Know every customer personally',
    description: 'Every customer gets a detailed profile with visit history, favorite services, spending patterns, and personal notes. Tag VIPs, track birthdays, and build lasting relationships.',
    features: ['Full visit & purchase history', 'Customer tagging & segments', 'Birthday & anniversary tracking', 'Spending analytics per customer', 'Notes & preferences', 'Quick-action side panels'],
    reversed: true,
  },
  {
    icon: Receipt,
    title: 'Professional Invoicing',
    subtitle: 'Bill in seconds, not minutes',
    description: 'Generate itemized invoices from appointments with one click. Apply combo discounts, handle partial payments, track payment modes, and export PDFs for your records.',
    features: ['One-click invoice generation', 'Combo & discount support', 'Multiple payment methods', 'Tax calculation & GST support', 'Invoice history & search', 'Payment status tracking'],
    reversed: false,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp & SMS Automation',
    subtitle: 'Stay connected effortlessly',
    description: 'Set up automated message flows for appointment reminders, birthday wishes, post-visit thank-yous, and re-engagement campaigns. Keep your customers coming back without lifting a finger.',
    features: ['Appointment reminders', 'Birthday & anniversary wishes', 'Post-visit thank you', 'Re-engagement for inactive customers', 'Campaign scheduling', 'Message delivery tracking'],
    reversed: true,
  },
];

function DeepDives() {
  return (
    <section className="py-16 lg:py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 lg:space-y-24">
        {deepDives.map((d, i) => (
          <FadeIn key={d.title} direction={d.reversed ? 'right' : 'left'}>
            <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${d.reversed ? 'lg:flex-row-reverse' : ''}`}>
              <div className={d.reversed ? 'lg:order-2' : ''}>
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                  <d.icon size={24} />
                </div>
                <p className="text-sm font-medium text-primary-600 mb-1">{d.subtitle}</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-surface-900">{d.title}</h3>
                <p className="mt-3 text-surface-500 leading-relaxed">{d.description}</p>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {d.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-surface-600">
                      <Check size={14} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${d.reversed ? 'lg:order-1' : ''}`}>
                <div className="bg-white rounded-xl shadow-card border border-surface-100 p-6 sm:p-8 min-h-[200px] sm:min-h-[280px] flex items-center justify-center">
                  <div className="text-center">
                    <d.icon size={48} className="text-primary-300 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">Feature preview</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Simple <span className="gradient-text">Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            Orrenza is free and open source. No hidden fees, no premium tiers.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Self-Hosted */}
          <FadeIn delay={0.1}>
            <div className="relative bg-white rounded-xl border-2 border-primary-300 p-6 sm:p-8 shadow-card">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 text-xs font-bold bg-primary-500 text-white rounded-full">RECOMMENDED</span>
              </div>
              <h3 className="text-xl font-bold text-surface-900">Self-Hosted</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-surface-900">₹0</span>
                <span className="text-surface-400 text-sm">/forever</span>
              </div>
              <p className="mt-3 text-sm text-surface-500">Host on your own server. Full control, full privacy.</p>
              <ul className="mt-6 space-y-3">
                {['All 20+ features', 'Unlimited customers', 'Unlimited staff', 'Docker deployment', 'Full source code', 'Community support', 'MIT License'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-surface-600">
                    <Check size={16} className="text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://github.com/VivekcMW/SMVIVEK"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Zap size={16} /> Deploy Now
              </a>
            </div>
          </FadeIn>

          {/* Cloud */}
          <FadeIn delay={0.2}>
            <div className="bg-surface-50 rounded-xl border border-surface-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-surface-900">Cloud Hosted</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-surface-400">Soon</span>
              </div>
              <p className="mt-3 text-sm text-surface-500">Managed hosting with automatic updates. Coming soon.</p>
              <ul className="mt-6 space-y-3">
                {['Everything in Self-Hosted', 'Managed hosting', 'Automatic updates', 'Daily backups', 'SSL included', 'Priority support', 'Custom domain'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-surface-400">
                    <Check size={16} className="text-surface-300 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-surface-400 bg-surface-100 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ─── Tech Stack ─── */
function TechStack() {
  const stack = [
    { name: 'React', desc: 'Modern UI library' },
    { name: 'Tailwind CSS', desc: 'Utility-first styling' },
    { name: 'Express.js', desc: 'Fast backend framework' },
    { name: 'Prisma', desc: 'Type-safe ORM' },
    { name: 'PostgreSQL', desc: 'Reliable database' },
    { name: 'Docker', desc: 'Container deployment' },
  ];

  return (
    <section className="py-12 lg:py-20 bg-surface-50 border-t border-surface-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10">
          <h3 className="text-lg font-semibold text-surface-600">Built With Modern Technology</h3>
        </FadeIn>
        <StaggerContainer className="flex flex-wrap justify-center gap-6" staggerDelay={0.05}>
          {stack.map((t) => (
            <StaggerItem key={t.name}>
              <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-lg border border-surface-100 shadow-card">
                <span className="text-sm font-semibold text-surface-700">{t.name}</span>
                <span className="text-xs text-surface-400">{t.desc}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Product Page ─── */
export default function ProductPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 lg:py-20 bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 leading-tight">
              One Platform,{' '}
              <span className="gradient-text">Every Feature</span>
            </h1>
            <p className="mt-5 text-lg text-surface-500 max-w-2xl mx-auto">
              Orrenza packs 20+ purpose-built features into a single, elegant application. Explore everything your salon needs to thrive.
            </p>
          </FadeIn>
        </div>
      </section>

      <FeatureGrid />
      <DeepDives />
      <Pricing />
      <TechStack />
    </div>
  );
}
