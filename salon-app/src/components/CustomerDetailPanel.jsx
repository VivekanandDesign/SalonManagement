import { useState, useMemo, useEffect } from 'react';
import {
  X, Phone, Mail, MessageSquare, Edit, Calendar, Clock, Star,
  Send, Pin, Scissors, User, Heart, AlertCircle, CheckCircle,
  Plus, RefreshCw, XCircle, PhoneCall,
  FileText, CreditCard, Bell, BellOff, ChevronDown, Trash2, Loader2,
} from 'lucide-react';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';
import { customers as customersApi, messages as messagesApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const STAGE_OPTIONS = ['enquiry', 'cold', 'warm', 'hot', 'converted', 'loyal', 'champion', 'lost'];
const STAGE_COLORS = {
  enquiry: 'bg-slate-100 text-slate-600', cold: 'bg-sky-100 text-sky-700', warm: 'bg-amber-100 text-amber-700',
  hot: 'bg-orange-100 text-orange-700', converted: 'bg-green-100 text-green-700', loyal: 'bg-purple-100 text-purple-700',
  champion: 'bg-yellow-100 text-yellow-700', lost: 'bg-gray-100 text-gray-500',
};

const API_STATUS_MAP = { 'BOOKED': 'booked', 'CONFIRMED': 'confirmed', 'IN_PROGRESS': 'in-progress', 'COMPLETED': 'completed', 'NO_SHOW': 'no-show', 'CANCELLED': 'cancelled' };

const TABS = [
  { key: 'activity', label: 'Activity', icon: Clock },
  { key: 'appointments', label: 'Appts', icon: Calendar },
  { key: 'feedback', label: 'Feedback', icon: Star },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'preferences', label: 'Prefs', icon: Heart },
  { key: 'comms', label: 'Messages', icon: MessageSquare },
];

const typeIcons = { visit: Scissors, payment: CreditCard, message: MessageSquare, 'follow-up': PhoneCall, feedback: Star, joined: User };
const typeColors = { visit: 'bg-green-100 text-green-600', payment: 'bg-emerald-100 text-emerald-600', message: 'bg-blue-100 text-blue-600', 'follow-up': 'bg-amber-100 text-amber-600', feedback: 'bg-purple-100 text-purple-600', joined: 'bg-primary-100 text-primary-600' };

const NOTE_CATEGORIES = ['General', 'Medical', 'Preference', 'Complaint'];
const MSG_TEMPLATE_DEFS = [
  { label: 'Thank You', msg: 'Thank you for visiting {{salon}}! We hope you loved your service. See you soon!' },
  { label: 'Birthday', msg: 'Happy Birthday from {{salon}}! Enjoy a special 20% discount on your next visit. \uD83C\uDF82' },
  { label: 'Reminder', msg: 'Reminder: Your appointment at {{salon}} is scheduled for tomorrow. See you there!' },
  { label: 'Offer', msg: 'Exclusive offer! Get 30% off on Hair Spa & Facial this weekend at {{salon}}. Book now!' },
  { label: 'Follow-up', msg: 'Hi! We hope you are happy with your recent visit. We would love to hear your feedback.' },
  { label: 'Re-engage', msg: 'We miss you at {{salon}}! Come back and enjoy 15% off your next service. Book today!' },
];

export default function CustomerDetailPanel({ customer, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState('activity');
  const [customerStage, setCustomerStage] = useState(customer.stage || 'enquiry');
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { salonName } = useSettings();
  const MSG_TEMPLATES = MSG_TEMPLATE_DEFS.map(t => ({ ...t, msg: t.msg.replace(/\{\{salon\}\}/g, salonName) }));

  // Real API data
  const [realAppointments, setRealAppointments] = useState([]);
  const [realInvoices, setRealInvoices] = useState([]);
  const [commsLog, setCommsLog] = useState([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState([]);

  useEffect(() => {
    async function loadCustomerData() {
      setLoading(true);
      try {
        const [detail, msgs] = await Promise.all([
          customersApi.getById(customer.id),
          messagesApi.list({ customerId: customer.id }),
        ]);
        // Map appointments
        const appts = (detail.appointments || []).map(a => {
          const start = a.startTime ? new Date(a.startTime) : null;
          const end = a.endTime ? new Date(a.endTime) : null;
          return {
            id: a.id,
            date: a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
            time: start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : '',
            service: a.services?.[0]?.service?.name || 'Service',
            stylist: a.stylist?.name || '',
            status: (API_STATUS_MAP[a.status] || a.status?.toLowerCase() || 'booked'),
            amount: end && a.services?.length ? a.services.reduce((s, as) => s + (as.service?.price || 0), 0) : 0,
          };
        });
        setRealAppointments(appts);
        setRealInvoices((detail.invoices || []).map(inv => ({
          id: inv.id,
          date: inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : '',
          amount: inv.totalAmount || 0,
          mode: inv.paymentMode || 'CASH',
          status: inv.paymentStatus || 'PAID',
        })));
        setLoyaltyRewards(detail.loyaltyRewards || []);
        setCommsLog((msgs.data || []).map(m => ({
          id: m.id,
          type: m.channel || 'whatsapp',
          title: (m.type || 'MANUAL').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          msg: m.content || '',
          date: m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '',
          time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
          status: (m.status || 'sent').toLowerCase(),
        })));
      } catch (err) { console.error('Failed to load customer detail:', err); toast.error('Failed to load customer details'); }
      setLoading(false);
    }
    loadCustomerData();
  }, [customer.id]);

  // Split appointments into upcoming/past
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppts = realAppointments.filter(a => a.date >= todayStr && !['completed', 'cancelled', 'no-show'].includes(a.status));
  const pastAppts = realAppointments.filter(a => a.date < todayStr || ['completed', 'cancelled', 'no-show'].includes(a.status));

  // Build activity timeline from real data
  const activity = useMemo(() => {
    const events = [];
    realAppointments.forEach(a => {
      events.push({ id: `appt-${a.id}`, type: 'visit', date: a.date, title: a.service, description: `with ${a.stylist} — ${a.status}`, amount: a.amount });
    });
    realInvoices.forEach(inv => {
      events.push({ id: `inv-${inv.id}`, type: 'payment', date: inv.date, title: `Payment ₹${inv.amount.toLocaleString()}`, description: `via ${inv.mode}` });
    });
    commsLog.forEach(m => {
      events.push({ id: `msg-${m.id}`, type: 'message', date: m.date, title: m.title, description: m.msg.slice(0, 60) });
    });
    events.push({ id: 'join', type: 'joined', date: customer.joinedDate || customer.createdAt?.slice(0, 10) || '', title: 'Customer joined', description: `Registered at ${salonName}` });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events;
  }, [realAppointments, realInvoices, commsLog, customer]);

  // Appointments UI state
  const [apptFilter, setApptFilter] = useState('upcoming');
  const [showReschedule, setShowReschedule] = useState(null);
  const [rescDate, setRescDate] = useState('');
  const [rescTime, setRescTime] = useState('');
  const [showBookNew, setShowBookNew] = useState(false);
  const [newApptService, setNewApptService] = useState('Haircut');
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('10:00');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(null);

  // Feedback (local state — no backend model)
  const [feedbacks, setFeedbacks] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newFbComment, setNewFbComment] = useState('');
  const [showFbForm, setShowFbForm] = useState(false);

  // Notes
  const [notes, setNotes] = useState([
    ...(customer.notes ? [{ id: 'n0', text: customer.notes, category: 'General', pinned: true, date: customer.joinedDate || '', time: '10:00', reminder: null }] : []),
  ]);
  const [newNote, setNewNote] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('General');
  const [newNoteReminder, setNewNoteReminder] = useState(false);
  const [newNoteReminderDate, setNewNoteReminderDate] = useState('');
  const [noteFilter, setNoteFilter] = useState('all');

  // Preferences (local state)
  const [prefServices, setPrefServices] = useState([]);
  const [prefStylist, setPrefStylist] = useState('');
  const [prefTimeSlot, setPrefTimeSlot] = useState('No preference');
  const [allergies, setAllergies] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState(customer.notes || '');
  const [prefSaved, setPrefSaved] = useState(false);

  // Communication
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customMsg, setCustomMsg] = useState('');
  const [sendChannel, setSendChannel] = useState('whatsapp');
  const [msgSent, setMsgSent] = useState(false);

  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '\u2014';
  const daysSinceVisit = customer.lastVisit ? Math.round((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24)) : 0;
  const avgSpend = customer.visits > 0 ? Math.round(customer.totalSpent / customer.visits) : 0;
  const outstandingDues = realInvoices.filter(inv => inv.status === 'DUE' || inv.status === 'PARTIAL').reduce((sum, inv) => sum + inv.amount, 0);

  const addFeedback = () => {
    if (!newFbComment.trim()) return;
    setFeedbacks(prev => [{ id: `F${Date.now()}`, date: '2026-04-08', rating: newRating, comment: newFbComment.trim(), service: 'General' }, ...prev]);
    setNewFbComment(''); setNewRating(5); setShowFbForm(false);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const noteObj = {
      id: `n${Date.now()}`, text: newNote.trim(), category: newNoteCategory, pinned: false,
      date: '2026-04-08', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      reminder: newNoteReminder && newNoteReminderDate ? { enabled: true, datetime: newNoteReminderDate, status: 'pending' } : null,
    };
    setNotes(prev => [noteObj, ...prev]);
    setNewNote(''); setNewNoteReminder(false); setNewNoteReminderDate('');
  };

  const togglePin = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  const toggleNoteReminder = (id) => setNotes(prev => prev.map(n => {
    if (n.id !== id) return n;
    if (n.reminder?.enabled) return { ...n, reminder: { ...n.reminder, enabled: false, status: 'dismissed' } };
    return { ...n, reminder: { enabled: true, datetime: n.reminder?.datetime || '2026-04-10T10:00', status: 'pending' } };
  }));
  const setReminderDate = (id, datetime) => setNotes(prev => prev.map(n =>
    n.id === id ? { ...n, reminder: { ...n.reminder, datetime, enabled: true, status: 'pending' } } : n
  ));
  const dismissReminder = (id) => setNotes(prev => prev.map(n =>
    n.id === id && n.reminder ? { ...n, reminder: { ...n.reminder, status: 'dismissed' } } : n
  ));
  const sendMessage = async () => {
    if (!customMsg.trim()) return;
    try {
      await messagesApi.send({ customerId: customer.id, content: customMsg, channel: sendChannel });
      setMsgSent(true);
      setCommsLog(prev => [{ id: `new-${Date.now()}`, type: sendChannel, title: 'Manual', msg: customMsg, date: new Date().toISOString().slice(0, 10), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), status: 'sent' }, ...prev]);
      setTimeout(() => setMsgSent(false), 2000);
    } catch { setMsgSent(false); toast.error('Failed to send message'); }
  };
  const savePref = () => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 2000); };

  const sortedNotes = useMemo(() => {
    let filtered = [...notes];
    if (noteFilter === 'reminders') filtered = filtered.filter(n => n.reminder?.enabled);
    else if (noteFilter === 'due') filtered = filtered.filter(n => n.reminder?.enabled && n.reminder.status === 'pending' && new Date(n.reminder.datetime) <= new Date());
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notes, noteFilter]);

  const dueRemindersCount = notes.filter(n => n.reminder?.enabled && n.reminder.status === 'pending' && new Date(n.reminder.datetime) <= new Date()).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[520px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* HEADER */}
        <div className="flex-shrink-0 border-b border-surface-100">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider">Customer Profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="px-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-base font-bold text-primary-700">{customer.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-surface-800">{customer.name}</h3>
                  <Badge status={customer.tag} />
                  {/* Stage dropdown */}
                  <div className="relative">
                    <button onClick={() => setShowStageDropdown(p => !p)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${STAGE_COLORS[customerStage] || 'bg-surface-100 text-surface-500'} border-current/20 hover:opacity-80`}>
                      {customerStage.charAt(0).toUpperCase() + customerStage.slice(1)}
                      <ChevronDown size={10} />
                    </button>
                    {showStageDropdown && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-surface-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                        {STAGE_OPTIONS.map(s => (
                          <button key={s} onClick={() => { setCustomerStage(s); setShowStageDropdown(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-surface-50 flex items-center gap-2 ${customerStage === s ? 'font-semibold text-primary-700 bg-primary-50/50' : 'text-surface-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[s]?.split(' ')[0] || 'bg-surface-200'}`} />
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1"><Phone size={11} /> {customer.phone}</span>
                  {customer.email && <span className="flex items-center gap-1"><Mail size={11} /> {customer.email}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <a href={`tel:${customer.phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"><Phone size={13} /> Call</a>
              <a href={`https://wa.me/91${customer.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"><MessageSquare size={13} /> WhatsApp</a>
              <a href={`sms:${customer.phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"><Send size={13} /> SMS</a>
              <button onClick={() => { onClose(); onEdit(customer); }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-50 text-surface-700 border border-surface-200 hover:bg-surface-100 transition-colors"><Edit size={13} /> Edit</button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 border-t border-surface-100">
            <div className="text-center py-2.5 border-r border-surface-100">
              <p className="text-sm font-bold text-surface-700">{customer.visits}</p>
              <p className="text-[10px] text-surface-400">Visits</p>
            </div>
            <div className="text-center py-2.5 border-r border-surface-100">
              <p className="text-sm font-bold text-emerald-600">{'\u20B9'}{customer.totalSpent.toLocaleString()}</p>
              <p className="text-[10px] text-surface-400">Spent</p>
            </div>
            <div className="text-center py-2.5 border-r border-surface-100">
              <p className="text-sm font-bold text-surface-700">{'\u20B9'}{avgSpend.toLocaleString()}</p>
              <p className="text-[10px] text-surface-400">Avg</p>
            </div>
            <div className="text-center py-2.5 border-r border-surface-100">
              <p className={`text-sm font-bold ${outstandingDues > 0 ? 'text-red-600' : 'text-surface-400'}`}>{outstandingDues > 0 ? `\u20B9${outstandingDues.toLocaleString()}` : '—'}</p>
              <p className="text-[10px] text-surface-400">Dues</p>
            </div>
            <div className="text-center py-2.5 border-r border-surface-100">
              <p className="text-sm font-bold text-amber-600">{avgRating}</p>
              <p className="text-[10px] text-surface-400">Rating</p>
            </div>
            <div className="text-center py-2.5">
              <p className={`text-sm font-bold ${daysSinceVisit > 30 ? 'text-red-500' : daysSinceVisit > 14 ? 'text-amber-500' : 'text-green-600'}`}>{daysSinceVisit}d</p>
              <p className="text-[10px] text-surface-400">Since</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-t border-surface-100">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-1 min-w-0 inline-flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-medium transition-colors border-b-2 ${activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                  <Icon size={14} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary-500 mr-2" />
              <span className="text-sm text-surface-400">Loading customer data...</span>
            </div>
          ) : (
          <>

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="px-5 py-4">
              <div className="relative ml-3">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-surface-200" />
                <div className="space-y-0">
                  {activity.map(ev => {
                    const Icon = typeIcons[ev.type] || Clock;
                    const color = typeColors[ev.type] || 'bg-surface-100 text-surface-500';
                    return (
                      <div key={ev.id} className="relative flex gap-2.5 pb-4 last:pb-0">
                        <div className={`relative z-10 w-6 h-6 rounded-full ${color} flex items-center justify-center flex-shrink-0 ring-2 ring-white`}>
                          <Icon size={11} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium text-surface-700">{ev.title}</p>
                              <p className="text-[11px] text-surface-400">{ev.description}</p>
                            </div>
                            {ev.amount && <span className="text-[11px] font-semibold text-surface-600 flex-shrink-0">{'\u20B9'}{ev.amount.toLocaleString()}</span>}
                          </div>
                          <span className="text-[10px] text-surface-300 mt-0.5 block">{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {activity.length === 0 && (
                <div className="text-center py-10"><Clock size={28} className="mx-auto text-surface-300 mb-2" /><p className="text-sm text-surface-400">No activity yet</p></div>
              )}
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  {['upcoming', 'past'].map(f => (
                    <button key={f} onClick={() => setApptFilter(f)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${apptFilter === f ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}>
                      {f === 'upcoming' ? `Upcoming (${upcomingAppts.length})` : `Past (${pastAppts.length})`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowBookNew(!showBookNew)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                  <Plus size={12} /> Book New
                </button>
              </div>

              {showBookNew && (
                <div className="mb-4 p-3 rounded-lg bg-primary-50/50 border border-primary-200 space-y-2.5">
                  <p className="text-xs font-semibold text-primary-700">Book New Appointment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newApptService} onChange={e => setNewApptService(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300">
                      {['Haircut', 'Hair Spa', 'Hair Coloring', 'Facial', 'Manicure + Pedicure', 'Beard Grooming', 'Keratin Treatment'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300">
                      {['Neha Kapoor', 'Rahul Sharma', 'Pooja Verma', 'Sanjay Iyer', 'Meena Reddy'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <input type="date" value={newApptDate} onChange={e => setNewApptDate(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300" />
                    <input type="time" value={newApptTime} onChange={e => setNewApptTime(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBookNew(false)} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">Cancel</button>
                    <button onClick={() => setShowBookNew(false)} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">Confirm Booking</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {(apptFilter === 'upcoming' ? upcomingAppts : pastAppts).map(appt => (
                  <div key={appt.id} className={`p-3 rounded-lg border ${appt.status === 'completed' ? 'bg-green-50/30 border-green-100' : appt.status === 'no-show' ? 'bg-red-50/30 border-red-100' : appt.status === 'cancelled' ? 'bg-surface-50 border-surface-200' : 'bg-surface-50/50 border-surface-100'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-surface-700">{appt.date}</span>
                        <span className="text-xs text-surface-400">{appt.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-surface-600">{'\u20B9'}{appt.amount}</span>
                        <Badge status={appt.status} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-surface-700">{appt.service}</p>
                    <p className="text-xs text-surface-400">with {appt.stylist}</p>

                    {apptFilter === 'upcoming' && (
                      <div className="flex gap-1.5 mt-2 pt-2 border-t border-surface-100/60">
                        <button onClick={() => { setShowReschedule(showReschedule === appt.id ? null : appt.id); setShowCancel(null); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-primary-50 border border-primary-200 text-primary-600 hover:bg-primary-100 transition-colors">
                          <RefreshCw size={10} /> Reschedule
                        </button>
                        <button onClick={() => { setShowCancel(showCancel === appt.id ? null : appt.id); setShowReschedule(null); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors">
                          <XCircle size={10} /> Cancel
                        </button>
                      </div>
                    )}

                    {showReschedule === appt.id && (
                      <div className="mt-2 p-2 rounded bg-surface-50 border border-surface-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={rescDate} onChange={e => setRescDate(e.target.value)} className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
                          <input type="time" value={rescTime} onChange={e => setRescTime(e.target.value)} className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
                        </div>
                        <button onClick={() => setShowReschedule(null)} className="w-full py-1.5 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center justify-center gap-1"><CheckCircle size={12} /> Confirm Reschedule</button>
                      </div>
                    )}

                    {showCancel === appt.id && (
                      <div className="mt-2 p-2 rounded bg-red-50/50 border border-red-200 space-y-2">
                        <select value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-white border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-red-300">
                          <option value="">Select reason...</option>
                          <option>Customer requested</option>
                          <option>Stylist unavailable</option>
                          <option>Schedule conflict</option>
                          <option>Personal emergency</option>
                          <option>Other</option>
                        </select>
                        <button onClick={() => setShowCancel(null)} className="w-full py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1"><XCircle size={12} /> Confirm Cancellation</button>
                      </div>
                    )}
                  </div>
                ))}
                {(apptFilter === 'upcoming' ? upcomingAppts : pastAppts).length === 0 && (
                  <div className="text-center py-8"><Calendar size={24} className="mx-auto text-surface-300 mb-1.5" /><p className="text-xs text-surface-400">{apptFilter === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}</p></div>
                )}
              </div>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-surface-50 border border-surface-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{avgRating}</p>
                  <div className="flex gap-0.5 mt-0.5 justify-center">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= Math.round(Number(avgRating) || 0) ? 'text-amber-400 fill-amber-400' : 'text-surface-300'} />)}
                  </div>
                  <p className="text-[10px] text-surface-400 mt-0.5">{feedbacks.length} reviews</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map(s => {
                    const count = feedbacks.filter(f => f.rating === s).length;
                    const pct = feedbacks.length > 0 ? (count / feedbacks.length * 100) : 0;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-[10px] text-surface-400 w-3">{s}</span>
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-surface-400 w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Reviews</h4>
                <button onClick={() => setShowFbForm(!showFbForm)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"><Plus size={12} /> Add Feedback</button>
              </div>

              {showFbForm && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-surface-500 mr-1">Rating:</span>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setNewRating(s)} className="p-0.5">
                        <Star size={18} className={s <= newRating ? 'text-amber-400 fill-amber-400' : 'text-surface-300'} />
                      </button>
                    ))}
                  </div>
                  <textarea rows={2} value={newFbComment} onChange={e => setNewFbComment(e.target.value)} placeholder="Customer feedback..."
                    className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 placeholder:text-surface-400" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFbForm(false)} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600">Cancel</button>
                    <button onClick={addFeedback} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">Save Feedback</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {feedbacks.map(fb => (
                  <div key={fb.id} className="p-3 rounded-lg bg-surface-50/50 border border-surface-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-300'} />)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-surface-400">{fb.service}</span>
                        <span className="text-[10px] text-surface-300">{fb.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-surface-600 leading-relaxed">{fb.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="px-5 py-4">
              {/* Add note form */}
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <select value={newNoteCategory} onChange={e => setNewNoteCategory(e.target.value)}
                    className="px-2 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300">
                    {NOTE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <div className="flex-1 relative">
                    <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                      placeholder="Add a note..."
                      className="w-full px-3 py-1.5 pr-9 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 placeholder:text-surface-400" />
                    <button onClick={addNote} disabled={!newNote.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded bg-primary-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors">
                      <Send size={11} />
                    </button>
                  </div>
                </div>
                {/* Reminder toggle for new note */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setNewNoteReminder(p => !p)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border transition-colors ${newNoteReminder ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-surface-200 text-surface-400 hover:text-surface-600'}`}>
                    <Bell size={10} /> {newNoteReminder ? 'Reminder On' : 'Set Reminder'}
                  </button>
                  {newNoteReminder && (
                    <input type="datetime-local" value={newNoteReminderDate} onChange={e => setNewNoteReminderDate(e.target.value)}
                      className="px-2 py-1 text-[10px] bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300" />
                  )}
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {[{ key: 'all', label: 'All' }, { key: 'reminders', label: 'With Reminders' }, { key: 'due', label: `Due Today${dueRemindersCount ? ` (${dueRemindersCount})` : ''}` }].map(f => (
                  <button key={f.key} onClick={() => setNoteFilter(f.key)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors ${noteFilter === f.key ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Category summary */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {NOTE_CATEGORIES.map(c => {
                  const colors = { General: 'bg-blue-100 text-blue-600', Medical: 'bg-red-100 text-red-600', Preference: 'bg-purple-100 text-purple-600', Complaint: 'bg-amber-100 text-amber-600' };
                  return (
                    <span key={c} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${colors[c]}`}>
                      {c} ({notes.filter(n => n.category === c).length})
                    </span>
                  );
                })}
              </div>

              {/* Notes list */}
              <div className="space-y-2">
                {sortedNotes.map(n => {
                  const catColors = { General: 'border-l-blue-400', Medical: 'border-l-red-400', Preference: 'border-l-purple-400', Complaint: 'border-l-amber-400' };
                  const isDue = n.reminder?.enabled && n.reminder.status === 'pending' && new Date(n.reminder.datetime) <= new Date('2026-04-08T23:59');
                  return (
                    <div key={n.id} className={`p-3 rounded-lg border border-l-[3px] ${catColors[n.category] || 'border-l-surface-300'} ${isDue ? 'bg-amber-50/40 border-amber-200' : 'bg-surface-50/50 border-surface-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-surface-700 leading-relaxed flex-1">{n.text}</p>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => togglePin(n.id)} className={`p-0.5 rounded transition-colors ${n.pinned ? 'text-primary-600' : 'text-surface-300 hover:text-surface-500'}`} title={n.pinned ? 'Unpin' : 'Pin'}>
                            <Pin size={12} className={n.pinned ? 'fill-primary-600' : ''} />
                          </button>
                          <button onClick={() => deleteNote(n.id)} className="p-0.5 rounded text-surface-300 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Reminder section */}
                      {n.reminder?.enabled && n.reminder.status !== 'dismissed' && (
                        <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isDue ? 'border-amber-200' : 'border-surface-100'}`}>
                          <Bell size={11} className={isDue ? 'text-amber-600 animate-pulse' : 'text-surface-400'} />
                          <span className={`text-[10px] font-medium ${isDue ? 'text-amber-700' : 'text-surface-500'}`}>
                            {isDue ? 'Due now' : `Reminder: ${new Date(n.reminder.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${new Date(n.reminder.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          <button onClick={() => dismissReminder(n.id)} className="ml-auto text-[10px] font-medium text-surface-400 hover:text-surface-600 transition-colors">
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* Add reminder to existing note without one */}
                      {!n.reminder?.enabled && n.reminder?.status !== 'dismissed' && (
                        <div className="mt-2 pt-2 border-t border-surface-100 flex items-center gap-2">
                          <button onClick={() => toggleNoteReminder(n.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-surface-400 hover:text-amber-600 transition-colors">
                            <Bell size={10} /> Set reminder
                          </button>
                        </div>
                      )}

                      {/* Reminder date editor (visible when reminder is enabled but no date picked) */}
                      {n.reminder?.enabled && n.reminder.status === 'pending' && (
                        <div className="mt-1">
                          <input type="datetime-local" value={n.reminder.datetime || ''} onChange={e => setReminderDate(n.id, e.target.value)}
                            className="px-2 py-0.5 text-[10px] bg-white border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-medium rounded ${n.category === 'General' ? 'bg-blue-50 text-blue-600' : n.category === 'Medical' ? 'bg-red-50 text-red-600' : n.category === 'Preference' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>{n.category}</span>
                        <span className="text-[10px] text-surface-300">{n.date} {n.time && `at ${n.time}`}</span>
                        {n.pinned && <span className="text-[9px] text-primary-500 font-medium">Pinned</span>}
                        {n.reminder?.status === 'dismissed' && <span className="text-[9px] text-surface-400 flex items-center gap-0.5"><BellOff size={9} /> Dismissed</span>}
                      </div>
                    </div>
                  );
                })}
                {sortedNotes.length === 0 && (
                  <div className="text-center py-8"><FileText size={24} className="mx-auto text-surface-300 mb-1.5" /><p className="text-xs text-surface-400">{noteFilter === 'all' ? 'No notes yet' : 'No matching notes'}</p></div>
                )}
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Preferred Services</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Haircut', 'Hair Spa', 'Hair Coloring', 'Facial', 'Manicure + Pedicure', 'Beard Grooming', 'Keratin Treatment', 'Threading', 'Waxing', 'Head Massage'].map(s => (
                    <button key={s} onClick={() => setPrefServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${prefServices.includes(s) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Preferred Stylist</label>
                  <select value={prefStylist} onChange={e => setPrefStylist(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300">
                    <option value="">No preference</option>
                    {['Neha Kapoor', 'Rahul Sharma', 'Pooja Verma', 'Sanjay Iyer', 'Meena Reddy'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Preferred Time</label>
                  <select value={prefTimeSlot} onChange={e => setPrefTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300">
                    {['Morning (9-12)', 'Afternoon (12-4)', 'Evening (4-8)', 'No preference'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Allergies / Sensitivities</label>
                <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Ammonia, Parabens..."
                  className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 placeholder:text-surface-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Special Instructions</label>
                <textarea rows={3} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Any special requests or instructions..."
                  className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 placeholder:text-surface-400" />
              </div>
              <button onClick={savePref}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${prefSaved ? 'bg-green-100 text-green-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                {prefSaved ? <span className="flex items-center justify-center gap-1"><CheckCircle size={14} /> Saved</span> : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* COMMUNICATION TAB */}
          {activeTab === 'comms' && (
            <div className="px-5 py-4">
              <div className="mb-4 p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-2.5">
                <p className="text-xs font-semibold text-surface-600">Quick Send</p>
                <div className="flex gap-1.5 flex-wrap">
                  {MSG_TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => { setSelectedTemplate(i); setCustomMsg(t.msg); }}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors ${selectedTemplate === i ? 'bg-primary-600 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea rows={3} value={customMsg} onChange={e => setCustomMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 placeholder:text-surface-400" />
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    {['whatsapp', 'sms'].map(ch => (
                      <button key={ch} onClick={() => setSendChannel(ch)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${sendChannel === ch ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                        {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </button>
                    ))}
                  </div>
                  <button onClick={sendMessage} disabled={!customMsg.trim()}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${msgSent ? 'bg-green-100 text-green-700' : 'bg-primary-600 text-white hover:bg-primary-700'} disabled:opacity-40`}>
                    {msgSent ? <span className="flex items-center justify-center gap-1"><CheckCircle size={12} /> Sent!</span> : <span className="flex items-center justify-center gap-1"><Send size={12} /> Send Message</span>}
                  </button>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Communication Log</h4>
              <div className="space-y-2">
                {commsLog.map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-surface-50/50 border border-surface-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded ${c.type === 'whatsapp' ? 'bg-green-50 text-green-600' : c.type === 'sms' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                          {c.type === 'whatsapp' ? <MessageSquare size={9} /> : c.type === 'sms' ? <Send size={9} /> : <PhoneCall size={9} />}
                          {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                        </span>
                        <span className="text-xs font-medium text-surface-700">{c.title}</span>
                      </div>
                      <Badge status={c.status} />
                    </div>
                    <p className="text-[11px] text-surface-500 leading-relaxed">{c.msg}</p>
                    <span className="text-[10px] text-surface-300 mt-1 block">{c.date} at {c.time}</span>
                  </div>
                ))}
                {commsLog.length === 0 && (
                  <div className="text-center py-8"><MessageSquare size={24} className="mx-auto text-surface-300 mb-1.5" /><p className="text-xs text-surface-400">No messages sent yet</p></div>
                )}
              </div>
            </div>
          )}

          </>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex-shrink-0 border-t border-surface-100 px-5 py-3">
          <div className="flex gap-2">
            <button onClick={() => { setActiveTab('appointments'); setShowBookNew(true); }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              <Calendar size={13} /> Book Appointment
            </button>
            <button onClick={() => setActiveTab('comms')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-surface-100 text-surface-700 border border-surface-200 hover:bg-surface-200 transition-colors">
              <MessageSquare size={13} /> Send Message
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
