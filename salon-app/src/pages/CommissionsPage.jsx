import { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Calendar, Filter, X } from 'lucide-react';
import { commissions, staff as staffApi } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';
const tabCls = 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap';
const tabActive = 'bg-primary-50 text-primary-700 border-primary-200';
const tabInactive = 'text-surface-500 border-surface-200 hover:bg-surface-50';

export default function CommissionsPage() {
  const [summary, setSummary] = useState([]);
  const [commissionList, setCommissionList] = useState([]);
  const [tips, setTips] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');
  const [showTipModal, setShowTipModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData(params = {}) {
    setLoading(true);
    try {
      const [sumRes, listRes, tipsRes, staffRes] = await Promise.all([
        commissions.summary(params),
        commissions.list(params),
        commissions.listTips(params),
        staffApi.list(),
      ]);
      setSummary(sumRes.data || []);
      setCommissionList(listRes.data || []);
      setTips(tipsRes);
      setStaffList(staffRes.data || []);
    } catch { addToast('Failed to load', 'error'); }
    setLoading(false);
  }

  function applyFilter() {
    const params = {};
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    loadData(params);
  }

  if (loading) return <LoadingSpinner />;

  const totalCommission = summary.reduce((s, c) => s + c.totalCommission, 0);
  const totalTips = tips.total || 0;

  return (
    <div>
      <PageHeader title="Commissions & Tips" description="Track staff earnings"
        actions={<Button onClick={() => setShowTipModal(true)}><DollarSign size={16} /> Add Tip</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Commissions" value={`₹${Math.round(totalCommission).toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Total Tips" value={`₹${Math.round(totalTips).toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Staff Count" value={summary.length} icon={Users} />
        <StatCard label="Invoices" value={commissionList.length} icon={Calendar} />
      </div>

      {/* Date filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-6">
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-surface-500 mb-1">From</label>
          <input type="date" className={inputCls} value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
        </div>
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-surface-500 mb-1">To</label>
          <input type="date" className={inputCls} value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
        </div>
        <Button size="sm" onClick={applyFilter}><Filter size={14} /> Filter</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[{ key: 'summary', label: 'Summary', icon: Users }, { key: 'details', label: 'Details', icon: Calendar }, { key: 'tips', label: 'Tips', icon: DollarSign }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`${tabCls} ${tab === t.key ? tabActive : tabInactive}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-3">
          {summary.length === 0 ? <EmptyState icon={Users} title="No commissions" description="Commissions are auto-calculated when invoices are created" /> :
            summary.map(s => (
              <Card key={s.userId}>
                <div className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-surface-800 truncate">{s.name}</p>
                    <p className="text-xs text-surface-500">{s.commissionPercent}% commission · {s.invoiceCount} invoices</p>
                  </div>
                  <p className="text-lg font-bold text-green-600 shrink-0">₹{Math.round(s.totalCommission).toLocaleString()}</p>
                </div>
              </Card>
            ))}
        </div>
      )}

      {tab === 'details' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50/70 text-left">
                  <th className="px-3 sm:px-4 py-3 font-semibold text-surface-600">Staff</th>
                  <th className="px-3 sm:px-4 py-3 font-semibold text-surface-600 hidden sm:table-cell">Invoice</th>
                  <th className="px-3 sm:px-4 py-3 font-semibold text-surface-600 text-right">Amount</th>
                  <th className="px-3 sm:px-4 py-3 font-semibold text-surface-600 text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissionList.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center">
                    <Calendar size={28} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-sm text-surface-400">No commission records</p>
                  </td></tr>
                ) : commissionList.map(c => (
                  <tr key={c.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="px-3 sm:px-4 py-3">
                      <p className="font-medium text-surface-800">{c.user?.name}</p>
                      <p className="text-xs text-surface-400 sm:hidden">{c.invoice?.invoiceNumber} · {new Date(c.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-surface-500 hidden sm:table-cell">{c.invoice?.invoiceNumber}</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-medium text-green-600">₹{c.amount}</td>
                    <td className="px-3 sm:px-4 py-3 text-right text-surface-500 hidden sm:table-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'tips' && (
        <div className="space-y-2">
          {tips.data?.length === 0 ? <EmptyState icon={DollarSign} title="No tips recorded" description="Record tips to track staff earnings" /> :
            tips.data?.map(t => (
              <Card key={t.id}>
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-surface-800 truncate">{t.user?.name}</p>
                    <p className="text-xs text-surface-500">{t.paymentMode} · {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-green-600 shrink-0">₹{t.amount}</p>
                </div>
              </Card>
            ))}
        </div>
      )}

      {showTipModal && <TipModal staff={staffList} onClose={() => setShowTipModal(false)} onSave={() => { loadData(); setShowTipModal(false); }} />}
    </div>
  );
}

function TipModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState({ userId: '', amount: '', paymentMode: 'CASH' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await commissions.addTip({ ...form, amount: parseFloat(form.amount) });
      addToast('Tip added', 'success');
      onSave();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Add Tip</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Staff Member *</label>
              <select className={inputCls} value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required>
                <option value="">Select staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tip Amount (₹) *</label>
              <input type="number" className={inputCls} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500].map(a => (
                <button type="button" key={a} onClick={() => setForm({ ...form, amount: String(a) })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${form.amount === String(a) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                  ₹{a}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-2">Payment Mode</label>
              <div className="flex gap-2">
                {['CASH', 'UPI', 'CARD'].map(m => (
                  <button type="button" key={m} onClick={() => setForm({ ...form, paymentMode: m })}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${form.paymentMode === m ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add Tip'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
