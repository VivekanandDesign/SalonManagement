import { Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-100">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
        {/* Search */}
        <div className="flex-1 max-w-full sm:max-w-md ml-10 lg:ml-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search customers, appointments..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
                placeholder:text-surface-400 transition-all"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4">
          {/* Notifications */}
          <NotificationCenter />

          {/* Current user avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-700">{user?.initials || 'U'}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-surface-700 leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-surface-400 capitalize">{user?.role || 'guest'}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
