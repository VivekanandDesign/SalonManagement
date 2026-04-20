import { useState, useEffect } from 'react';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Edit, Trash2, MessageSquare } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { appointments as apptsApi, services as servicesApi, staff as staffApi, customers as customersApi, settings as settingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['Booked', 'Confirmed', 'In Progress', 'Completed', 'No-show', 'Cancelled'];
const STATUS_KEY = { 'Booked': 'booked', 'Confirmed': 'confirmed', 'In Progress': 'in-progress', 'Completed': 'completed', 'No-show': 'no-show', 'Cancelled': 'cancelled' };
const API_STATUS_MAP = { 'BOOKED': 'booked', 'CONFIRMED': 'confirmed', 'IN_PROGRESS': 'in-progress', 'COMPLETED': 'completed', 'NO_SHOW': 'no-show', 'CANCELLED': 'cancelled' };
const statusDot = { booked: 'bg-booked', confirmed: 'bg-confirmed', 'in-progress': 'bg-in-progress', completed: 'bg-completed', 'no-show': 'bg-no-show', cancelled: 'bg-cancelled' };

function generateTimeSlots(startHour = 9, endHour = 19) {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) { slots.push(`${String(h).padStart(2,'0')}:00`); slots.push(`${String(h).padStart(2,'0')}:30`); }
  return slots;
}
const defaultTimeSlots = generateTimeSlots(9, 19);

const emptyForm = { customer: '', customerId: '', services: [], stylist: '', stylistId: '', date: new Date().toISOString().slice(0, 10), time: '09:00', isWalkin: false };

function mapAppt(a) {
  const startTime = a.startTime ? new Date(a.startTime) : null;
  const endTime = a.endTime ? new Date(a.endTime) : null;
  const duration = startTime && endTime ? Math.round((endTime - startTime) / 60000) : 30;
  return {
    id: a.id,
    time: startTime ? `${String(startTime.getHours()).padStart(2,'0')}:${String(startTime.getMinutes()).padStart(2,'0')}` : '09:00',
    customer: a.customer?.name || 'Walk-in',
    customerId: a.customerId,
    service: a.services?.[0]?.service?.name || '',
    serviceId: a.services?.[0]?.serviceId || '',
    stylist: a.stylist?.name || '',
    stylistId: a.stylistId,
    duration,
    status: API_STATUS_MAP[a.status] || a.status?.toLowerCase() || 'booked',
    date: a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
    isWalkin: a.isWalkin || false,
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [stylistsList, setStylistsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [timeSlots, setTimeSlots] = useState(defaultTimeSlots);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function load() {
      try {
        const [apptRes, svcRes, staffRes, custRes, settingsData] = await Promise.all([
          apptsApi.list({ limit: 200 }), servicesApi.list(), staffApi.list(), customersApi.list({ limit: 200 }),
          settingsApi.get().catch(() => null),
        ]);
        // Derive time slots from settings
        if (settingsData) {
          const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
          const dayHours = settingsData.workingHours?.[dayName];
          const openStr = dayHours?.open || settingsData.openTime || '09:00';
          const closeStr = dayHours?.close || settingsData.closeTime || '19:30';
          const startH = parseInt(openStr.split(':')[0], 10);
          const endH = parseInt(closeStr.split(':')[0], 10);
          if (!isNaN(startH) && !isNaN(endH)) setTimeSlots(generateTimeSlots(startH, endH));
        }
        let mappedAppts = (apptRes.data || []).map(mapAppt);
        if (user?.role === 'stylist') {
          mappedAppts = mappedAppts.filter(a => a.stylistId === user.id || a.stylist === user.name);
        }
        setAppointments(mappedAppts);
        setServicesList((svcRes.data || []).map(s => ({ id: s.id, name: s.name, duration: s.duration })));
        setStylistsList((staffRes.data || []).filter(s => s.role === 'STYLIST').map(s => ({ id: s.id, name: s.name })));
        setCustomersList((custRes.data || []).map(c => ({ id: c.id, name: c.name })));
      } catch (err) { console.error('Failed to load appointments:', err); toast.error(err.message || 'Failed to load appointments'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState('Day');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [waModal, setWaModal] = useState({ open: false, customer: null, template: 'confirmation', vars: {} });

  const dayAppts = appointments.filter(a => a.date === currentDate);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ customer: a.customer, services: a.service ? [a.service] : [], stylist: a.stylist, date: a.date, time: a.time, isWalkin: a.isWalkin }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const selServices = servicesList.filter(s => form.services.includes(s.name));
    const duration = selServices.reduce((sum, s) => sum + (s.duration || 30), 0) || 30;

    // Double-booking check (local)
    const conflict = appointments.find(a => {
      if (editing && a.id === editing.id) return false;
      if (a.date !== form.date || a.stylist !== form.stylist || a.status === 'cancelled') return false;
      const aStart = toMinutes(a.time); const aEnd = aStart + a.duration;
      const nStart = toMinutes(form.time); const nEnd = nStart + duration;
      return nStart < aEnd && nEnd > aStart;
    });
    if (conflict) { toast.warning(`Double-booking conflict! ${form.stylist} has "${conflict.customer}" at ${conflict.time}`); return; }

    try {
      const [h, m] = form.time.split(':').map(Number);
      const startTime = new Date(`${form.date}T${form.time}:00`);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      const selStylist = stylistsList.find(s => s.name === form.stylist);
      const selCustomer = customersList.find(c => c.name === form.customer);

      if (editing) {
        await apptsApi.update(editing.id, { date: form.date, startTime: startTime.toISOString(), endTime: endTime.toISOString(), stylistId: selStylist?.id, isWalkin: form.isWalkin });
        setAppointments(prev => prev.map(a => a.id === editing.id ? { ...a, customer: form.customer, service: form.services.join(', '), stylist: form.stylist, date: form.date, time: form.time, isWalkin: form.isWalkin, duration } : a));
        toast.success('Appointment updated');
      } else {
        const serviceIds = selServices.map(s => s.id);
        const payload = { customerId: selCustomer?.id, stylistId: selStylist?.id, date: form.date, startTime: startTime.toISOString(), endTime: endTime.toISOString(), serviceIds, isWalkin: form.isWalkin };
        if (form.isWalkin && !selCustomer) payload.customerName = form.customer;
        const res = await apptsApi.create(payload);
        setAppointments(prev => [...prev, { id: res.id, customer: form.customer, service: form.services.join(', '), stylist: form.stylist, date: form.date, time: form.time, isWalkin: form.isWalkin, duration, status: form.isWalkin ? 'in-progress' : 'booked' }]);
        toast.success('Appointment booked');
      }
    } catch (err) { toast.error(err.message || 'Failed to save appointment'); return; }
    setShowModal(false);
  };

  const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const changeStatus = (appt) => { setStatusTarget(appt); setShowStatusModal(true); };
  const applyStatus = async (newStatus) => {
    try {
      await apptsApi.updateStatus(statusTarget.id, newStatus.toUpperCase().replace(/ /g, '_').replace('-', '_'));
      setAppointments(prev => prev.map(a => a.id === statusTarget.id ? { ...a, status: STATUS_KEY[newStatus] } : a));
      toast.success(`Status changed to ${newStatus}`);
    } catch (err) { toast.error(err.message || 'Failed to update status'); }
    setShowStatusModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await apptsApi.cancel(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled');
    } catch (err) { toast.error(err.message || 'Failed to cancel appointment'); }
  };

  const prevDay = () => {
    const d = new Date(currentDate);
    if (viewMode === 'Month') { d.setMonth(d.getMonth() - 1); }
    else if (viewMode === 'Week') { d.setDate(d.getDate() - 7); }
    else { d.setDate(d.getDate() - 1); }
    setCurrentDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    if (viewMode === 'Month') { d.setMonth(d.getMonth() + 1); }
    else if (viewMode === 'Week') { d.setDate(d.getDate() + 7); }
    else { d.setDate(d.getDate() + 1); }
    setCurrentDate(d.toISOString().slice(0, 10));
  };
  const fmtDate = (ds) => new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Week view helpers
  const getWeekDates = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      return wd.toISOString().slice(0, 10);
    });
  };
  const weekDates = viewMode === 'Week' ? getWeekDates(currentDate) : [];
  const weekLabel = weekDates.length ? `${new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';

  // Month view helpers
  const getMonthDates = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    const dates = [];
    for (let i = startPad; i > 0; i--) {
      const pd = new Date(year, month, 1 - i);
      dates.push({ date: pd.toISOString().slice(0, 10), inMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push({ date: new Date(year, month, i).toISOString().slice(0, 10), inMonth: true });
    }
    while (dates.length % 7 !== 0) {
      const nd = new Date(lastDay);
      nd.setDate(nd.getDate() + (dates.length - startPad - lastDay.getDate()) + 1);
      dates.push({ date: nd.toISOString().slice(0, 10), inMonth: false });
    }
    return dates;
  };
  const monthDates = viewMode === 'Month' ? getMonthDates(currentDate) : [];
  const monthLabel = new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <PageHeader title="Appointments" description="Schedule and manage appointments"
        actions={<><Button variant="outline" onClick={() => setCurrentDate(today)}><CalendarDays size={16} /> Today</Button><Button onClick={openAdd}><Plus size={16} /> New Appointment</Button></>} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 sm:gap-3">
                  <button onClick={prevDay} className="p-1 rounded hover:bg-surface-100 text-surface-400"><ChevronLeft size={18} /></button>
                  <h2 className="text-sm sm:text-base font-semibold text-surface-700">{viewMode === 'Month' ? monthLabel : viewMode === 'Week' ? weekLabel : fmtDate(currentDate)}</h2>
                  <button onClick={nextDay} className="p-1 rounded hover:bg-surface-100 text-surface-400"><ChevronRight size={18} /></button>
                </div>
                <div className="flex gap-1">
                  {['Day', 'Week', 'Month'].map(v => (
                    <button key={v} onClick={() => setViewMode(v)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border ${viewMode === v ? 'bg-primary-50 text-primary-700 border-primary-200' : 'text-surface-500 border-surface-200 hover:bg-surface-50'}`}>{v}</button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {viewMode === 'Day' ? (
              <div className="divide-y divide-surface-50">
                {timeSlots.map((slot) => {
                  const appt = dayAppts.find(a => a.time === slot);
                  return (
                    <div key={slot} className="flex items-stretch min-h-[2.5rem] sm:min-h-[3rem]">
                      <div className="w-12 sm:w-16 shrink-0 py-2 px-2 sm:px-3 text-xs text-surface-400 font-medium border-r border-surface-100">{slot}</div>
                      <div className="flex-1 py-1 px-2 sm:px-3">
                        {appt && (
                          <div onClick={() => changeStatus(appt)} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg border border-surface-100 bg-surface-50/50 hover:bg-surface-50 transition-colors cursor-pointer group">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[appt.status]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-700 truncate">{appt.customer} {appt.isWalkin && <span className="text-xs text-amber-600">(Walk-in)</span>}</p>
                              <p className="text-xs text-surface-400">{appt.service} · {appt.stylist}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-surface-400 hidden sm:flex"><Clock size={12} />{appt.duration}m</div>
                            <Badge status={appt.status} />
                            <div className="hidden group-hover:flex items-center gap-1">
                              {appt.customerId && !appt.isWalkin && <button onClick={(e) => { e.stopPropagation(); setWaModal({ open: true, customer: { id: appt.customerId, name: appt.customer }, template: 'confirmation', vars: { date: new Date(appt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), time: appt.time, service: appt.service, stylist: appt.stylist } }); }} className="p-1 rounded hover:bg-green-100 text-green-600" title="Send WhatsApp"><MessageSquare size={12} /></button>}
                              <button onClick={(e) => { e.stopPropagation(); openEdit(appt); }} className="p-1 rounded hover:bg-surface-200"><Edit size={12} /></button>
                              {['admin', 'receptionist'].includes(user?.role) && <button onClick={(e) => { e.stopPropagation(); handleDelete(appt.id); }} className="p-1 rounded hover:bg-red-100 text-danger-500"><Trash2 size={12} /></button>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : viewMode === 'Week' ? (
              /* WEEK VIEW */
              <div>
                <div className="grid grid-cols-[3rem_repeat(7,1fr)] sm:grid-cols-[4rem_repeat(7,1fr)] border-b border-surface-100">
                  <div className="py-2 px-1 text-[10px] text-surface-300"></div>
                  {weekDates.map(wd => {
                    const d = new Date(wd + 'T00:00:00');
                    const isToday = wd === today;
                    return (
                      <div key={wd} onClick={() => { setCurrentDate(wd); setViewMode('Day'); }}
                        className={`py-2 px-1 text-center cursor-pointer hover:bg-surface-50 transition-colors border-l border-surface-100 ${isToday ? 'bg-primary-50' : ''}`}>
                        <p className="text-[10px] font-medium text-surface-400">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        <p className={`text-sm font-bold ${isToday ? 'text-primary-600' : 'text-surface-700'}`}>{d.getDate()}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {timeSlots.filter((_, i) => i % 2 === 0).map(slot => (
                    <div key={slot} className="grid grid-cols-[3rem_repeat(7,1fr)] sm:grid-cols-[4rem_repeat(7,1fr)] min-h-[2.5rem] border-b border-surface-50">
                      <div className="py-1 px-1 sm:px-2 text-[10px] text-surface-400 font-medium border-r border-surface-100 flex items-start pt-1.5">{slot}</div>
                      {weekDates.map(wd => {
                        const dayApptsForSlot = appointments.filter(a => a.date === wd && (a.time === slot || a.time === slot.replace(':00', ':30')));
                        return (
                          <div key={wd} className="py-0.5 px-0.5 border-l border-surface-100 min-h-[2.5rem]">
                            {dayApptsForSlot.map(appt => (
                              <div key={appt.id} onClick={() => changeStatus(appt)}
                                className="px-1 py-0.5 mb-0.5 rounded text-[10px] leading-tight cursor-pointer truncate border border-surface-100 hover:bg-surface-100 transition-colors"
                                title={`${appt.time} ${appt.customer} - ${appt.service} (${appt.stylist})`}>
                                <div className="flex items-center gap-1">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[appt.status]}`} />
                                  <span className="font-medium text-surface-700 truncate">{appt.customer}</span>
                                </div>
                                <p className="text-surface-400 truncate">{appt.service}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              ) : (
              /* MONTH VIEW */
              <div>
                <div className="grid grid-cols-7 border-b border-surface-100">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="py-2 px-1 text-center text-[11px] font-semibold text-surface-400 uppercase tracking-wider border-l first:border-l-0 border-surface-100">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDates.map(({ date: md, inMonth }) => {
                    const dayApptsForDate = appointments.filter(a => a.date === md);
                    const isToday = md === today;
                    const isSelected = md === currentDate;
                    return (
                      <div key={md}
                        onClick={() => { setCurrentDate(md); setViewMode('Day'); }}
                        className={`min-h-[5rem] sm:min-h-[6rem] p-1 border-l first:border-l-0 border-b border-surface-100 cursor-pointer hover:bg-surface-50 transition-colors ${!inMonth ? 'bg-surface-50/50' : ''} ${isSelected ? 'ring-2 ring-inset ring-primary-200' : ''}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : inMonth ? 'text-surface-700' : 'text-surface-300'}`}>
                            {new Date(md + 'T00:00:00').getDate()}
                          </span>
                          {dayApptsForDate.length > 0 && (
                            <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">{dayApptsForDate.length}</span>
                          )}
                        </div>
                        <div className="space-y-0.5 overflow-hidden max-h-[3.5rem]">
                          {dayApptsForDate.slice(0, 3).map(appt => (
                            <div key={appt.id} onClick={(e) => { e.stopPropagation(); changeStatus(appt); }}
                              className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate hover:bg-surface-100 transition-colors"
                              title={`${appt.time} ${appt.customer} - ${appt.service}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[appt.status]}`} />
                              <span className="truncate text-surface-600">{appt.time} {appt.customer}</span>
                            </div>
                          ))}
                          {dayApptsForDate.length > 3 && (
                            <p className="text-[10px] text-primary-500 font-medium px-1">+{dayApptsForDate.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Upcoming Today</h2></CardHeader>
            <CardBody className="space-y-3">
              {dayAppts.filter(a => !['completed', 'cancelled', 'no-show'].includes(a.status)).length === 0 && (
                <p className="text-sm text-surface-400 text-center py-6">No upcoming appointments</p>
              )}
              {dayAppts.filter(a => !['completed', 'cancelled', 'no-show'].includes(a.status)).map((appt) => (
                <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-50/50 border border-surface-100 cursor-pointer hover:bg-surface-50 transition-colors">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${statusDot[appt.status]}`} onClick={() => changeStatus(appt)} />
                  <div className="flex-1 min-w-0" onClick={() => changeStatus(appt)}>
                    <p className="text-sm font-medium text-surface-700">{appt.customer}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{appt.service}</p>
                    <div className="flex items-center gap-2 mt-1"><span className="text-xs text-surface-500">{appt.time}</span><span className="text-xs text-surface-300">·</span><span className="text-xs text-surface-500">{appt.stylist}</span></div>
                  </div>
                  <Badge status={appt.status} />
                  {appt.customerId && !appt.isWalkin && (
                    <button onClick={(e) => { e.stopPropagation(); setWaModal({ open: true, customer: { id: appt.customerId, name: appt.customer }, template: 'reminder', vars: { date: new Date(appt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), time: appt.time, service: appt.service, stylist: appt.stylist } }); }}
                      className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors flex-shrink-0" title="Send WhatsApp">
                      <MessageSquare size={14} />
                    </button>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
          <Card className="mt-4">
            <CardBody>
              <p className="text-xs font-medium text-surface-500 mb-3">Status Legend</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusDot).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${color}`} /><span className="text-xs text-surface-500 capitalize">{status.replace('-', ' ')}</span></div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Appointment' : 'New Appointment'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-surface-600 mb-3">
              <input type="checkbox" checked={form.isWalkin} onChange={e => setForm({...form, isWalkin: e.target.checked, customer: e.target.checked ? 'Walk-in' : ''})}
                className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-200" />
              Walk-in customer
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Customer *</label>
              {form.isWalkin ? (
                <input value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} required placeholder="Walk-in name"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
              ) : (
                <select value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} required
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                  <option value="">Select customer</option>
                  {customersList.map(c => <option key={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Services * <span className="text-xs text-surface-400">(select one or more)</span></label>
              <div className="flex flex-wrap gap-1.5 p-2 border border-surface-200 rounded-lg max-h-36 overflow-y-auto">
                {servicesList.map(s => {
                  const selected = form.services.includes(s.name);
                  return (
                    <button key={s.id} type="button" onClick={() => setForm(prev => ({
                      ...prev,
                      services: selected ? prev.services.filter(n => n !== s.name) : [...prev.services, s.name],
                    }))}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${selected ? 'bg-primary-50 text-primary-700 border-primary-200 font-medium' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'}`}>
                      {s.name} <span className="text-surface-400">({s.duration}m)</span>
                    </button>
                  );
                })}
              </div>
              {form.services.length === 0 && <p className="text-xs text-surface-400 mt-1">Select at least one service</p>}
              {form.services.length > 0 && <p className="text-xs text-primary-500 mt-1">{form.services.length} selected · ~{servicesList.filter(s => form.services.includes(s.name)).reduce((sum, s) => sum + s.duration, 0)}min total</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Stylist *</label>
              <select value={form.stylist} onChange={e => setForm({...form, stylist: e.target.value})} required
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">Select stylist</option>
                {stylistsList.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Time *</label>
              <select value={form.time} onChange={e => setForm({...form, time: e.target.value})} required
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                {timeSlots.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Book Appointment'}</Button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, customer: null, template: 'confirmation', vars: {} })}
        customer={waModal.customer}
        template={waModal.template}
        templateVars={waModal.vars}
        onSent={() => toast.success('WhatsApp message sent!')}
      />

      {/* Status Change Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Status" size="sm">
        {statusTarget && (
          <div className="space-y-2">
            <p className="text-sm text-surface-500 mb-3">{statusTarget.customer} — {statusTarget.service}</p>
            {STATUSES.map(s => (
              <button key={s} onClick={() => applyStatus(s)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left text-sm
                  ${STATUS_KEY[s] === statusTarget.status ? 'bg-primary-50 border-primary-200 text-primary-700 font-medium' : 'border-surface-100 text-surface-600 hover:bg-surface-50'}`}>
                <div className={`w-3 h-3 rounded-full ${statusDot[STATUS_KEY[s]]}`} />
                {s}
                {STATUS_KEY[s] === statusTarget.status && <span className="ml-auto text-xs text-primary-500">Current</span>}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
