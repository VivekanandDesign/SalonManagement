import { useState, useEffect } from 'react';
import { Gift, Plus, CreditCard, Clock, Check, Search, X } from 'lucide-react';
import { wallet, giftVouchers, customers as customersApi } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';
const tabCls = 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap';
const tabActive = 'bg-primary-50 text-primary-700 border-primary-200';
const tabInactive = 'text-surface-500 border-surface-200 hover:bg-surface-50';

const voucherBadge = { ACTIVE: 'active', REDEEMED: 'completed', EXPIRED: 'cancelled' };

export default function WalletPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('wallet');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const { addToast } = useToast();

  useEffect(() => { loadVouchers(); }, []);

  async function loadVouchers() {
    try {
      const res = await giftVouchers.list();
      setVouchers(res.data || []);
    } catch { /* */ }
    setLoading(false);
  }

  async function loadWallet(customerId) {
    try {
      const res = await wallet.get(customerId);
      setWalletData(res);
    } catch { setWalletData(null); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Wallet & Gift Vouchers" description="Manage prepaid credits and gift cards"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowTopUp(true)}><CreditCard size={16} /> Top Up</Button>
            <Button variant="outline" onClick={() => setShowVoucherModal(true)}><Gift size={16} /> Create Voucher</Button>
          </div>
        } />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[{ key: 'wallet', label: 'Wallet Lookup', icon: CreditCard }, { key: 'vouchers', label: `Gift Vouchers (${vouchers.length})`, icon: Gift }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`${tabCls} ${tab === t.key ? tabActive : tabInactive}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'wallet' && (
        <div>
          <CustomerSearch onSelect={(c) => { setSelectedCustomer(c); loadWallet(c.id); }} />
          {walletData && selectedCustomer && (
            <Card className="mt-4">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-surface-800 truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-surface-500">{selectedCustomer.phone}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-surface-500">Balance</p>
                    <p className="text-2xl font-bold text-green-600">₹{Math.round(walletData.balance)}</p>
                  </div>
                </div>
                <h4 className="text-sm font-medium text-surface-700 mb-2">Recent Transactions</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {walletData.transactions?.map(t => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:justify-between text-sm py-1.5 border-b border-surface-50 gap-0.5">
                      <div className="min-w-0">
                        <span className={`font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount)}
                        </span>
                        <span className="text-surface-500 ml-2 text-xs truncate">{t.description}</span>
                      </div>
                      <span className="text-xs text-surface-400 shrink-0">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {walletData.transactions?.length === 0 && <p className="text-sm text-surface-400">No transactions yet</p>}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="space-y-3">
          {vouchers.length === 0 ? <EmptyState icon={Gift} title="No gift vouchers" description="Create your first gift voucher" /> :
            vouchers.map(v => (
              <Card key={v.id}>
                <div className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-surface-800">{v.code}</p>
                    <p className="text-xs text-surface-500 truncate">
                      {v.recipientName && `To: ${v.recipientName}`}
                      {v.purchaser && ` · From: ${v.purchaser.name}`}
                    </p>
                    <p className="text-xs text-surface-400">Expires: {new Date(v.expiresAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                    <Badge status={voucherBadge[v.status] || 'pending'} label={v.status} />
                    <p className="text-sm">₹{v.balance} <span className="text-surface-400">/ ₹{v.amount}</span></p>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} onSave={() => { if (selectedCustomer) loadWallet(selectedCustomer.id); setShowTopUp(false); }} />}
      {showVoucherModal && <VoucherModal onClose={() => setShowVoucherModal(false)} onSave={() => { loadVouchers(); setShowVoucherModal(false); }} />}
    </div>
  );
}

function CustomerSearch({ onSelect }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  async function handleSearch(q) {
    setSearch(q);
    if (q.length >= 2) {
      const res = await customersApi.search(q);
      setResults(res.data || []);
    } else setResults([]);
  }

  return (
    <div className="relative max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input className={`${inputCls} !pl-9`} placeholder="Search customer by name or phone..." value={search} onChange={e => handleSearch(e.target.value)} />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} onClick={() => { onSelect(c); setResults([]); setSearch(c.name); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 flex justify-between">
              <span className="truncate">{c.name}</span><span className="text-surface-400 shrink-0 ml-2">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopUpModal({ onClose, onSave }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSearch(q) {
    setSearch(q);
    if (q.length >= 2) {
      const res = await customersApi.search(q);
      setResults(res.data || []);
    } else setResults([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerId || !amount) return;
    setSaving(true);
    try {
      await wallet.topUp({ customerId, amount: parseFloat(amount) });
      addToast(`₹${amount} added to wallet`, 'success');
      onSave();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Top Up Wallet</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Customer *</label>
              {customerId ? (
                <div className="flex items-center gap-2 p-2.5 bg-surface-50 rounded-lg border border-surface-200 text-sm">
                  <span className="truncate">{customerName}</span>
                  <button type="button" onClick={() => { setCustomerId(''); setCustomerName(''); }} className="text-surface-400 hover:text-red-500 ml-auto shrink-0"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <input className={inputCls} placeholder="Search customer by name or phone..." value={search} onChange={e => handleSearch(e.target.value)} />
                  {results.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {results.map(c => (
                        <button type="button" key={c.id} onClick={() => { setCustomerId(c.id); setCustomerName(`${c.name} (${c.phone})`); setResults([]); setSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50">{c.name} — {c.phone}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Amount (₹) *</label>
              <input type="number" className={inputCls} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map(a => (
                <button type="button" key={a} onClick={() => setAmount(String(a))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${amount === String(a) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>₹{a}</button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Processing...' : 'Top Up'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}

function VoucherModal({ onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', recipientName: '', recipientPhone: '', message: '', expiresInDays: 365 });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await giftVouchers.create({ ...form, amount: parseFloat(form.amount), expiresInDays: parseInt(form.expiresInDays) });
      addToast(`Voucher created: ${res.code}`, 'success');
      onSave();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Create Gift Voucher</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Voucher Amount (₹) *</label>
              <input type="number" className={inputCls} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map(a => (
                <button type="button" key={a} onClick={() => setForm({ ...form, amount: String(a) })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${form.amount === String(a) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>₹{a}</button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Recipient Name</label>
              <input className={inputCls} placeholder="Who is this for?" value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Recipient Phone</label>
              <input className={inputCls} placeholder="Phone number" value={form.recipientPhone} onChange={e => setForm({ ...form, recipientPhone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Gift Message</label>
              <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Add a personal message..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Valid for (days)</label>
              <input type="number" className={inputCls} value={form.expiresInDays} onChange={e => setForm({ ...form, expiresInDays: e.target.value })} />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create Voucher'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
