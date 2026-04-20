import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Scissors,
  UserCog,
  Receipt,
  Heart,
  MessageSquare,
  Settings,
  Menu,
  X,
  BarChart3,
  Wallet,
  Megaphone,
  Crown,
  Package,
  ListOrdered,
  DollarSign,
  CreditCard,
  Clock,
  Share2,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'receptionist', 'stylist'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'receptionist'] },
      { to: '/appointments', icon: CalendarDays, label: 'Appointments', roles: ['admin', 'receptionist', 'stylist'] },
      { to: '/queue', icon: ListOrdered, label: 'Live Queue', roles: ['admin', 'receptionist', 'stylist'] },
      { to: '/services', icon: Scissors, label: 'Services', roles: ['admin', 'receptionist'] },
      { to: '/staff', icon: UserCog, label: 'Staff', roles: ['admin'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/billing', icon: Receipt, label: 'Billing', roles: ['admin', 'receptionist'] },
      { to: '/wallet', icon: CreditCard, label: 'Wallet & Vouchers', roles: ['admin', 'receptionist'] },
      { to: '/expenses', icon: Wallet, label: 'Expenses', roles: ['admin'] },
      { to: '/commissions', icon: DollarSign, label: 'Commissions', roles: ['admin'] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/memberships', icon: Crown, label: 'Memberships', roles: ['admin'] },
      { to: '/products', icon: Package, label: 'Products', roles: ['admin'] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/loyalty', icon: Heart, label: 'Loyalty', roles: ['admin'] },
      { to: '/referrals', icon: Share2, label: 'Referrals', roles: ['admin'] },
      { to: '/happy-hours', icon: Clock, label: 'Happy Hours', roles: ['admin'] },
      { to: '/communications', icon: MessageSquare, label: 'Messages', roles: ['admin', 'receptionist'] },
      { to: '/campaigns', icon: Megaphone, label: 'Campaigns', roles: ['admin'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'receptionist'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const { user } = useAuth();
  const { salonName, logo } = useSettings();
  const role = user?.role || 'stylist';
  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-3.5 left-3 z-50 lg:hidden bg-white rounded-lg p-2 shadow-card-hover text-surface-600"
      >
        {collapsed ? <Menu size={20} /> : <X size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex flex-col bg-white border-r border-surface-200 shadow-sidebar
          transition-all duration-300 ease-in-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-100">
          <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Scissors size={18} className="text-white" />}
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-primary-800 tracking-tight">
              {salonName}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {visibleGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-400">
                  {group.label}
                </div>
              )}
              {collapsed && gi > 0 && (
                <div className="mx-3 mb-2 border-t border-surface-100" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border border-primary-100'
                          : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
                      }
                      ${collapsed ? 'lg:justify-center' : ''}`
                    }
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center py-3 border-t border-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
        >
          <Menu size={18} />
        </button>
      </aside>
    </>
  );
}
