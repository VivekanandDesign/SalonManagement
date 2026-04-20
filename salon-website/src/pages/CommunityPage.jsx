import { Link } from 'react-router-dom';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import {
  GitFork, GitPullRequest, Star, Heart, Users, MessageSquare,
  ArrowRight, ExternalLink, Check, Lightbulb, BookOpen, Code2,
  Rocket, Bug, Sparkles, Globe, Shield
} from 'lucide-react';

/* ─── Hero ─── */
function CommunityHero() {
  return (
    <section className="py-12 lg:py-20 bg-surface-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-6">
            <Heart size={14} /> Community Driven
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Built by the Community,{' '}
            <span className="text-primary-400">For the Community</span>
          </h1>
          <p className="mt-5 text-lg text-surface-400 max-w-2xl mx-auto">
            Orrenza is 100% open source. Join a growing community of developers and salon owners building the future of salon management.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/VivekcMW/SMVIVEK"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto group px-6 py-3 text-sm font-semibold text-surface-900 bg-white rounded-lg hover:bg-primary-50 transition-all shadow-card flex items-center justify-center gap-2"
            >
              <GitFork size={18} /> Star on GitHub <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/VivekcMW/SMVIVEK/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Bug size={18} /> Report an Issue
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Contributing ─── */
function Contributing() {
  const steps = [
    { icon: GitFork, title: 'Fork the Repository', desc: 'Clone the repo to your GitHub account and set up the development environment.' },
    { icon: Code2, title: 'Pick an Issue', desc: 'Browse open issues labeled "good first issue" or "help wanted" to find something to work on.' },
    { icon: GitPullRequest, title: 'Submit a PR', desc: 'Make your changes, write tests, and submit a pull request. We review PRs within 48 hours.' },
    { icon: Rocket, title: 'Get Merged', desc: 'Once approved, your code becomes part of Orrenza. You\'ll be added to our contributors wall!' },
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            How to <span className="gradient-text">Contribute</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            Whether you&apos;re a developer, designer, or salon owner — there&apos;s a place for you here.
          </p>
        </FadeIn>

        <div className="relative max-w-3xl mx-auto">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-primary-200 hidden sm:block" />

          <StaggerContainer className="space-y-10" staggerDelay={0.15}>
            {steps.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center relative z-10">
                      <step.icon size={22} />
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center z-20">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-surface-800">{step.title}</h3>
                    <p className="mt-1 text-sm text-surface-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

/* ─── Ways to Help ─── */
function WaysToHelp() {
  const ways = [
    { icon: Code2, title: 'Code Contributions', desc: 'Fix bugs, add features, improve performance. All PRs are welcome.' },
    { icon: Bug, title: 'Bug Reports', desc: 'Found a bug? Open an issue with steps to reproduce. It helps everyone.' },
    { icon: Lightbulb, title: 'Feature Requests', desc: 'Have an idea? Share it! The best features come from the community.' },
    { icon: BookOpen, title: 'Documentation', desc: 'Help improve our docs, tutorials, and getting-started guides.' },
    { icon: Globe, title: 'Translations', desc: 'Help make Orrenza available in more languages for salons worldwide.' },
    { icon: MessageSquare, title: 'Spread the Word', desc: 'Star the repo, share on social media, or tell a salon owner about us.' },
  ];

  return (
    <section className="py-16 lg:py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Ways to <span className="gradient-text">Get Involved</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {ways.map((w) => (
            <StaggerItem key={w.title}>
              <div className="bg-white rounded-xl border border-surface-100 p-6 hover:border-primary-200 hover:shadow-card-hover transition-all h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                  <w.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-surface-800">{w.title}</h3>
                <p className="mt-2 text-sm text-surface-400 leading-relaxed">{w.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── Roadmap ─── */
function Roadmap() {
  const milestones = [
    { status: 'done', title: 'Core Features', desc: 'Appointments, billing, CRM, services, staff management', items: ['Calendar scheduling', 'Invoice generation', 'Customer profiles'] },
    { status: 'done', title: 'Communications', desc: 'WhatsApp automation and notification center', items: ['Auto reminders', 'Birthday messages', 'Campaign manager'] },
    { status: 'done', title: 'Loyalty & Rewards', desc: 'Customer retention and engagement tools', items: ['Visit milestones', 'Referral program', 'Membership plans'] },
    { status: 'current', title: 'Landing Website', desc: 'Marketing site and community hub', items: ['Product showcase', 'Community page', 'OAuth integration'] },
    { status: 'upcoming', title: 'Mobile App', desc: 'Native mobile experience for on-the-go management', items: ['React Native app', 'Push notifications', 'Offline support'] },
    { status: 'upcoming', title: 'Marketplace', desc: 'Plugin ecosystem and template marketplace', items: ['Theme customization', 'Third-party integrations', 'Custom reports'] },
  ];

  const statusStyles = {
    done: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500', label: 'Completed' },
    current: { bg: 'bg-primary-100', text: 'text-primary-600', dot: 'bg-primary-500', label: 'In Progress' },
    upcoming: { bg: 'bg-surface-100', text: 'text-surface-500', dot: 'bg-surface-300', label: 'Planned' },
  };

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-10 lg:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-surface-900">
            Product <span className="gradient-text">Roadmap</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
            Where we&apos;ve been and where we&apos;re headed. Your feedback shapes our priorities.
          </p>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
          {milestones.map((m) => {
            const style = statusStyles[m.status];
            return (
              <StaggerItem key={m.title}>
                <div className="bg-white rounded-xl border border-surface-100 p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-surface-800">{m.title}</h3>
                  <p className="mt-1 text-sm text-surface-400">{m.desc}</p>
                  <ul className="mt-4 space-y-1.5 flex-1">
                    {m.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-surface-500">
                        {m.status === 'done' ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        )}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CommunityCTA() {
  return (
    <section className="py-12 lg:py-20 bg-surface-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
            Ready to Join the Movement?
          </h2>
          <p className="mt-4 text-surface-400 text-lg max-w-xl mx-auto">
            Every contribution matters. Every star counts. Let&apos;s build the best salon software together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/VivekcMW/SMVIVEK"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-surface-900 bg-primary-400 rounded-lg hover:bg-primary-300 transition-all shadow-card flex items-center justify-center gap-2"
            >
              <GitFork size={18} /> View on GitHub
            </a>
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Try Orrenza Free <ArrowRight size={18} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Community Page ─── */
export default function CommunityPage() {
  return (
    <div className="pt-20">
      <CommunityHero />
      <Contributing />
      <WaysToHelp />
      <Roadmap />
      <CommunityCTA />
    </div>
  );
}
