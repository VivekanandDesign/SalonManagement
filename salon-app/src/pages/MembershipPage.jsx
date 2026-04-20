import { useState, useEffect } from 'react';
import { Crown, Plus, X, Users, CreditCard, Calendar, Check, Trash2 } from 'lucide-react';
import { memberships, customers as customersApi } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export default function MembershipPage() {
  const [plans, setPlans] = useState([]);
  const [customerMemberships, setCustomerMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('plans');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, memberRes] = await Promise.all([
        memberships.listPlans(),
        memberships.list({ active: 'true' }),
      ]);
      setPlans(plansRes.data || []);
      setCustomerMemberships(memberRes.data || []);
    } catch { addToast('Failed to load', 'error'); }
    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Membership Plans" description="Manage subscription plans and customer memberships"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => { setEditPlan(null); setShowPlanModal(true); }}><Plus size={16} /> New Plan</Button>
            <Button variant="outline" onClick={() => setShowAssignModal(true)}><Users size={16} /> Assign</Button>
          </div>
        } />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Crown} label="Total Plans" value={plans.length} />
        <StatCard icon={Users} label="Active Members" value={customerMemberships.length} />
        <StatCard icon={CreditCard} label="Active Plans" value={plans.filter(p => p.isActive).length} />
        <StatCard icon={Calendar} label="Expiring Soon" value={customerMemberships.filter(m => { const d = new Date(m.endDate); const now = new Date(); return d - now < 7 * 86400000 && d > now; }).length} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'plans', label: 'Plans', icon: Crown },
          { key: 'active', label: `Active Members (${customerMemberships.length})`, icon: Users },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-primary-50 text-primary-700 border-primary-200' : 'text-surface-500 border-surface-200 hover:bg-surface-50'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={Crown} title="No plans yet" description="Create your first membership plan" />
            </div>
          ) : plans.map(plan => (
            <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 mr-3">
                    <h3 className="font-semibold text-surface-800 truncate">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-surface-500 mt-1 line-clamp-2">{plan.description}</p>}
                  </div>
                  <span className="text-lg font-bold text-primary-600 flex-shrink-0">₹{plan.price}</span>
                </div>
                <div className="text-xs text-surface-500 mb-3 flex items-center gap-1">
                  <Calendar size={12} /> {plan.durationDays} days
                </div>
                {plan.services?.length > 0 && (
                  <div className="space-y-1 mb-4">
                    <p className="text-xs font-medium text-surface-600">Included Services:</p>
                    {plan.services.map(s => (
                      <div key={s.id} className="flex justify-between text-xs text-surface-500">
                        <span className="truncate mr-2">{s.service?.name}</span>
                        <span className="flex-shrink-0">{s.usageLimit === 0 ? 'Unlimited' : `${s.usageLimit}x`}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-surface-100">
                  <Button size="sm" variant="outline" onClick={() => { setEditPlan(plan); setShowPlanModal(true); }}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={async () => { try { await memberships.deletePlan(plan.id); addToast('Plan deleted', 'success'); loadData(); } catch (err) { addToast(err.message, 'error'); } }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-3">
          {customerMemberships.length === 0 ? (
            <EmptyState icon={Users} title="No active members" description="Assign a membership to get started" />
          ) : customerMemberships.map(m => (
            <Card key={m.id}>
              <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-surface-800">{m.customer?.name}</p>
                    <span className="text-xs text-surface-400">{m.customer?.phone}</span>
                  </div>
                  <p className="text-sm text-primary-600 mt-0.5">{m.plan?.name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {new Date(m.startDate).toLocaleDateString()} — {new Date(m.endDate).toLocaleDateString()}
                    {m.autoRenew && <span className="ml-2 text-green-600 font-medium">Auto-renew</span>}
                  </p>
                </div>
                <Button size="sm" variant="danger" className="self-start sm:self-center flex-shrink-0" onClick={async () => { await memberships.cancel(m.id); loadData(); addToast('Cancelled', 'success'); }}>Cancel</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showPlanModal && <PlanModal plan={editPlan} onClose={() => setShowPlanModal(false)} onSave={loadData} />}
      {showAssignModal && <AssignModal plans={plans} onClose={() => setShowAssignModal(false)} onSave={loadData} />}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({ name: plan?.name || '', description: plan?.description || '', price: plan?.price || '', durationDays: plan?.durationDays || 30 });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (plan) await memberships.updatePlan(plan.id, { ...form, price: parseFloat(form.price), durationDays: parseInt(form.durationDays) });
      else await memberships.createPlan({ ...form, price: parseFloat(form.price), durationDays: parseInt(form.durationDays) });
      addToast(plan ? 'Plan updated' : 'Plan created', 'success');
      onSave();
      onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">{plan ? 'Edit Plan' : 'New Membership Plan'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Plan Name *</label>
              <input className={inputCls} placeholder="e.g. Gold Membership" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Description</label>
              <textarea className={inputCls + ' resize-none'} rows={3} placeholder="What does this plan include?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Price (₹) *</label>
                <input type="number" className={inputCls} placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Duration (days) *</label>
                <input type="number" className={inputCls} value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} required />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[30, 90, 180, 365].map(d => (
                <button type="button" key={d} onClick={() => setForm({ ...form, durationDays: d })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${Number(form.durationDays) === d ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

function AssignModal({ plans, onClose, onSave }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSearch(q) {
    setSearch(q);
    if (q.length >= 2) {
      const res = await customersApi.search(q);
      setResults(res.data || []);
    } else setResults([]);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedCustomer || !planId) return;
    setSaving(true);
    try {
      await memberships.assign({ customerId: selectedCustomer.id, planId });
      addToast('Membership assigned', 'success');
      onSave();
      onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Assign Membership</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleAssign} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Customer *</label>
              {selectedCustomer ? (
                <div className="flex items-center gap-2 p-2.5 bg-surface-50 rounded-lg border border-surface-200">
                  <span className="text-sm flex-1 min-w-0 truncate">{selectedCustomer.name} ({selectedCustomer.phone})</span>
                  <button type="button" onClick={() => setSelectedCustomer(null)} className="p-0.5 rounded hover:bg-surface-200 text-surface-400 hover:text-surface-600 flex-shrink-0"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <input className={inputCls} placeholder="Search customer by name or phone..." value={search} onChange={e => handleSearch(e.target.value)} />
                  {results.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {results.map(c => (
                        <button type="button" key={c.id} onClick={() => { setSelectedCustomer(c); setResults([]); setSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 transition-colors">{c.name} — {c.phone}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Plan *</label>
              <select className={inputCls} value={planId} onChange={e => setPlanId(e.target.value)} required>
                <option value="">Select a plan</option>
                {plans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}/{p.durationDays}d</option>)}
              </select>
            </div>
            {planId && (
              <div className="p-3 bg-primary-50/50 border border-primary-100 rounded-lg">
                <p className="text-xs font-medium text-primary-700">Plan Summary</p>
                {(() => { const p = plans.find(x => x.id === planId); return p ? (
                  <div className="mt-1 text-xs text-primary-600 space-y-0.5">
                    <p>Price: ₹{p.price}</p>
                    <p>Duration: {p.durationDays} days</p>
                    {p.description && <p>{p.description}</p>}
                  </div>
                ) : null; })()}
              </div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}><Check size={16} /> {saving ? 'Assigning...' : 'Assign'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
