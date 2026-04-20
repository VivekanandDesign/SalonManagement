import { useState, useEffect } from 'react';
import { UserCog, Plus, Star, Calendar, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { staff as staffApi, services as servicesApi, dashboard as dashboardApi } from '../services/api';

const ROLES = ['ADMIN', 'RECEPTIONIST', 'STYLIST'];

const emptyForm = { name: '', role: 'STYLIST', phone: '', email: '', password: '', services: [] };

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [staffRes, svcRes, perfRes] = await Promise.all([staffApi.list(), servicesApi.list(), dashboardApi.stylistPerformance()]);
        const perfMap = {};
        (perfRes.data || []).forEach(p => { perfMap[p.stylistId] = { appointments: p.appointments, revenue: p.revenue }; });
        const staffData = (staffRes.data || []).map(s => ({
          id: s.id, name: s.name, role: s.role, phone: s.phone || '',
          email: s.email || '', services: [],
          appointments: perfMap[s.id]?.appointments || 0,
          revenue: perfMap[s.id]?.revenue || 0,
          present: s.isActive,
        }));
        // Load services for each staff member
        const enriched = await Promise.all(staffData.map(async (s) => {
          try {
            const detail = await staffApi.getById(s.id);
            return { ...s, services: (detail.staffServices || []).map(ss => ss.service?.name).filter(Boolean) };
          } catch { return s; }
        }));
        setStaff(enriched);
        setAllServices((svcRes.data || []).map(s => s.name));
      } catch (err) { console.error('Failed to load staff:', err); toast.error('Failed to load staff data'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewAttendance, setViewAttendance] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, role: s.role, phone: s.phone, email: s.email || '', password: '', services: [...s.services] }); setShowModal(true); };
  const openView = async (s) => {
    setViewing(s); setShowView(true); setViewAttendance([]);
    try {
      const now = new Date();
      const res = await staffApi.getAttendance(s.id, { month: now.getMonth() + 1, year: now.getFullYear() });
      setViewAttendance(res.data || []);
    } catch (err) { console.error('Failed to load attendance:', err); toast.error('Failed to load attendance'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffApi.update(editing.id, { name: form.name, role: form.role, phone: form.phone });
        setStaff(prev => prev.map(s => s.id === editing.id ? { ...s, name: form.name, role: form.role, phone: form.phone, services: [...form.services] } : s));
      } else {
        const res = await staffApi.create({ name: form.name, email: form.email, password: form.password || 'password123', role: form.role, phone: form.phone });
        setStaff(prev => [...prev, { id: res.id, name: form.name, role: form.role, phone: form.phone, email: form.email, services: [], appointments: 0, revenue: 0, present: true }]);
      }
    } catch (err) { toast.error(err.message || 'Failed to save staff member'); return; }
    toast.success(editing ? 'Staff member updated' : 'Staff member added');
    setShowModal(false);
  };

  const toggleAttendance = async (id) => {
    const s = staff.find(m => m.id === id);
    if (!s) return;
    try {
      await staffApi.markAttendance(id, { date: new Date().toISOString().split('T')[0], status: s.present ? 'absent' : 'present' });
      setStaff(prev => prev.map(m => m.id === id ? { ...m, present: !m.present } : m));
    } catch (err) { console.error(err); toast.error('Failed to update attendance'); setStaff(prev => prev.map(m => m.id === id ? { ...m, present: !m.present } : m)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await staffApi.deactivate(id);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err) { toast.error(err.message || 'Failed to remove staff member'); return; }
    toast.success('Staff member removed');
  };

  const toggleService = (svc) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc]
    }));
  };

  return (
    <div>
      <PageHeader title="Staff" description="Manage your team and track performance"
        actions={<Button onClick={openAdd}><Plus size={16} /> Add Staff</Button>} />

      {/* Attendance Banner */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-700">Today's Attendance</p>
              <p className="text-xs text-surface-400 mt-0.5">Click to toggle present/absent</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {staff.map((s) => (
                <button key={s.id} onClick={() => toggleAttendance(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                    ${s.present ? 'bg-success-50 border-green-200 text-green-700' : 'bg-surface-50 border-surface-200 text-surface-400'}`}>
                  {s.present ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {staff.map((s) => (
          <Card key={s.id} className="hover:shadow-card-hover transition-shadow">
            <CardBody>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-700">{s.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-surface-700">{s.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${s.present ? 'bg-success-500' : 'bg-surface-300'}`} />
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5">{s.role}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.services.map((svc) => (
                      <span key={svc} className="px-2 py-0.5 text-xs bg-surface-50 text-surface-500 rounded-md border border-surface-100">{svc}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-100">
                    <div className="flex items-center gap-1 text-xs text-surface-500"><Calendar size={12} /><span>{s.appointments} appts</span></div>
                    <div className="flex items-center gap-1 text-xs text-surface-500"><Star size={12} /><span>{'\u20B9'}{(s.revenue / 1000).toFixed(0)}k revenue</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={() => openView(s)}><Eye size={12} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit size={12} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 size={12} className="text-danger-500" /></Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Staff' : 'Add New Staff'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
              <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Password *</label>
                  <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                </div>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Services Offered</label>
            <div className="flex flex-wrap gap-2">
              {allServices.map(svc => (
                <button key={svc} type="button" onClick={() => toggleService(svc)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors
                    ${form.services.includes(svc) ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'}`}>
                  {svc}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Add Staff'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showView} onClose={() => setShowView(false)} title="Staff Profile" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-surface-100">
              <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-700">{viewing.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-800">{viewing.name}</h3>
                <p className="text-sm text-surface-500">{viewing.role} · {viewing.phone}</p>
              </div>
              <Badge status={viewing.present ? 'active' : 'inactive'} label={viewing.present ? 'Present' : 'Absent'} className="ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{viewing.appointments}</p>
                <p className="text-xs text-surface-500">Total Appointments</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{'\u20B9'}{viewing.revenue.toLocaleString()}</p>
                <p className="text-xs text-surface-500">Revenue Generated</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-700 mb-2">Services:</p>
              <div className="flex flex-wrap gap-2">
                {viewing.services.map(svc => (
                  <span key={svc} className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded-lg border border-primary-100">{svc}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-700 mb-2">Attendance This Month:</p>
              {viewAttendance.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {viewAttendance.map(a => {
                    const d = new Date(a.date);
                    const color = a.status === 'present' ? 'bg-green-100 text-green-700 border-green-200' : a.status === 'half_day' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
                    return (
                      <span key={a.id} className={`px-2 py-1 text-[10px] font-medium rounded border ${color}`} title={a.status}>
                        {d.getDate()} {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-surface-400">No attendance records this month</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
