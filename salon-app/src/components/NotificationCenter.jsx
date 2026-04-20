import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, X, Calendar, Cake, Phone, AlertTriangle, Gift,
  CheckCircle, Clock, CreditCard, UserPlus, Star, Trash2,
  FileText,
} from 'lucide-react';

const initialNotifications = [
  { id: 1, type: 'appointment', title: 'Upcoming Appointment', message: 'Sneha Patel — Facial at 11:00 AM', time: '10 min ago', read: false, icon: Calendar, color: 'bg-primary-100 text-primary-600' },
  { id: 2, type: 'birthday', title: 'Birthday Today', message: 'Priya Sharma turns 31 today! Send a wish 🎂', time: '1 hr ago', read: false, icon: Cake, color: 'bg-pink-100 text-pink-600' },
  { id: 3, type: 'follow-up', title: 'Follow-up Due', message: 'Rohan Desai — Last visit 11 days ago', time: '2 hrs ago', read: false, icon: Phone, color: 'bg-amber-100 text-amber-600' },
  { id: 4, type: 'reminder', title: 'Note Reminder Due', message: 'Priya Sharma — Follow up about bridal package next week', time: '2 hrs ago', read: false, icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { id: 5, type: 'no-show', title: 'No-show Alert', message: 'Kavya Nair missed her 2:30 PM appointment', time: '3 hrs ago', read: false, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  { id: 6, type: 'reminder', title: 'Note Reminder', message: 'Sneha Patel — Check skin sensitivity before facial', time: '4 hrs ago', read: false, icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { id: 7, type: 'payment', title: 'Payment Pending', message: 'Rohan Desai — ₹1,350 overdue (INV-004)', time: '5 hrs ago', read: true, icon: CreditCard, color: 'bg-orange-100 text-orange-600' },
  { id: 8, type: 'loyalty', title: 'Loyalty Milestone', message: 'Vikram Singh reached Platinum tier! 🎉', time: '6 hrs ago', read: true, icon: Gift, color: 'bg-purple-100 text-purple-600' },
  { id: 9, type: 'new-customer', title: 'New Customer', message: 'Pooja Agarwal registered today', time: '8 hrs ago', read: true, icon: UserPlus, color: 'bg-green-100 text-green-600' },
  { id: 10, type: 'feedback', title: 'New Feedback', message: 'Meena Reddy rated ★★★★★ for Hair Spa', time: '1 day ago', read: true, icon: Star, color: 'bg-yellow-100 text-yellow-600' },
  { id: 11, type: 'appointment', title: 'Appointment Confirmed', message: 'Aarav Mehta confirmed tomorrow 10:30 AM', time: '1 day ago', read: true, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  { id: 12, type: 'reminder', title: 'Note Reminder', message: 'Vikram Singh — Renew family package this month', time: '1 day ago', read: true, icon: FileText, color: 'bg-amber-100 text-amber-600' },
  { id: 13, type: 'follow-up', title: 'Re-engagement Alert', message: 'Amit Kumar — No visit in 109 days', time: '1 day ago', read: true, icon: Clock, color: 'bg-red-100 text-red-600' },
];

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'follow-up', label: 'Follow-ups' },
  { key: 'payment', label: 'Payments' },
];

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAll = () => setNotifications(prev => prev.filter(n => !n.read));

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-50 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-danger-500 text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={() => setOpen(false)} />

          {/* Side panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary-600" />
                <h3 className="text-base font-semibold text-surface-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-danger-50 text-danger-600">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-4 py-2.5 border-b border-surface-100 overflow-x-auto">
              {FILTER_TABS.map(t => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap ${filter === t.key ? 'bg-primary-600 text-white' : 'bg-surface-50 text-surface-500 hover:bg-surface-100'}`}>
                  {t.label}
                  {t.key === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={32} className="mx-auto text-surface-300 mb-2" />
                  <p className="text-sm text-surface-400">No notifications</p>
                </div>
              ) : (
                filtered.map(n => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex gap-3 px-5 py-3.5 border-b border-surface-50 cursor-pointer transition-colors hover:bg-surface-50/50 ${!n.read ? 'bg-primary-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${n.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold ${!n.read ? 'text-surface-800' : 'text-surface-600'}`}>{n.title}</p>
                          <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} className="p-0.5 rounded text-surface-300 hover:text-surface-500 hover:bg-surface-100 transition-colors shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-[11px] text-surface-500 leading-relaxed mt-0.5">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-surface-300">{n.time}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.some(n => n.read) && (
              <div className="px-5 py-3 border-t border-surface-100 flex justify-between items-center">
                <button onClick={clearAll} className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-400 hover:text-danger-600 transition-colors">
                  <Trash2 size={11} /> Clear read
                </button>
                <span className="text-[10px] text-surface-300">{notifications.length} total</span>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
