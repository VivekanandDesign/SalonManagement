import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Menu, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/product', label: 'Product' },
  { to: '/community', label: 'Community' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-surface-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-card">
              <Scissors size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-surface-800 tracking-tight">Orrenza</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:ring-2 focus:ring-primary-200 transition-all shadow-card hover:shadow-card-hover"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-surface-600">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-surface-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                    location.pathname === link.to
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-surface-500 hover:bg-surface-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-surface-100 flex flex-col gap-2">
                <Link to="/login" className="px-4 py-2.5 text-sm font-medium text-surface-600 text-center rounded-lg hover:bg-surface-50">
                  Sign In
                </Link>
                <Link to="/signup" className="px-4 py-2.5 text-sm font-semibold text-white text-center bg-primary-500 rounded-lg">
                  Get Started Free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
