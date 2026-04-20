import { useState, useEffect } from 'react';
import { Share2, Users, TrendingUp, Gift, CheckCircle, X } from 'lucide-react';
import { referrals, customers as customersApi } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

export default function ReferralsPage() {
  const [referralList, setReferralList] = useState([]);
  const [stats, setStats] = useState({ total: 0, converted: 0, conversionRate: 0, totalRewardsPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [listRes, statsRes] = await Promise.all([referrals.list(), referrals.stats()]);
      setReferralList(listRes.data || []);
      setStats(statsRes);
    } catch { addToast('Failed to load', 'error'); }
    setLoading(false);
  }

  async function handleConvert(id) {
    try {
      await referrals.convert(id);
      addToast('Referral converted — rewards credited!', 'success');
      loadData();
    } catch (err) { addToast(err.message, 'error'); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Referral Rewards" description="Track and reward customer referrals"
        actions={<Button onClick={() => setShowModal(true)}><Share2 size={16} /> Record Referral</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Referrals" value={stats.total} icon={Share2} />
        <StatCard label="Converted" value={stats.converted} icon={CheckCircle} />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={TrendingUp} />
        <StatCard label="Rewards Paid" value={`₹${Math.round(stats.totalRewardsPaid).toLocaleString()}`} icon={Gift} />
      </div>

      <div className="space-y-3">
        {referralList.length === 0 ? <EmptyState icon={Share2} title="No referrals yet" description="Record referrals when customers bring friends" /> :
          referralList.map(r => (
            <Card key={r.id} className="hover:shadow-card-hover transition-shadow">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs text-surface-500">Referrer</p>
                    <p className="font-medium text-surface-800 truncate">{r.referrer?.name || '—'}</p>
                  </div>
                  <span className="text-surface-300 hidden sm:inline">→</span>
                  <div className="min-w-0">
                    <p className="text-xs text-surface-500">Referred</p>
                    <p className="font-medium text-surface-800 truncate">{r.referred?.name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.referrerReward && <span className="text-xs text-surface-500">₹{r.referrerReward} each</span>}
                  {r.isConverted ? (
                    <Badge status="completed" label="Converted" />
                  ) : (
                    <Button size="sm" onClick={() => handleConvert(r.id)}><CheckCircle size={14} /> Convert</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
      </div>

      {showModal && <ReferralModal onClose={() => setShowModal(false)} onSave={loadData} />}
    </div>
  );
}

function ReferralModal({ onClose, onSave }) {
  const [referrerSearch, setReferrerSearch] = useState('');
  const [referredSearch, setReferredSearch] = useState('');
  const [referrerResults, setReferrerResults] = useState([]);
  const [referredResults, setReferredResults] = useState([]);
  const [referrerId, setReferrerId] = useState('');
  const [referredId, setReferredId] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referredName, setReferredName] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function search(q, setter) {
    if (q.length >= 2) {
      const res = await customersApi.search(q);
      setter(res.data || []);
    } else setter([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!referrerId || !referredId) return;
    setSaving(true);
    try {
      await referrals.create({ referrerId, referredId });
      addToast('Referral recorded', 'success');
      onSave(); onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Record Referral</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Referrer (existing customer)</label>
              {referrerId ? (
                <div className="p-2.5 bg-surface-50 rounded-lg text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{referrerName}</span>
                  <button type="button" onClick={() => { setReferrerId(''); setReferrerName(''); }} className="text-surface-400 hover:text-red-500 shrink-0">×</button>
                </div>
              ) : (
                <div className="relative">
                  <input className={inputCls} placeholder="Search by name or phone..." value={referrerSearch} onChange={e => { setReferrerSearch(e.target.value); search(e.target.value, setReferrerResults); }} />
                  {referrerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {referrerResults.map(c => (
                        <button type="button" key={c.id} onClick={() => { setReferrerId(c.id); setReferrerName(`${c.name} (${c.phone})`); setReferrerResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50">{c.name} — {c.phone}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Referred (new customer)</label>
              {referredId ? (
                <div className="p-2.5 bg-surface-50 rounded-lg text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{referredName}</span>
                  <button type="button" onClick={() => { setReferredId(''); setReferredName(''); }} className="text-surface-400 hover:text-red-500 shrink-0">×</button>
                </div>
              ) : (
                <div className="relative">
                  <input className={inputCls} placeholder="Search by name or phone..." value={referredSearch} onChange={e => { setReferredSearch(e.target.value); search(e.target.value, setReferredResults); }} />
                  {referredResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {referredResults.map(c => (
                        <button type="button" key={c.id} onClick={() => { setReferredId(c.id); setReferredName(`${c.name} (${c.phone})`); setReferredResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50">{c.name} — {c.phone}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving || !referrerId || !referredId}>{saving ? 'Saving...' : 'Record Referral'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
