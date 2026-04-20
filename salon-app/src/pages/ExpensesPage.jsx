import { useState, useEffect } from 'react';
import {
  Wallet, Plus, Pencil, Trash2, X, Search, Filter, TrendingUp,
  Calendar, CreditCard, Banknote, ArrowUpDown, BarChart3,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatCard from '../components/ui/StatCard';
import { expenses as expensesApi } from '../services/api';

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD'];
const PAYMENT_LABELS = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card' };

const emptyForm = {
  title: '', amount: '', date: new Date().toISOString().slice(0, 10),
  categoryId: '', paymentMode: 'CASH', notes: '',
};

export default function ExpensesPage() {
  const [expensesList, setExpensesList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [tab, setTab] = useState('list'); // list | summary
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const toast = useToast();

  async function loadExpenses() {
    try {
      const params = { limit: 500 };
      if (filterCategory) params.categoryId = filterCategory;
      if (filterMode) params.paymentMode = filterMode;
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      const res = await expensesApi.list(params);
      setExpensesList(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load expenses');
    }
  }

  async function loadCategories() {
    try {
      const cats = await expensesApi.categories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async function loadSummary() {
    try {
      const params = {};
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      const [sum, tr] = await Promise.all([
        expensesApi.summary(params),
        expensesApi.monthlyTrend(),
      ]);
      setSummary(sum);
      setTrend(tr);
    } catch (err) {
      toast.error(err.message || 'Failed to load summary');
    }
  }

  useEffect(() => {
    async function init() {
      await loadCategories();
      await loadExpenses();
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!loading) loadExpenses();
  }, [filterCategory, filterMode, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (tab === 'summary') loadSummary();
  }, [tab, dateRange.from, dateRange.to]);

  const filtered = expensesList.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expensesList.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowPanel(true);
  }

  function openEdit(expense) {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      date: expense.date?.slice(0, 10) || '',
      categoryId: expense.categoryId,
      paymentMode: expense.paymentMode,
      notes: expense.notes || '',
    });
    setShowPanel(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.amount || !form.categoryId || !form.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await expensesApi.update(editingId, { ...form, amount: parseFloat(form.amount) });
        toast.success('Expense updated');
      } else {
        await expensesApi.create({ ...form, amount: parseFloat(form.amount) });
        toast.success('Expense added');
      }
      setShowPanel(false);
      await loadExpenses();
      if (tab === 'summary') await loadSummary();
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    try {
      await expensesApi.delete(id);
      toast.success('Expense deleted');
      await loadExpenses();
      if (tab === 'summary') await loadSummary();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  if (loading) return <LoadingSpinner />;

  const maxTrend = Math.max(...trend.map(t => t.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        description="Track and manage salon expenses"
        actions={
          <Button icon={Plus} onClick={openNew}>Add Expense</Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="This Month" value={`₹${thisMonth.toLocaleString('en-IN')}`} icon={Calendar} color="bg-primary-100 text-primary-600" />
        <StatCard label="Filtered Total" value={`₹${totalFiltered.toLocaleString('en-IN')}`} icon={CreditCard} color="bg-accent-100 text-accent-600" />
        <StatCard label="Total Entries" value={filtered.length} icon={Banknote} color="bg-success-50 text-success-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-lg w-fit">
        {[{ key: 'list', label: 'All Expenses', icon: ArrowUpDown }, { key: 'summary', label: 'Summary', icon: BarChart3 }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">All Modes</option>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
            </select>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              className="px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              className="px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="text-left px-4 py-3 font-medium text-surface-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-600 hidden md:table-cell">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-600 hidden sm:table-cell">Mode</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-600 hidden lg:table-cell">Added By</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-surface-400">No expenses found</td></tr>
                  ) : filtered.map(exp => (
                    <tr key={exp.id} className="border-b border-surface-100 hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-surface-800">{exp.title}</td>
                      <td className="px-4 py-3 text-surface-500 hidden md:table-cell">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-100 text-surface-600">
                          {exp.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-800">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-surface-500 hidden sm:table-cell">{PAYMENT_LABELS[exp.paymentMode] || exp.paymentMode}</td>
                      <td className="px-4 py-3 text-surface-500 hidden lg:table-cell">{exp.createdBy?.name || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-primary-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-danger-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'summary' && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Expense by Category</h3>
            {summary.breakdown.length === 0 ? (
              <p className="text-sm text-surface-400 py-8 text-center">No data for selected period</p>
            ) : (
              <div className="space-y-3">
                {summary.breakdown.map(b => (
                  <div key={b.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-surface-600">{b.categoryName}</span>
                      <span className="text-xs font-semibold text-surface-800">₹{b.total.toLocaleString('en-IN')} ({b.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${b.percentage}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-surface-100 flex justify-between">
                  <span className="text-sm font-semibold text-surface-700">Total</span>
                  <span className="text-sm font-bold text-surface-900">₹{summary.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Monthly trend */}
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Monthly Trend (Last 6 Months)</h3>
            {trend.length === 0 ? (
              <p className="text-sm text-surface-400 py-8 text-center">No data</p>
            ) : (
              <div className="space-y-3">
                {trend.map((m, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-surface-600">{m.month}</span>
                      <span className="text-xs font-semibold text-surface-800">₹{m.total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${(m.total / maxTrend) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Side Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={() => setShowPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-base font-semibold text-surface-800">
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monthly rent payment"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Category *</label>
                <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Payment Mode</label>
                <div className="flex gap-2">
                  {PAYMENT_MODES.map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, paymentMode: m }))}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${form.paymentMode === m ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                      {PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPanel(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
