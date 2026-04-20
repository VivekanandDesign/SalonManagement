import { Link } from 'react-router-dom';
import { Scissors, Globe, MessageCircle, ExternalLink } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', to: '/product' },
    { label: 'Appointments', to: '/product#appointments' },
    { label: 'Billing', to: '/product#billing' },
    { label: 'CRM', to: '/product#crm' },
  ],
  Community: [
    { label: 'GitHub', href: 'https://github.com/VivekcMW/SMVIVEK' },
    { label: 'Contributing', to: '/community#contributing' },
    { label: 'Roadmap', to: '/community#roadmap' },
    { label: 'Discussions', href: 'https://github.com/VivekcMW/SMVIVEK/discussions' },
  ],
  Company: [
    { label: 'About', to: '/community' },
    { label: 'Contact', to: '/contact' },
    { label: 'License (MIT)', href: 'https://github.com/VivekcMW/SMVIVEK/blob/main/LICENSE' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
                <Scissors size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Orrenza</span>
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">
              Open-source salon management software built for modern salons and spas.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                { icon: Globe, href: 'https://github.com/VivekcMW/SMVIVEK' },
                { icon: MessageCircle, href: '#' },
                { icon: ExternalLink, href: '#' },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-colors">
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link to={item.to} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-500">&copy; {new Date().getFullYear()} Orrenza. Open source under MIT License.</p>
          <p className="text-sm text-surface-500">Made with ♥ for salons everywhere</p>
        </div>
      </div>
    </footer>
  );
}
