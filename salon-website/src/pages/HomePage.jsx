import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import {
  Calendar, Users, Receipt, Bell, Scissors, Star, Shield, BarChart3,
  Sparkles, CreditCard, MessageCircle, Gift, Clock, TrendingUp,
  ArrowRight, Check, ChevronRight, Zap, Heart,
  ClipboardList, UserX, Wallet, Smartphone, RefreshCw, User
} from 'lucide-react';

/* ─── Hero ─── */
function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -60]);
  const y2 = useTransform(scrollY, [0, 500], [0, -30]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <Sparkles size={14} /> Open Source &middot; Free Forever
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-7xl font-extrabold text-surface-900 leading-[1.1] tracking-tight"
          >
            The Modern Way to{' '}
            <span className="gradient-text">Manage Your Salon</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-surface-500 max-w-2xl mx-auto leading-relaxed"
          >
            Everything you need to run a successful salon — appointments, billing, CRM, loyalty programs,
            WhatsApp reminders, and more. All in one beautiful, open-source platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="w-full sm:w-auto group px-8 py-3.5 text-base font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:ring-2 focus:ring-primary-200 transition-all shadow-card hover:shadow-card-hover flex items-center justify-center gap-2"
            >
              Start Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/product"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-all shadow-card flex items-center justify-center gap-2"
            >
              See Features <ChevronRight size={18} />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 text-sm text-surface-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
          >
            <span className="flex items-center gap-1"><Check size={14} className="text-green-500" /> No credit card</span>
            <span className="flex items-center gap-1"><Check size={14} className="text-green-500" /> Self-hosted</span>
            <span className="flex items-center gap-1"><Check size={14} className="text-green-500" /> MIT License</span>
          </motion.p>
        </div>

        {/* Dashboard Mockup */}
        <motion.div style={{ y: y1, opacity }} className="mt-16 relative max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-card-hover border border-surface-200/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 bg-surface-50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 text-center text-xs text-surface-400">app.orrenza.com</div>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-primary-50/50 to-white min-h-[240px] sm:min-h-[400px] flex items-center justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl">
                {[
                  { icon: Calendar, label: 'Appointments', value: '24 Today', color: 'bg-blue-100 text-blue-600' },
                  { icon: Users, label: 'Customers', value: '1,247', color: 'bg-purple-100 text-purple-600' },
                  { icon: TrendingUp, label: 'Revenue', value: '₹45,800', color: 'bg-green-100 text-green-600' },
                  { icon: Star, label: 'Reviews', value: '4.9 ★', color: 'bg-primary-100 text-primary-600' },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    style={{ y: y2 }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                    className="bg-white rounded-xl p-4 shadow-card border border-surface-100"
                  >
                    <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
                      <card.icon size={16} />
                    </div>
                    <div className="text-xs text-surface-400">{card.label}</div>
                    <div className="text-lg font-bold text-surface-800 mt-0.5">{card.value}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Problem → Solution ─── */
function ProblemSolution() {
  const problems = [
    { icon: ClipboardList, problem: 'Paper registers & lost records', solution: 'Centralized digital customer database' },
    { icon: UserX, problem: 'No-shows and double bookings', solution: 'Smart scheduling with auto-reminders' },
    { icon: Wallet, problem: 'Manual revenue tracking', solution: 'Real-time billing and analytics' },
    { icon: Smartphone, problem: 'No follow-up system', solution: 'Automated WhatsApp & SMS campaigns' },
    { icon: RefreshCw, problem: 'Customers never return', solution: 'Loyalty programs & re-engagement' },
    { icon: BarChart3, problem: 'Zero business insights', solution: 'Comprehensive reports & dashboards' },
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            From Chaos to <span className="gradient-text">Clarity</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            Most salons struggle with fragmented tools. Orrenza brings everything together.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {problems.map((item) => (
            <StaggerItem key={item.problem}>
              <div className="group relative bg-white rounded-xl border border-surface-100 p-6 hover:border-primary-200 hover:shadow-card transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                  <item.icon size={20} />
                </div>
                <div className="mt-3">
                  <p className="text-sm text-surface-400 line-through decoration-red-300">{item.problem}</p>
                  <p className="mt-2 text-base font-semibold text-surface-800 flex items-center gap-2">
                    <Check size={16} className="text-green-500 shrink-0" /> {item.solution}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Feature Tabs ─── */
function FeatureTabs() {
  const features = [
    {
      id: 'appointments',
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Calendar-based appointment booking with daily/weekly views. Prevent double-bookings, handle walk-ins, and track appointment status in real-time.',
      highlights: ['Drag & drop calendar', 'Walk-in support', 'No double-booking', 'Auto-reminders'],
    },
    {
      id: 'billing',
      icon: Receipt,
      title: 'Invoicing & Billing',
      description: 'Generate professional invoices instantly. Support multiple payment modes, apply discounts, and track revenue with detailed breakdowns.',
      highlights: ['One-click invoices', 'Multiple payment modes', 'Tax calculations', 'PDF export'],
    },
    {
      id: 'crm',
      icon: Users,
      title: 'Customer CRM',
      description: 'Complete customer profiles with visit history, preferences, and spending analytics. Tag customers and never lose track of a client again.',
      highlights: ['Visit history', 'Customer tags', 'Spending analytics', 'Notes & preferences'],
    },
    {
      id: 'communications',
      icon: MessageCircle,
      title: 'WhatsApp Automation',
      description: 'Automated appointment reminders, birthday wishes, re-engagement messages, and thank-you notes — all via WhatsApp.',
      highlights: ['Auto reminders', 'Birthday messages', 'Re-engagement', 'Campaign manager'],
    },
    {
      id: 'loyalty',
      icon: Gift,
      title: 'Loyalty & Rewards',
      description: 'Keep customers coming back with milestone rewards, referral programs, memberships, and wallet top-ups.',
      highlights: ['Visit milestones', 'Referral rewards', 'Membership plans', 'Digital wallet'],
    },
    {
      id: 'reports',
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Revenue trends, service popularity, staff performance, and customer analytics — all at a glance on your dashboard.',
      highlights: ['Revenue charts', 'Staff performance', 'Service analytics', 'Custom date ranges'],
    },
  ];

  const [activeTab, setActiveTab] = useState(0);
  const active = features[activeTab];

  return (
    <section className="py-16 lg:py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Everything You Need,{' '}
            <span className="gradient-text">Nothing You Don&apos;t</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            20+ features designed specifically for salons and spas.
          </p>
        </FadeIn>

        {/* Tab Buttons */}
        <FadeIn delay={0.1}>
          <div className="flex flex-wrap justify-center gap-2 mb-8 lg:mb-10">
            {features.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === i
                    ? 'bg-primary-500 text-white shadow-card'
                    : 'bg-white text-surface-500 border border-surface-200 hover:border-primary-300'
                }`}
              >
                <f.icon size={16} /> {f.title}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Tab Content */}
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid lg:grid-cols-2 gap-10 items-center"
        >
          <div>
            <div className={`w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4`}>
              <active.icon size={24} />
            </div>
            <h3 className="text-2xl font-bold text-surface-900">{active.title}</h3>
            <p className="mt-3 text-surface-500 leading-relaxed">{active.description}</p>
            <ul className="mt-5 space-y-2.5">
              {active.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-surface-600">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-green-600" />
                  </div>
                  {h}
                </li>
              ))}
            </ul>
            <Link
              to="/product"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Learn more <ArrowRight size={16} />
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-card-hover border border-surface-100 p-6 sm:p-8 min-h-[200px] sm:min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <active.icon size={48} className="text-primary-400 mx-auto mb-4" />
              <p className="text-surface-400 text-sm">Interactive preview</p>
              <p className="text-surface-300 text-xs mt-1">Dashboard screenshot coming soon</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Stats ─── */
function Stats() {
  const stats = [
    { value: '20+', label: 'Features' },
    { value: '100%', label: 'Open Source' },
    { value: '0', label: 'Monthly Cost', suffix: '' },
    { value: 'MIT', label: 'License' },
  ];

  return (
    <section className="py-12 lg:py-20 bg-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.1}>
          {stats.map((s) => (
            <StaggerItem key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-primary-400">{s.value}</div>
              <div className="mt-2 text-surface-400 text-sm font-medium">{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const testimonials = [
    { name: 'Priya Sharma', role: 'Owner, Glow Studio', quote: 'Orrenza replaced our paper register, WhatsApp reminders, and Excel billing — all in one. Our no-shows dropped by 60%.', initials: 'PS', color: 'bg-primary-100 text-primary-700' },
    { name: 'Rajesh Kumar', role: 'Manager, Urban Cuts', quote: 'The loyalty program alone increased our repeat visits by 40%. And it\'s completely free!', initials: 'RK', color: 'bg-accent-100 text-accent-600' },
    { name: 'Anita Desai', role: 'Owner, Serenity Spa', quote: 'Finally a salon software that isn\'t overkill. Simple, beautiful, and my staff learned it in 10 minutes.', initials: 'AD', color: 'bg-success-50 text-success-600' },
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Loved by <span className="gradient-text">Salon Owners</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.1}>
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="bg-surface-50 rounded-xl p-6 border border-surface-100 h-full flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-primary-400 fill-primary-400" />)}
                </div>
                <p className="text-surface-600 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-surface-200">
                  <div className={`w-9 h-9 rounded-lg ${t.color} flex items-center justify-center text-xs font-bold`}>{t.initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-surface-800">{t.name}</p>
                    <p className="text-xs text-surface-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section className="py-16 lg:py-24 bg-primary-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white leading-tight">
            Ready to Transform<br />Your Salon?
          </h2>
          <p className="mt-5 text-lg text-primary-200 max-w-xl mx-auto">
            Join the growing community of salons using Orrenza. Free, open-source, and built with love.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto group px-8 py-3.5 text-base font-semibold text-primary-700 bg-white rounded-lg hover:bg-primary-50 transition-all shadow-card flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://github.com/VivekcMW/SMVIVEK"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} /> Star on GitHub
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Home Page ─── */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <FeatureTabs />
      <Stats />
      <Testimonials />
      <CTA />
    </>
  );
}
