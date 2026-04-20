import { useState } from 'react';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, Send, ChevronDown, MessageSquare,
  Globe, ExternalLink, GitFork, Clock, ArrowRight
} from 'lucide-react';

/* ─── Contact Form ─── */
function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', salon: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // In production, this would send to an API
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm({ name: '', email: '', salon: '', subject: '', message: '' });
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left — Info */}
          <FadeIn direction="left">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
                Get in <span className="gradient-text">Touch</span>
              </h2>
              <p className="mt-4 text-surface-500 leading-relaxed">
                Have a question, feature request, or just want to say hi? We&apos;d love to hear from you.
                Whether you&apos;re a salon owner exploring Orrenza or a developer looking to contribute.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">Email</p>
                    <p className="text-sm font-medium text-surface-700">support@orrenza.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">Response Time</p>
                    <p className="text-sm font-medium text-surface-700">Within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <GitFork size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">GitHub Issues</p>
                    <a
                      href="https://github.com/VivekcMW/SMVIVEK/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      Report bugs & request features →
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {[
                  { icon: GitFork, href: 'https://github.com/VivekcMW/SMVIVEK' },
                  { icon: Globe, href: '#' },
                  { icon: ExternalLink, href: '#' },
                ].map(({ icon: Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-surface-50 text-surface-400 flex items-center justify-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Right — Form */}
          <FadeIn direction="right">
            <form onSubmit={handleSubmit} className="bg-surface-50 rounded-xl border border-surface-100 p-5 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                    placeholder="jane@salon.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Salon Name (Optional)</label>
                <input
                  type="text"
                  value={form.salon}
                  onChange={e => setForm(f => ({ ...f, salon: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                  placeholder="Glow Studio"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Inquiry</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="setup">Setup Help</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all resize-none"
                  placeholder="Tell us how we can help..."
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-card"
              >
                <Send size={16} /> Send Message
              </button>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-3 px-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                  >
                    Message sent! We&apos;ll get back to you within 24 hours.
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const faqs = [
    { q: 'Is Orrenza really free?', a: 'Yes! Orrenza is 100% free and open source under the MIT License. You can self-host it on your own server with no recurring costs. We may offer a managed cloud version in the future for those who prefer not to self-host.' },
    { q: 'How do I install Orrenza?', a: 'Orrenza comes with Docker support for easy deployment. Clone the repository, run docker-compose up, and you\'re ready to go. Detailed setup instructions are in our GitHub README.' },
    { q: 'Can I customize Orrenza for my salon?', a: 'Absolutely! You can customize salon name, logo, working hours, tax rates, services, categories, and more from the Settings page. Since it\'s open source, you can also modify the source code to add custom features.' },
    { q: 'What about data privacy?', a: 'When self-hosted, your data stays on your own server. We never collect or access your salon data. You have complete control over your database and backups.' },
    { q: 'Do I need technical knowledge to use Orrenza?', a: 'For daily use, no — Orrenza is designed to be intuitive for non-technical users. For initial setup (self-hosting), basic knowledge of Docker or server administration is helpful. Our docs guide you through every step.' },
    { q: 'Can I contribute to Orrenza?', a: 'Yes! We welcome contributions of all kinds — code, documentation, translations, bug reports, and feature requests. Check out our Community page and GitHub repository to get started.' },
    { q: 'Does Orrenza support multiple staff members?', a: 'Yes. You can add unlimited staff members with different roles (Admin, Receptionist, Stylist), track their specializations, manage attendance, and view performance analytics.' },
    { q: 'Is WhatsApp integration included?', a: 'Orrenza supports WhatsApp message automation for appointment reminders, birthday wishes, and re-engagement campaigns. You\'ll need a WhatsApp Business API provider for sending messages.' },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-16 lg:py-24 bg-surface-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {faqs.map((faq, i) => (
            <StaggerItem key={faq.q}>
              <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-surface-800 pr-4">{faq.q}</span>
                  <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-surface-400 shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-4 text-sm text-surface-500 leading-relaxed border-t border-surface-100 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Contact Page ─── */
export default function ContactPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-10 lg:py-16 bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 leading-tight">
              We&apos;re Here to{' '}
              <span className="gradient-text">Help</span>
            </h1>
            <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
              Whether you need help setting up, have a feature idea, or want to explore a partnership — reach out anytime.
            </p>
          </FadeIn>
        </div>
      </section>

      <ContactForm />
      <FAQ />
    </div>
  );
}
