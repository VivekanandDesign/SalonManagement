import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit, Zap, X } from 'lucide-react';
import { happyHours } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

export default function HappyHoursPage() {
  const [rules, setRules] = useState([]);
  const [currentActive, setCurrentActive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [listRes, currentRes] = await Promise.all([happyHours.list(), happyHours.current()]);
      setRules(listRes.data || []);
      setCurrentActive(currentRes.rules || []);
    } catch { addToast('Failed to load', 'error'); }
    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Happy Hours" description="Off-peak discounts to fill slow periods"
        actions={<Button onClick={() => { setEditRule(null); setShowModal(true); }}><Plus size={16} /> Add Rule</Button>} />

      {currentActive.length > 0 && (
        <Card className="border-green-200 bg-green-50 mb-6">
          <div className="p-4 flex items-center gap-3">
            <Zap size={20} className="text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-green-800">Happy Hour Active Now!</p>
              <p className="text-sm text-green-600 truncate">{currentActive.map(r => `${r.name}: ${r.discountValue}${r.discountType === 'percentage' ? '%' : '₹'} off`).join(', ')}</p>
            </div>
          </div>
        </Card>
      )}

      {rules.length === 0 ? <EmptyState icon={Clock} title="No happy hour rules" description="Create rules to offer off-peak discounts" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => {
            let days = [];
            try { days = JSON.parse(rule.daysOfWeek || '[]'); } catch { days = []; }
            return (
              <Card key={rule.id} className={`hover:shadow-card-hover transition-shadow ${!rule.isActive ? 'opacity-60' : ''}`}>
                <div className="p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-semibold text-surface-800 truncate">{rule.name}</h3>
                    <Badge status={rule.isActive ? 'active' : 'inactive'} label={rule.isActive ? 'Active' : 'Inactive'} />
                  </div>
                  <div className="space-y-2 text-sm text-surface-600">
                    <p><Clock size={14} className="inline mr-1" />{rule.startTime} — {rule.endTime}</p>
                    <p className="font-medium text-primary-600">
                      {rule.discountValue}{rule.discountType === 'percentage' ? '%' : '₹'} off
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {days.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-surface-100 rounded text-xs capitalize">{d.slice(0, 3)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => { setEditRule(rule); setShowModal(true); }}><Edit size={14} /> Edit</Button>
                    <Button size="sm" variant="danger" onClick={async () => { try { await happyHours.delete(rule.id); addToast('Deleted', 'success'); loadData(); } catch (err) { addToast(err.message, 'error'); } }}><Trash2 size={14} /> Delete</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && <HappyHourModal rule={editRule} onClose={() => setShowModal(false)} onSave={loadData} />}
    </div>
  );
}

function HappyHourModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState({
    name: rule?.name || '',
    startTime: rule?.startTime || '11:00',
    endTime: rule?.endTime || '14:00',
    discountType: rule?.discountType || 'percentage',
    discountValue: rule?.discountValue || 10,
    daysOfWeek: rule ? (() => { try { return JSON.parse(rule.daysOfWeek || '[]'); } catch { return []; } })() : ['monday', 'tuesday', 'wednesday'],
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  function toggleDay(day) {
    setForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter(d => d !== day) : [...f.daysOfWeek, day] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (rule) await happyHours.update(rule.id, { ...form, discountValue: parseFloat(form.discountValue) });
      else await happyHours.create({ ...form, discountValue: parseFloat(form.discountValue) });
      addToast(rule ? 'Updated' : 'Created', 'success');
      onSave(); onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">{rule ? 'Edit Happy Hour' : 'New Happy Hour Rule'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Name</label>
              <input className={inputCls} placeholder="e.g. Weekday Lunch Special" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Start Time</label>
                <input type="time" className={inputCls} value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">End Time</label>
                <input type="time" className={inputCls} value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Discount Type</label>
                <select className={inputCls} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                  <option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Value</label>
                <input type="number" className={inputCls} placeholder="10" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-2">Active Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button type="button" key={d} onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.daysOfWeek.includes(d) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : rule ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
