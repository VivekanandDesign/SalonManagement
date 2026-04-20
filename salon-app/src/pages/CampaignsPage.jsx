import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Send, Clock, Eye, Edit2, Trash2, Ban, Tag, Copy, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import { campaigns as campaignsApi, services as servicesApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 bg-white text-surface-800 placeholder:text-surface-400';

const STATUS_MAP = { DRAFT: 'pending', SCHEDULED: 'confirmed', SENDING: 'in-progress', SENT: 'completed', CANCELLED: 'cancelled' };
const STATUS_LABELS = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENDING: 'Sending', SENT: 'Sent', CANCELLED: 'Cancelled' };
const AUDIENCE_LABELS = { ALL: 'All Customers', REGULAR: 'Regular', VIP: 'VIP', INACTIVE: 'Inactive (30d+)', NEW: 'New (7d)' };

const DEFAULT_TEMPLATE = `Hi {{name}}! 🎉

Exciting offer from {{salon}}!

Use code *{{coupon}}* to get *{{discount}}*!

Valid till {{validTo}}.

Book your appointment today! 💇‍♀️`;

const emptyForm = {
  name: '', description: '', couponCode: '', discountType: 'percentage', discountValue: '',
  minBillAmount: '', maxDiscount: '', validFrom: new Date().toISOString().slice(0, 10),
  validTo: '', applicableServices: [], targetAudience: 'ALL',
  messageTemplate: DEFAULT_TEMPLATE, scheduledAt: '',
};

function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ORR';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function CampaignsPage() {
  const [campaignsList, setCampaignsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showStats, setShowStats] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const toast = useToast();
  const { salonName } = useSettings();

  const load = useCallback(async () => {
    try {
      const [campRes, svcRes] = await Promise.all([campaignsApi.list(), servicesApi.list()]);
      setCampaignsList(campRes.data || []);
      setServicesList((svcRes.data || []).filter(s => s.isActive !== false));
    } catch (err) { toast.error('Failed to load campaigns'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form handlers ──
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, description: c.description || '', couponCode: c.couponCode,
      discountType: c.discountType, discountValue: c.discountValue,
      minBillAmount: c.minBillAmount || '', maxDiscount: c.maxDiscount || '',
      validFrom: c.validFrom?.slice(0, 10) || '', validTo: c.validTo?.slice(0, 10) || '',
      applicableServices: c.applicableServices ? (typeof c.applicableServices === 'string' ? JSON.parse(c.applicableServices) : c.applicableServices) : [],
      targetAudience: c.targetAudience || 'ALL',
      messageTemplate: c.messageTemplate || DEFAULT_TEMPLATE,
      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.couponCode || !form.discountValue || !form.validFrom || !form.validTo || !form.messageTemplate) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, discountValue: parseFloat(form.discountValue) };
      if (payload.minBillAmount) payload.minBillAmount = parseFloat(payload.minBillAmount);
      if (payload.maxDiscount) payload.maxDiscount = parseFloat(payload.maxDiscount);
      if (!payload.scheduledAt) delete payload.scheduledAt;

      if (editing) {
        await campaignsApi.update(editing.id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignsApi.create(payload);
        toast.success('Campaign created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save campaign');
    }
    setSaving(false);
  };

  const handleSend = async (id) => {
    try {
      const res = await campaignsApi.send(id);
      toast.info(res.message || 'Campaign sending...');
      load();
    } catch (err) { toast.error(err.message || 'Failed to send'); }
    setConfirmAction(null);
  };

  const handleCancel = async (id) => {
    try {
      await campaignsApi.cancel(id);
      toast.success('Campaign cancelled');
      load();
    } catch (err) { toast.error(err.message || 'Failed to cancel'); }
    setConfirmAction(null);
  };

  const handleDelete = async (id) => {
    try {
      await campaignsApi.delete(id);
      toast.success('Campaign deleted');
      load();
    } catch (err) { toast.error(err.message || 'Failed to delete'); }
    setConfirmAction(null);
  };

  const openStats = async (c) => {
    setShowStats(c);
    setStatsLoading(true);
    try {
      const res = await campaignsApi.stats(c.id);
      setStatsData(res);
    } catch (err) { toast.error('Failed to load stats'); }
    setStatsLoading(false);
  };

  // ── Summary stats ──
  const totalCampaigns = campaignsList.length;
  const activeCampaigns = campaignsList.filter(c => ['SCHEDULED', 'SENDING'].includes(c.status)).length;
  const totalSent = campaignsList.reduce((s, c) => s + (c.sentCount || 0), 0);
  const totalRedeemed = campaignsList.reduce((s, c) => s + (c.redeemedCount || 0), 0);

  // ── Preview template ──
  const previewMsg = form.messageTemplate
    .replace(/\{\{name\}\}/g, 'Priya')
    .replace(/\{\{coupon\}\}/g, form.couponCode || 'CODE')
    .replace(/\{\{discount\}\}/g, form.discountType === 'percentage' ? `${form.discountValue || '0'}% off` : `₹${form.discountValue || '0'} off`)
    .replace(/\{\{validFrom\}\}/g, form.validFrom ? new Date(form.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')
    .replace(/\{\{validTo\}\}/g, form.validTo ? new Date(form.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')
    .replace(/\{\{salon\}\}/g, salonName);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Create and manage promotional campaigns"
        actions={<Button onClick={openCreate}><Plus size={16} /> New Campaign</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={totalCampaigns} icon={Megaphone} />
        <StatCard label="Active / Scheduled" value={activeCampaigns} icon={Clock} />
        <StatCard label="Messages Sent" value={totalSent} icon={Send} />
        <StatCard label="Coupons Redeemed" value={totalRedeemed} icon={Tag} />
      </div>

      {/* Campaigns List */}
      {campaignsList.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create your first promotional campaign to reach all customers."
          action={<Button onClick={openCreate}><Plus size={16} /> Create Campaign</Button>}
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Campaign</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500 hidden sm:table-cell">Coupon</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500 hidden md:table-cell">Discount</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500 hidden lg:table-cell">Validity</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500 hidden xl:table-cell">Audience</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-surface-500 hidden md:table-cell">Sent</th>
                    <th className="text-center px-4 py-3 font-medium text-surface-500 hidden lg:table-cell">Redeemed</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignsList.map((c) => (
                    <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-surface-800">{c.name}</div>
                        {c.description && <div className="text-xs text-surface-400 mt-0.5 truncate max-w-[200px]">{c.description}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-xs font-mono font-bold">
                          {c.couponCode}
                          <button onClick={() => { navigator.clipboard.writeText(c.couponCode); toast.success('Copied!'); }} className="hover:text-primary-900"><Copy size={10} /></button>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-700 hidden md:table-cell">
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        {c.maxDiscount ? <span className="text-xs text-surface-400 ml-1">(max ₹{c.maxDiscount})</span> : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-600 hidden lg:table-cell">
                        {new Date(c.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(c.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <Badge status="active" label={AUDIENCE_LABELS[c.targetAudience] || c.targetAudience} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={STATUS_MAP[c.status] || 'pending'} label={STATUS_LABELS[c.status] || c.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-surface-700 hidden md:table-cell">{c.sentCount || 0}</td>
                      <td className="px-4 py-3 text-center text-surface-700 hidden lg:table-cell">{c.redeemedCount || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'SENT' && (
                            <button onClick={() => openStats(c)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors" title="View Stats"><Eye size={14} /></button>
                          )}
                          {['DRAFT', 'SCHEDULED'].includes(c.status) && (
                            <>
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setConfirmAction({ type: 'send', id: c.id, name: c.name })} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Send Now"><Send size={14} /></button>
                            </>
                          )}
                          {['SCHEDULED', 'SENDING'].includes(c.status) && (
                            <button onClick={() => setConfirmAction({ type: 'cancel', id: c.id, name: c.name })} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Cancel"><Ban size={14} /></button>
                          )}
                          {['DRAFT', 'CANCELLED'].includes(c.status) && (
                            <button onClick={() => setConfirmAction({ type: 'delete', id: c.id, name: c.name })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Create / Edit Campaign Slide-out ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-white">
              <div>
                <h2 className="text-base font-semibold text-surface-800">{editing ? 'Edit Campaign' : 'Create Campaign'}</h2>
                <p className="text-xs text-surface-400 mt-0.5">Fill in the details below to set up your campaign</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">

                {/* Section: Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Basic Info</h3>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Campaign Name <span className="text-danger-500">*</span></label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Monsoon Spa Offer" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Internal notes (optional)" />
                  </div>
                </div>

                <hr className="border-surface-100" />

                {/* Section: Coupon & Discount */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Coupon & Discount</h3>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Coupon Code <span className="text-danger-500">*</span></label>
                    <div className="flex gap-2">
                      <input value={form.couponCode} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
                        className={`${inputCls} flex-1 font-mono uppercase tracking-wider`} placeholder="MONSOON20" required />
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, couponCode: generateCouponCode() }))}>
                        Auto Generate
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">Discount Type <span className="text-danger-500">*</span></label>
                      <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className={inputCls}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        {form.discountType === 'percentage' ? 'Percentage' : 'Amount'} <span className="text-danger-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm font-medium">{form.discountType === 'percentage' ? '%' : '₹'}</span>
                        <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                          className={`${inputCls} pl-8`} placeholder={form.discountType === 'percentage' ? '20' : '200'} required min="0" step="any" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">Min Bill Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">₹</span>
                        <input type="number" value={form.minBillAmount} onChange={e => setForm(f => ({ ...f, minBillAmount: e.target.value }))}
                          className={`${inputCls} pl-8`} placeholder="500" min="0" />
                      </div>
                    </div>
                    {form.discountType === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Max Discount Cap</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">₹</span>
                          <input type="number" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                            className={`${inputCls} pl-8`} placeholder="200" min="0" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-surface-100" />

                {/* Section: Validity */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Validity Period</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">Valid From <span className="text-danger-500">*</span></label>
                      <input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">Valid To <span className="text-danger-500">*</span></label>
                      <input type="date" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))} className={inputCls} required />
                    </div>
                  </div>
                </div>

                <hr className="border-surface-100" />

                {/* Section: Target Audience */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Target Audience</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                      <button key={key} type="button"
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150
                          ${form.targetAudience === key
                            ? 'bg-primary-50 text-primary-700 border-primary-200 ring-1 ring-primary-200'
                            : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50 hover:border-surface-300'}`}
                        onClick={() => setForm(f => ({ ...f, targetAudience: key }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-surface-100" />

                {/* Section: Applicable Services */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Applicable Services <span className="font-normal normal-case text-surface-300">(leave empty for all)</span>
                  </h3>
                  {servicesList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                      {servicesList.map(svc => {
                        const selected = form.applicableServices.includes(svc.id);
                        return (
                          <button key={svc.id} type="button"
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150
                              ${selected
                                ? 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50 hover:border-surface-300'}`}
                            onClick={() => setForm(f => ({
                              ...f,
                              applicableServices: selected ? f.applicableServices.filter(id => id !== svc.id) : [...f.applicableServices, svc.id],
                            }))}>
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-surface-400">No services found</p>
                  )}
                </div>

                <hr className="border-surface-100" />

                {/* Section: Schedule */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Schedule <span className="font-normal normal-case text-surface-300">(leave empty to send manually)</span>
                  </h3>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className={inputCls} />
                </div>

                <hr className="border-surface-100" />

                {/* Section: Message Template */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">WhatsApp Message <span className="text-danger-500">*</span></h3>
                  <div>
                    <p className="text-xs text-surface-400 mb-2">Click to insert variables:</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        { tag: '{{name}}', label: 'Name' },
                        { tag: '{{coupon}}', label: 'Coupon' },
                        { tag: '{{discount}}', label: 'Discount' },
                        { tag: '{{validFrom}}', label: 'Valid From' },
                        { tag: '{{validTo}}', label: 'Valid To' },
                        { tag: '{{salon}}', label: 'Salon' },
                      ].map(v => (
                        <button key={v.tag} type="button"
                          className="px-2.5 py-1 text-xs bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 font-medium transition-colors"
                          onClick={() => setForm(f => ({ ...f, messageTemplate: f.messageTemplate + ' ' + v.tag }))}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <textarea value={form.messageTemplate} onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
                      className={`${inputCls} resize-none`} rows={7} required />
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Message Preview</h3>
                  <div className="bg-green-50/70 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Send size={10} className="text-white" />
                      </div>
                      <span className="text-xs font-medium text-green-700">WhatsApp Preview</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm text-sm whitespace-pre-wrap text-surface-700 leading-relaxed">{previewMsg}</div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 bg-white border-t border-surface-200 px-6 py-4 flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Update Campaign' : (form.scheduledAt ? 'Save & Schedule' : 'Save as Draft')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmAction && (
        <Modal isOpen={true} onClose={() => setConfirmAction(null)}
          title={confirmAction.type === 'send' ? 'Send Campaign?' : confirmAction.type === 'cancel' ? 'Cancel Campaign?' : 'Delete Campaign?'}>
          <p className="text-sm text-surface-600 mb-4">
            {confirmAction.type === 'send' && `This will send "${confirmAction.name}" to all target customers via WhatsApp immediately.`}
            {confirmAction.type === 'cancel' && `This will cancel the scheduled campaign "${confirmAction.name}".`}
            {confirmAction.type === 'delete' && `This will permanently delete "${confirmAction.name}". This cannot be undone.`}
          </p>
          <div className="flex gap-3">
            <Button variant={confirmAction.type === 'delete' ? 'danger' : 'primary'} size="sm"
              onClick={() => {
                if (confirmAction.type === 'send') handleSend(confirmAction.id);
                else if (confirmAction.type === 'cancel') handleCancel(confirmAction.id);
                else handleDelete(confirmAction.id);
              }}>
              {confirmAction.type === 'send' ? 'Send Now' : confirmAction.type === 'cancel' ? 'Cancel Campaign' : 'Delete'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Go Back</Button>
          </div>
        </Modal>
      )}

      {/* ── Stats Modal ── */}
      <Modal isOpen={!!showStats} onClose={() => { setShowStats(null); setStatsData(null); }}
        title={showStats ? `Campaign Stats — ${showStats.name}` : ''} size="lg">
        {statsLoading ? <LoadingSpinner /> : statsData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{statsData.stats?.sent || 0}</div>
                <div className="text-xs text-blue-600 mt-0.5">Sent</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{statsData.stats?.delivered || 0}</div>
                <div className="text-xs text-green-600 mt-0.5">Delivered</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{statsData.stats?.failed || 0}</div>
                <div className="text-xs text-red-600 mt-0.5">Failed</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-700">{statsData.stats?.redeemed || 0}</div>
                <div className="text-xs text-purple-600 mt-0.5">Redeemed</div>
              </div>
            </div>

            {(statsData.stats?.revenueGenerated || 0) > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-amber-700">₹{(statsData.stats.revenueGenerated || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-amber-600">Revenue from redeemed coupons</div>
              </div>
            )}

            {statsData.campaign?.logs?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-surface-700 mb-2">Delivery Log</h4>
                <div className="max-h-60 overflow-y-auto border border-surface-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2.5 font-medium text-surface-500">Customer</th>
                        <th className="text-left p-2.5 font-medium text-surface-500">Phone</th>
                        <th className="text-left p-2.5 font-medium text-surface-500">Status</th>
                        <th className="text-left p-2.5 font-medium text-surface-500">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.campaign.logs.map(log => (
                        <tr key={log.id} className="border-t border-surface-100">
                          <td className="p-2.5 text-surface-700">{log.customer?.name}</td>
                          <td className="p-2.5 text-surface-500">{log.customer?.phone}</td>
                          <td className="p-2.5">
                            {log.status === 'SENT' && <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Sent</span>}
                            {log.status === 'FAILED' && <span className="text-red-600 flex items-center gap-1"><XCircle size={10} /> Failed</span>}
                            {log.status === 'DELIVERED' && <span className="text-blue-600 flex items-center gap-1"><CheckCircle size={10} /> Delivered</span>}
                          </td>
                          <td className="p-2.5 text-surface-400">{log.sentAt ? new Date(log.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-surface-500">No stats available.</p>}
      </Modal>
    </div>
  );
}
