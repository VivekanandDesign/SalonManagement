import { useState, useRef, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Users,
  UserPlus,
  AlertTriangle,
  Clock,
  Search,
  X,
  Phone,
  Scissors,
  CreditCard,
  Star,
  Gift,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  MapPin,
  Cake,
  PhoneCall,
  UserX,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Send,
  Target,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { useToast } from '../components/ui/Toast';
import { dashboard as dashboardApi, customers as customersApi, feedback as feedbackApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const todayAppts = [];

const todayFollowups = [];

const todayNoShows = [];

const allBirthdays = [];

const atRiskCustomers = [];

const PIPELINE_STAGES = [
  { key: 'enquiry', label: 'Enquiry', color: 'bg-slate-400', textColor: 'text-slate-700', bgLight: 'bg-slate-50' },
  { key: 'cold', label: 'Cold', color: 'bg-sky-400', textColor: 'text-sky-700', bgLight: 'bg-sky-50' },
  { key: 'warm', label: 'Warm', color: 'bg-amber-400', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
  { key: 'hot', label: 'Hot', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  { key: 'converted', label: 'Converted', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { key: 'loyal', label: 'Loyal', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { key: 'champion', label: 'Champion', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { key: 'lost', label: 'Lost', color: 'bg-gray-400', textColor: 'text-gray-500', bgLight: 'bg-gray-50' },
];

// Generate visit history for a customer (placeholder — will be replaced with real API data)
function generateHistory() {
  return [];
}

const emptyCustomerForm = { name: '', phone: '', email: '', dob: '', gender: 'Female', tag: 'new', notes: '' };

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [dashStats, setDashStats] = useState({ todaysAppointments: 0, newCustomersThisMonth: 0, totalCustomers: 0, noShowRate: '0' });
  const toast = useToast();
  const { salonName } = useSettings();
  const [apiCustomers, setApiCustomers] = useState(null);
  const [customerBreakdown, setCustomerBreakdown] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setLoadError(null);
      try {
        const [summary, custRes, custBreakdown] = await Promise.all([
          dashboardApi.summary(), customersApi.list({ limit: 200 }),
          dashboardApi.customerBreakdown(),
        ]);
        setDashStats(summary);
        if (custBreakdown?.data) setCustomerBreakdown(custBreakdown.data);
        setApiCustomers((custRes.data || []).map(c => ({
          id: c.id, name: c.name, phone: c.phone || '', email: c.email || '', gender: c.gender || '',
          tag: (c.tag || 'new').toLowerCase(), stage: 'converted', visits: c.totalVisits || 0,
          totalSpent: c.totalSpent || 0, lastVisit: c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : '',
          joinedDate: c.createdAt ? c.createdAt.slice(0, 10) : '', notes: c.notes || '',
        })));
      } catch (err) {
        console.error('Dashboard load error:', err);
        setLoadError(err.isNetworkError ? 'Unable to connect to the server. Please check your connection.' : 'Failed to load dashboard data. Please try refreshing.');
        toast.error(err.isNetworkError ? 'Server unreachable' : 'Failed to load dashboard data');
      }
      // Load feedback stats
      try {
        const fbStats = await feedbackApi.stats();
        setFeedbackStats(fbStats);
      } catch (err) { /* ignore if no feedback yet */ }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const source = apiCustomers || [];
    return source.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8);
  }, [searchQuery, apiCustomers]);

  const selectCustomer = (c) => {
    setDetailPanel(null);
    setSelectedCustomer(c);
    setCustomerHistory(generateHistory(c));
    setSearchQuery('');
    setShowDropdown(false);
  };

  const closeProfile = () => {
    setSelectedCustomer(null);
    setCustomerHistory([]);
  };

  // Detail panel state (appointment / follow-up)
  const [detailPanel, setDetailPanel] = useState(null); // { type: 'appointment'|'followup', data }
  const [panelStatus, setPanelStatus] = useState('');
  const [panelComment, setPanelComment] = useState('');
  const [panelComments, setPanelComments] = useState({}); // keyed by 'type-id'
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [apptStatuses, setApptStatuses] = useState({});
  const [followupStatuses, setFollowupStatuses] = useState({});
  const [statusSaved, setStatusSaved] = useState(false);
  const [rescheduleSaved, setRescheduleSaved] = useState(false);
  const [bdayFilter, setBdayFilter] = useState('today');
  const [waModal, setWaModal] = useState({ open: false, customer: null, vars: {} });

  const filteredBirthdays = useMemo(() => {
    const today = new Date();
    const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return allBirthdays
      .map(b => {
        const d = new Date(b.dob);
        const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const age = currentYear - d.getFullYear();
        const thisYearBday = new Date(currentYear, d.getMonth(), d.getDate());
        const daysUntil = Math.round((thisYearBday - today) / (1000 * 60 * 60 * 24));
        return { ...b, md, age, daysUntil, bdayMonth: d.getMonth(), bdayDate: d.getDate() };
      })
      .filter(b => {
        if (bdayFilter === 'today') return b.md === todayMD;
        if (bdayFilter === 'month') return b.bdayMonth === currentMonth;
        if (bdayFilter === 'upcoming') return b.daysUntil > 0 && b.daysUntil <= 30;
        if (bdayFilter === 'past') return b.bdayMonth === currentMonth && b.daysUntil < 0;
        return true;
      })
      .sort((a, b) => {
        if (bdayFilter === 'past') return b.daysUntil - a.daysUntil;
        return a.daysUntil - b.daysUntil;
      });
  }, [bdayFilter]);

  const openApptDetail = (appt) => {
    closeProfile();
    setDetailPanel({ type: 'appointment', data: appt });
    setPanelStatus(apptStatuses[appt.id] || appt.status);
    setPanelComment('');
    setShowReschedule(false);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().split('T')[0]);
    setRescheduleTime(appt.time);
    setStatusSaved(false);
    setRescheduleSaved(false);
  };

  const openFollowupDetail = (f) => {
    closeProfile();
    const contacted = followupStatuses[f.id] !== undefined ? followupStatuses[f.id] : f.contacted;
    setDetailPanel({ type: 'followup', data: f });
    setPanelStatus(contacted ? 'contacted' : 'pending');
    setPanelComment('');
    setShowReschedule(false);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().split('T')[0]);
    setRescheduleTime('10:00');
    setStatusSaved(false);
    setRescheduleSaved(false);
  };

  const closeDetailPanel = () => setDetailPanel(null);

  const saveStatus = () => {
    if (detailPanel.type === 'appointment') {
      setApptStatuses(prev => ({ ...prev, [detailPanel.data.id]: panelStatus }));
    } else {
      const contacted = panelStatus === 'contacted' || panelStatus === 'rescheduled';
      setFollowupStatuses(prev => ({ ...prev, [detailPanel.data.id]: contacted }));
    }
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 2000);
  };

  const addComment = () => {
    if (!panelComment.trim()) return;
    const key = `${detailPanel.type}-${detailPanel.data.id}`;
    setPanelComments(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { text: panelComment.trim(), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), date: 'Today' }]
    }));
    setPanelComment('');
  };

  const confirmReschedule = () => {
    if (detailPanel.type === 'appointment') {
      setApptStatuses(prev => ({ ...prev, [detailPanel.data.id]: 'rescheduled' }));
      setPanelStatus('rescheduled');
    } else {
      setFollowupStatuses(prev => ({ ...prev, [detailPanel.data.id]: false }));
      setPanelStatus('rescheduled');
    }
    setRescheduleSaved(true);
    setTimeout(() => setRescheduleSaved(false), 2000);
  };

  const getDetailComments = () => {
    if (!detailPanel) return [];
    return panelComments[`${detailPanel.type}-${detailPanel.data.id}`] || [];
  };

  // Group timeline events by month
  const groupedHistory = useMemo(() => {
    const groups = {};
    customerHistory.forEach(ev => {
      const d = new Date(ev.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { key, label, events: [] };
      groups[key].events.push(ev);
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [customerHistory]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-surface-500">Loading dashboard...</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-md">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-surface-700 font-medium mb-1">Failed to load dashboard</p>
        <p className="text-sm text-surface-500 mb-4">{loadError}</p>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Welcome + Global Search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-surface-800">Good morning, Manager</h1>
            <p className="text-sm text-surface-500 mt-0.5">Here&apos;s what&apos;s happening at {salonName} today.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => { setCustomerForm(emptyCustomerForm); setShowAddCustomer(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <UserPlus size={16} /> Add Customer
            </button>

          {/* Global Customer Search */}
          <div className="relative w-full sm:w-80 md:w-96" ref={searchRef}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => { if (searchQuery) setShowDropdown(true); }}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-surface-400 shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && searchQuery.trim() && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-[360px] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    <div className="px-3 py-2 bg-surface-50 border-b border-surface-100">
                      <span className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{searchResults.length} customer{searchResults.length !== 1 ? 's' : ''} found</span>
                    </div>
                    {searchResults.map(c => (
                      <button key={c.id} onClick={() => selectCustomer(c)}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-primary-50 transition-colors text-left border-b border-surface-50 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">{c.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-700 truncate">{c.name}</p>
                          <div className="flex items-center gap-2 text-xs text-surface-400">
                            <span className="flex items-center gap-0.5"><Phone size={10} /> {c.phone}</span>
                            <span>\u00b7</span>
                            <span>{c.visits} visits</span>
                          </div>
                        </div>
                        <Badge status={c.tag} />
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Users size={24} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-sm text-surface-400">No customers found</p>
                    <p className="text-xs text-surface-300 mt-0.5">Try a different name or phone number</p>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Right-side slide-out customer profile panel */}
      {selectedCustomer && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={closeProfile} />

          {/* Slide-out panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[460px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-surface-700">Customer Profile</h2>
              <button onClick={closeProfile} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors" title="Close">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Profile section */}
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-primary-700">{selectedCustomer.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-surface-800">{selectedCustomer.name}</h3>
                      <Badge status={selectedCustomer.tag} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-surface-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Phone size={11} /> {selectedCustomer.phone}</span>
                      {selectedCustomer.email && <span>· {selectedCustomer.email}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-surface-400 mt-1">
                      <Calendar size={11} /> Joined {selectedCustomer.joinedDate}
                    </div>
                    {selectedCustomer.notes && (
                      <p className="text-[11px] text-surface-400 mt-1.5 italic leading-relaxed">&ldquo;{selectedCustomer.notes}&rdquo;</p>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="text-center p-2.5 rounded-lg bg-primary-50/60">
                    <p className="text-base font-bold text-primary-700">{selectedCustomer.visits}</p>
                    <p className="text-[10px] text-primary-500 font-medium">Total Visits</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-emerald-50/60">
                    <p className="text-base font-bold text-emerald-700">{'\u20B9'}{selectedCustomer.totalSpent.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Total Spent</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-amber-50/60">
                    <p className="text-base font-bold text-amber-700">{'\u20B9'}{selectedCustomer.visits > 0 ? Math.round(selectedCustomer.totalSpent / selectedCustomer.visits).toLocaleString() : 0}</p>
                    <p className="text-[10px] text-amber-500 font-medium">Avg. Spend</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-blue-50/60">
                    <p className="text-base font-bold text-blue-700">{selectedCustomer.lastVisit}</p>
                    <p className="text-[10px] text-blue-500 font-medium">Last Visit</p>
                  </div>
                </div>
              </div>

              {/* Timeline section */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-surface-700">Visit History & Timeline</h3>
                  <span className="text-[11px] text-surface-400">{customerHistory.length} events</span>
                </div>

                <div className="space-y-5">
                  {groupedHistory.map((group) => (
                    <div key={group.key}>
                      {/* Month label */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{group.label}</span>
                        <div className="flex-1 h-px bg-surface-100" />
                      </div>

                      {/* Events */}
                      <div className="relative ml-3">
                        {/* Vertical line */}
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-surface-200" />

                        <div className="space-y-0">
                          {group.events.map((ev) => {
                            const Icon = ev.icon;
                            return (
                              <div key={ev.id} className="relative flex gap-2.5 pb-3.5 last:pb-0">
                                {/* Icon */}
                                <div className={`relative z-10 w-6 h-6 rounded-full ${ev.color} flex items-center justify-center flex-shrink-0 ring-2 ring-white`}>
                                  <Icon size={11} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-surface-700 leading-tight">{ev.title}</p>
                                      <p className="text-[11px] text-surface-400">{ev.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {ev.status && <Badge status={ev.status} />}
                                      {ev.amount && <span className="text-[11px] font-semibold text-surface-600">{'\u20B9'}{ev.amount.toLocaleString()}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {ev.payment && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-surface-100 text-surface-500">Paid via {ev.payment}</span>
                                    )}
                                    <span className="text-[10px] text-surface-300">{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {customerHistory.length === 0 && (
                    <div className="text-center py-8">
                      <Clock size={24} className="mx-auto text-surface-300 mb-2" />
                      <p className="text-xs text-surface-400">No history available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Right-side detail panel for Appointment / Follow-up */}
      {detailPanel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={closeDetailPanel} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] md:w-[480px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${detailPanel.type === 'appointment' ? 'bg-primary-100' : 'bg-blue-100'}`}>
                  {detailPanel.type === 'appointment' ? <CalendarDays size={16} className="text-primary-600" /> : <PhoneCall size={16} className="text-blue-600" />}
                </div>
                <h2 className="text-base font-semibold text-surface-700">
                  {detailPanel.type === 'appointment' ? 'Appointment Details' : 'Follow-up Details'}
                </h2>
              </div>
              <button onClick={closeDetailPanel} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Customer Info */}
              <div className="px-5 py-4 border-b border-surface-100">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-700">
                      {(detailPanel.type === 'appointment' ? detailPanel.data.customer : detailPanel.data.name).split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-surface-800">
                      {detailPanel.type === 'appointment' ? detailPanel.data.customer : detailPanel.data.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={11} /> {detailPanel.data.phone || 'No phone'}</span>
                      {detailPanel.type === 'followup' && <Badge status={detailPanel.data.tag} />}
                    </div>
                  </div>
                  {detailPanel.data.phone && (
                    <a href={`tel:${detailPanel.data.phone}`} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0" title="Call">
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              </div>

              {/* Info Cards */}
              <div className="px-5 py-4 border-b border-surface-100">
                {detailPanel.type === 'appointment' ? (
                  <>
                    <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Service Details</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Service</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.service}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Stylist</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.stylist}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Time</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.time}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Amount</p>
                        <p className="text-sm font-semibold text-primary-600">{'\u20B9'}{detailPanel.data.amount}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Follow-up Details</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 col-span-2">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Reason</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.reason}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Last Service</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.service}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-[10px] text-surface-400 font-medium mb-0.5">Last Visit</p>
                        <p className="text-sm font-semibold text-surface-700">{detailPanel.data.daysAgo}d ago</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Update Status */}
              <div className="px-5 py-4 border-b border-surface-100">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Update Status</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={panelStatus}
                    onChange={(e) => { setPanelStatus(e.target.value); setStatusSaved(false); }}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                  >
                    {detailPanel.type === 'appointment' ? (
                      <>
                        <option value="booked">Booked</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="no-show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rescheduled">Rescheduled</option>
                      </>
                    ) : (
                      <>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="not-reachable">Not Reachable</option>
                        <option value="rescheduled">Rescheduled</option>
                      </>
                    )}
                  </select>
                  <button
                    onClick={saveStatus}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${statusSaved ? 'bg-green-100 text-green-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                  >
                    {statusSaved ? (
                      <span className="flex items-center gap-1"><CheckCircle size={14} /> Saved</span>
                    ) : 'Save'}
                  </button>
                </div>

                {/* Status visual indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-surface-400">Current:</span>
                  <Badge status={panelStatus} />
                </div>
              </div>

              {/* Comments */}
              <div className="px-5 py-4 border-b border-surface-100">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Comments & Notes</h4>

                {/* Add comment input */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={panelComment}
                    onChange={(e) => setPanelComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-surface-400"
                  />
                  <button
                    onClick={addComment}
                    disabled={!panelComment.trim()}
                    className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                  </button>
                </div>

                {/* Comments list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getDetailComments().length > 0 ? (
                    getDetailComments().map((c, i) => (
                      <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-surface-50 border border-surface-100">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User size={11} className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-surface-700 leading-relaxed">{c.text}</p>
                          <p className="text-[10px] text-surface-400 mt-1">{c.date} at {c.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <MessageSquare size={18} className="mx-auto text-surface-300 mb-1" />
                      <p className="text-[11px] text-surface-400">No comments yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reschedule */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Reschedule</h4>
                  <button
                    onClick={() => { setShowReschedule(!showReschedule); setRescheduleSaved(false); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${showReschedule ? 'bg-surface-100 text-surface-600' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
                  >
                    {showReschedule ? 'Cancel' : (
                      <span className="flex items-center gap-1"><RefreshCw size={11} /> Reschedule</span>
                    )}
                  </button>
                </div>

                {showReschedule && (
                  <div className="space-y-3 p-3 rounded-lg bg-surface-50 border border-surface-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-surface-500 mb-1">New Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleSaved(false); }}
                          className="w-full px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-surface-500 mb-1">New Time</label>
                        <input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => { setRescheduleTime(e.target.value); setRescheduleSaved(false); }}
                          className="w-full px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                        />
                      </div>
                    </div>
                    <button
                      onClick={confirmReschedule}
                      className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${rescheduleSaved ? 'bg-green-100 text-green-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                    >
                      {rescheduleSaved ? (
                        <span className="flex items-center justify-center gap-1"><CheckCircle size={14} /> Rescheduled Successfully</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1"><Calendar size={14} /> Confirm Reschedule</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Today's Appointments" value={String(dashStats.todaysAppointments)} />
        <StatCard icon={UserPlus} label="New Customers (Month)" value={String(dashStats.newCustomersThisMonth)} />
        <StatCard icon={AlertTriangle} label="No-show Rate" value={`${dashStats.noShowRate}%`} changeType="down" />
      </div>

      {/* Customer Breakdown */}
      {customerBreakdown && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Users size={14} className="text-teal-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-700">Customer Breakdown: New vs Returning</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-8 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-600">New Customers <span className="text-xs text-surface-400">(≤1 visit)</span></span>
                    <span className="text-sm font-semibold text-surface-700">{customerBreakdown.new} <span className="text-xs text-surface-400">({customerBreakdown.newPercent}%)</span></span>
                  </div>
                  <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${customerBreakdown.newPercent}%` }} />
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-600">Returning Customers <span className="text-xs text-surface-400">(2+ visits)</span></span>
                    <span className="text-sm font-semibold text-surface-700">{customerBreakdown.returning} <span className="text-xs text-surface-400">({customerBreakdown.returningPercent}%)</span></span>
                  </div>
                  <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${customerBreakdown.returningPercent}%` }} />
                  </div>
                </div>
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-surface-800">{customerBreakdown.total}</p>
                  <p className="text-xs text-surface-400">Total Customers</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Lead Pipeline */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Target size={14} className="text-indigo-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-700">Lead Pipeline</h2>
              </div>
              <span className="text-xs text-surface-400">{(apiCustomers || []).length} total customers</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-end gap-1">
              {PIPELINE_STAGES.map((stage, i) => {
                const customers = apiCustomers || [];
                const count = customers.filter(c => c.stage === stage.key).length;
                const maxCount = Math.max(...PIPELINE_STAGES.map(s => customers.filter(c => c.stage === s.key).length), 1);
                const heightPct = Math.max((count / maxCount) * 100, 12);
                return (
                  <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className={`text-xs font-bold ${stage.textColor}`}>{count}</span>
                    <div className="w-full flex justify-center" style={{ height: '100px' }}>
                      <div className={`w-full max-w-[56px] ${stage.color} rounded-t-lg transition-all duration-300 relative group`}
                        style={{ height: `${heightPct}%`, marginTop: 'auto' }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 px-2 py-1 bg-surface-800 text-white text-[10px] rounded whitespace-nowrap">
                          {stage.label}: {count}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${stage.textColor} text-center leading-tight`}>{stage.label}</span>
                    {i < PIPELINE_STAGES.length - 1 && i !== 6 && (
                      <div className="hidden" />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Summary row */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-surface-100 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[11px] font-medium text-green-700">Active: {(apiCustomers || []).filter(c => ['warm', 'hot', 'converted', 'loyal', 'champion'].includes(c.stage)).length}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[11px] font-medium text-amber-700">Nurturing: {(apiCustomers || []).filter(c => ['enquiry', 'cold'].includes(c.stage)).length}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[11px] font-medium text-red-700">Lost: {(apiCustomers || []).filter(c => c.stage === 'lost').length}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 ml-auto">
                <span className="text-[11px] font-medium text-purple-700">Conversion Rate: {(apiCustomers || []).length > 0 ? Math.round(((apiCustomers || []).filter(c => ['converted', 'loyal', 'champion'].includes(c.stage)).length / (apiCustomers || []).length) * 100) : 0}%</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Today's Appointments - Enhanced */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                  <CalendarDays size={14} className="text-primary-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-700">Today&apos;s Appointments</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">{todayAppts.length} total</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {todayAppts.map((appt) => {
              const currentStatus = apptStatuses[appt.id] || appt.status;
              return (
                <div key={appt.id} onClick={() => openApptDetail(appt)} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50/50 border border-surface-100 hover:bg-primary-50/40 hover:border-primary-200 transition-colors cursor-pointer group">
                  <div className="flex flex-col items-center w-12 flex-shrink-0">
                    <span className="text-xs font-semibold text-surface-700">{appt.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-surface-700 truncate">{appt.customer}</p>
                    </div>
                    <p className="text-xs text-surface-400">{appt.service} · <span className="text-surface-500">{appt.stylist}</span></p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-surface-600">{'\u20B9'}{appt.amount}</span>
                    <Badge status={currentStatus} />
                    <ChevronRight size={14} className="text-surface-300 group-hover:text-primary-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Today's Follow-ups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PhoneCall size={14} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-700">Today&apos;s Follow-ups</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{todayFollowups.filter(f => !f.contacted).length} pending</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {todayFollowups.map((f) => {
              const isContacted = followupStatuses[f.id] !== undefined ? followupStatuses[f.id] : f.contacted;
              return (
                <div key={f.id} onClick={() => openFollowupDetail(f)} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer group ${isContacted ? 'bg-green-50/30 border-green-100 hover:bg-green-50/50' : 'bg-surface-50/50 border-surface-100 hover:bg-primary-50/40 hover:border-primary-200'}`}>
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary-700">{f.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-surface-700 truncate">{f.name}</p>
                      <Badge status={f.tag} />
                    </div>
                    <p className="text-xs text-surface-400">{f.reason} · {f.service} · {f.daysAgo}d ago</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isContacted ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-600"><CheckCircle size={12} /> Done</span>
                    ) : (
                      <a href={`tel:${f.phone}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors" title={`Call ${f.phone}`}>
                        <Phone size={13} />
                      </a>
                    )}
                    <ChevronRight size={14} className="text-surface-300 group-hover:text-primary-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* Row 2: No-shows + Birthdays + At-risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {/* Today's No-shows */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserX size={14} className="text-red-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-700">No-Shows Today</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{todayNoShows.length}</span>
            </div>
          </CardHeader>
          <CardBody>
            {todayNoShows.length > 0 ? (
              <div className="space-y-2">
                {todayNoShows.map((ns) => (
                  <div key={ns.id} className="p-3 rounded-lg bg-red-50/40 border border-red-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-surface-700">{ns.customer}</p>
                      <span className="text-xs font-semibold text-red-600">{'\u20B9'}{ns.amount}</span>
                    </div>
                    <p className="text-xs text-surface-400">{ns.service} · Scheduled {ns.time}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-surface-400">{ns.attempts} call attempt{ns.attempts !== 1 ? 's' : ''} made</span>
                      <div className="flex gap-1.5">
                        <a href={`tel:${ns.phone}`} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
                          <Phone size={10} /> Call
                        </a>
                        <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-primary-50 border border-primary-200 text-primary-600 hover:bg-primary-100 transition-colors">
                          <RefreshCw size={10} /> Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle size={24} className="mx-auto text-green-400 mb-1.5" />
                <p className="text-xs text-surface-400">No no-shows today!</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Birthdays */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Cake size={14} className="text-pink-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-700">Birthdays</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full">{filteredBirthdays.length}</span>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 mt-3 flex-wrap">
              {[{ key: 'today', label: 'Today' }, { key: 'month', label: 'This Month' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }].map(f => (
                <button key={f.key} onClick={() => setBdayFilter(f.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${bdayFilter === f.key ? 'bg-pink-600 text-white' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {filteredBirthdays.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {filteredBirthdays.map((b) => {
                  const isToday = b.daysUntil === 0;
                  return (
                    <div key={b.id} className={`p-3 rounded-lg border ${isToday ? 'bg-pink-50/40 border-pink-100' : 'bg-surface-50/50 border-surface-100'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-pink-100' : 'bg-surface-100'}`}>
                          <Cake size={14} className={isToday ? 'text-pink-600' : 'text-surface-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-surface-700">{b.name}</p>
                            <Badge status={b.tag} />
                          </div>
                          <p className="text-xs text-surface-400">
                            {isToday ? `Turns ${b.age} today` : b.daysUntil > 0 ? `Turns ${b.age} in ${b.daysUntil}d` : `Turned ${b.age} · ${Math.abs(b.daysUntil)}d ago`}
                            {' · '}{new Date(b.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-pink-100/40">
                        {b.wishSent ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-green-600"><CheckCircle size={12} /> Wish sent</span>
                        ) : isToday || b.daysUntil < 0 ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600"><AlertCircle size={12} /> Wish not sent</span>
                        ) : (
                          <span className="text-[11px] text-surface-400">Upcoming</span>
                        )}
                        <div className="flex gap-1.5">
                          {!b.wishSent && (isToday || b.daysUntil < 0) && (
                            <button onClick={() => setWaModal({ open: true, customer: { id: b.id, name: b.name, phone: b.phone }, vars: {} })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-pink-100 text-pink-700 hover:bg-pink-200 transition-colors">
                              <MessageSquare size={10} /> Send Wish
                            </button>
                          )}
                          <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
                            <Phone size={10} /> Call
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Cake size={24} className="mx-auto text-surface-300 mb-1.5" />
                <p className="text-xs text-surface-400">
                  {bdayFilter === 'today' ? 'No birthdays today' : bdayFilter === 'month' ? 'No birthdays this month' : bdayFilter === 'upcoming' ? 'No upcoming birthdays' : 'No past birthdays this month'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* At-Risk / Inactive Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={14} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-700">At-Risk Customers</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">{atRiskCustomers.length}</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {atRiskCustomers.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-amber-50/30 border border-amber-100 hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-surface-700">{c.name}</p>
                      <Badge status={c.tag} />
                    </div>
                    <span className="text-[11px] font-semibold text-red-500">{c.daysSince}d inactive</span>
                  </div>
                  <p className="text-xs text-surface-400">Last visit: {c.lastVisit} · {c.visits} visits · {'\u20B9'}{c.totalSpent.toLocaleString()} spent</p>
                  <div className="flex gap-1.5 mt-2">
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
                      <Phone size={10} /> Call
                    </a>
                    <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-primary-50 border border-primary-200 text-primary-600 hover:bg-primary-100 transition-colors">
                      <MessageSquare size={10} /> Send Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 2.5: Customer Feedback */}
      {feedbackStats && feedbackStats.total > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Rating Overview */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star size={14} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-700">Customer Feedback</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-surface-800">{feedbackStats.averageRating}</div>
                <div className="flex justify-center gap-0.5 my-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={16} className={i <= Math.round(feedbackStats.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <p className="text-xs text-surface-400">{feedbackStats.total} review{feedbackStats.total !== 1 ? 's' : ''}</p>
              </div>
              {/* Distribution bars */}
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedbackStats.distribution[star] || 0;
                  const pct = feedbackStats.total > 0 ? (count / feedbackStats.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-surface-500">{star}</span>
                      <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-surface-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Recent Reviews */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageSquare size={14} className="text-purple-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-700">Recent Reviews</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {feedbackStats.recent.map((fb) => (
                  <div key={fb.id} className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-700">{fb.customer?.name}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={12} className={i <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {fb.comment && <p className="text-xs text-surface-500 italic">"{fb.comment}"</p>}
                    <p className="text-[10px] text-surface-400 mt-1">
                      {fb.appointment?.services?.map(s => s.service.name).join(', ')} · {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
                {feedbackStats.recent.length === 0 && (
                  <div className="text-center py-6 text-xs text-surface-400">No feedback yet</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Add Customer Slide-out */}
      {showAddCustomer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowAddCustomer(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
              <h2 className="text-lg font-semibold text-surface-800">Add New Customer</h2>
              <button onClick={() => setShowAddCustomer(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await customersApi.create({ name: customerForm.name, phone: customerForm.phone, email: customerForm.email || null, dob: customerForm.dob || null, gender: customerForm.gender, tag: customerForm.tag.toUpperCase(), notes: customerForm.notes || null });
                  toast.success('Customer created successfully');
                  setShowAddCustomer(false);
                  setCustomerForm(emptyCustomerForm);
                } catch (err) { toast.error(err.message || 'Failed to create customer'); }
              }}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Full Name *</label>
                  <input required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number *</label>
                  <input required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                  <input type="email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Date of Birth</label>
                  <input type="date" value={customerForm.dob} onChange={e => setCustomerForm({...customerForm, dob: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Gender</label>
                  <select value={customerForm.gender} onChange={e => setCustomerForm({...customerForm, gender: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                    <option>Female</option><option>Male</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Tag</label>
                  <select value={customerForm.tag} onChange={e => setCustomerForm({...customerForm, tag: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                    <option value="new">New</option><option value="regular">Regular</option><option value="vip">VIP</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
                <textarea rows={3} value={customerForm.notes} onChange={e => setCustomerForm({...customerForm, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 text-sm font-medium border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Add Customer</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, customer: null, vars: {} })}
        customer={waModal.customer}
        template="birthday"
        templateVars={waModal.vars}
      />
    </div>
  );
}