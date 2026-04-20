import { useState, useEffect, useRef } from 'react';
import { Receipt, Plus, Download, Filter, Eye, Printer, Share2, X, Search, User, Scissors, CreditCard, Tag, Percent, IndianRupee, CheckCircle, Ticket, ChevronRight, Banknote, Smartphone, Clock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Card, CardHeader } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { invoices as invoicesApi, services as servicesApi, staff as staffApi, customers as customersApi, campaigns as campaignsApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Pending'];

function mapInvoice(inv) {
  return {
    id: inv.invoiceNumber || inv.id,
    rawId: inv.id,
    customer: inv.customer?.name || '',
    customerId: inv.customer?.id || '',
    phone: inv.customer?.phone || '',
    services: (inv.items || []).map(i => i.service?.name).filter(Boolean),
    stylist: inv.appointment?.stylist?.name || '',
    subtotal: inv.subtotal || 0,
    discountType: inv.discountType || 'none',
    discountValue: inv.discountValue || 0,
    discount: inv.discountType === 'percentage' ? Math.round((inv.subtotal || 0) * (inv.discountValue || 0) / 100) : (inv.discountValue || 0),
    total: inv.totalAmount || 0,
    paymentMode: inv.paymentMode || 'Cash',
    date: inv.createdAt ? inv.createdAt.slice(0, 10) : '',
    status: inv.paymentStatus === 'PAID' ? 'completed' : 'pending',
    _servicePrices: Object.fromEntries((inv.items || []).map(i => [i.service?.name, i.price])),
  };
}

const emptyForm = { customer: '', customerId: '', services: [], stylist: '', stylistId: '', discountType: 'none', discountValue: 0, paymentMode: 'Cash', couponCode: '', couponDiscount: 0, couponApplied: false };

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [stylistsList, setStylistsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { salonName, gstNumber, phone: salonPhone, tagline } = useSettings();

  useEffect(() => {
    async function load() {
      try {
        const [invRes, svcRes, staffRes, custRes] = await Promise.all([
          invoicesApi.list({ limit: 200 }), servicesApi.list(), staffApi.list(), customersApi.list({ limit: 200 }),
        ]);
        setInvoices((invRes.data || []).map(mapInvoice));
        setServicesList((svcRes.data || []).map(s => ({ id: s.id, name: s.name, price: s.price })));
        setStylistsList((staffRes.data || []).filter(s => s.role === 'STYLIST').map(s => ({ id: s.id, name: s.name })));
        setCustomersList((custRes.data || []).map(c => ({ id: c.id, name: c.name })));
      } catch (err) { console.error('Failed to load billing:', err); toast.error(err.message || 'Failed to load billing data'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('all');
  const [waModal, setWaModal] = useState({ open: false, customer: null, vars: {} });
  const [customerSearch, setCustomerSearch] = useState('');
  const [svcSearch, setSvcSearch] = useState('');
  const panelRef = useRef(null);

  const filteredCustomers = customersList.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredSvcList = servicesList.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()));

  const filtered = invoices.filter(inv => filterStatus === 'all' || inv.status === filterStatus);



  const SERVICES_PRICES = Object.fromEntries(servicesList.map(s => [s.name, s.price]));

  const subtotal = form.services.reduce((sum, s) => sum + (SERVICES_PRICES[s] || 0), 0);
  const discount = form.discountType === 'flat' ? Number(form.discountValue) : form.discountType === 'percentage' ? Math.round(subtotal * Number(form.discountValue) / 100) : 0;
  const couponDiscount = form.couponDiscount || 0;
  const total = Math.max(0, subtotal - discount - couponDiscount);

  const [couponLoading, setCouponLoading] = useState(false);
  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const serviceIds = form.services.map(name => servicesList.find(s => s.name === name)?.id).filter(Boolean);
      const res = await campaignsApi.validateCoupon({ couponCode: form.couponCode.trim().toUpperCase(), billAmount: subtotal - discount, serviceIds });
      if (res.valid) {
        setForm(f => ({ ...f, couponDiscount: res.discount, couponApplied: true }));
        toast.success(`Coupon applied! ₹${res.discount} off`);
      } else {
        toast.error(res.message || 'Invalid coupon');
        setForm(f => ({ ...f, couponDiscount: 0, couponApplied: false }));
      }
    } catch (err) {
      toast.error(err.message || 'Invalid coupon code');
      setForm(f => ({ ...f, couponDiscount: 0, couponApplied: false }));
    }
    setCouponLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setCustomerSearch(''); setSvcSearch(''); setShowModal(true); };
  const openView = (inv) => { setViewing(inv); setShowView(true); };

  const toggleService = (svc) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc) ? prev.services.filter(s => s !== svc) : [...prev.services, svc]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const selCustomer = customersList.find(c => c.name === form.customer);
      const items = form.services.map(svcName => {
        const svc = servicesList.find(s => s.name === svcName);
        return svc ? { serviceId: svc.id, price: svc.price, quantity: 1 } : null;
      }).filter(Boolean);
      const payload = {
        customerId: selCustomer?.id, items, subtotal, discountType: form.discountType === 'none' ? null : form.discountType,
        discountValue: form.discountType === 'none' ? 0 : Number(form.discountValue), totalAmount: total,
        paymentMode: form.paymentMode.toUpperCase(), paymentStatus: form.paymentMode === 'Pending' ? 'DUE' : 'PAID',
        couponCode: form.couponApplied ? form.couponCode : undefined,
        couponDiscount: form.couponApplied ? couponDiscount : undefined,
      };
      const res = await invoicesApi.create(payload);
      const newInv = {
        id: res.invoiceNumber || res.id, rawId: res.id, customer: form.customer, services: form.services,
        stylist: form.stylist, subtotal, discountType: form.discountType, discountValue: Number(form.discountValue),
        discount, total, paymentMode: form.paymentMode, date: new Date().toISOString().slice(0, 10),
        status: form.paymentMode === 'Pending' ? 'pending' : 'completed',
      };
      setInvoices(prev => [newInv, ...prev]);
      toast.success('Invoice created');
    } catch (err) { toast.error(err.message || 'Failed to create invoice'); return; }
    setShowModal(false);
  };

  const markPaid = async (id) => {
    const inv = invoices.find(i => i.id === id);
    try {
      await invoicesApi.updatePayment(inv?.rawId || id, { paymentMode: 'CASH', paymentStatus: 'PAID' });
      toast.success('Invoice marked as paid');
    } catch (err) { console.error(err); toast.error(err.message || 'Failed to update payment'); }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'completed', paymentMode: 'Cash' } : i));
  };

  const exportCSV = () => {
    const header = 'Invoice,Customer,Services,Stylist,Subtotal,Discount,Total,Payment,Date,Status\n';
    const rows = invoices.map(i => `${i.id},${i.customer},"${i.services.join('; ')}",${i.stylist},${i.subtotal},${i.discount},${i.total},${i.paymentMode},${i.date},${i.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = (inv) => {
    const w = window.open('', '_blank', 'width=420,height=600');
    const html = `<!DOCTYPE html><html><head><title>${inv.id}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;padding:32px 28px;color:#1e293b;max-width:400px;margin:0 auto}
.header{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:16px;margin-bottom:16px}
.header h1{font-size:20px;font-weight:800;letter-spacing:-0.5px}.header p{font-size:11px;color:#64748b;margin-top:2px}
.meta{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:16px}
.meta span{font-weight:600;color:#1e293b}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th,td{text-align:left;padding:6px 0;font-size:12px}th{color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0}
td{border-bottom:1px solid #f1f5f9}.amt{text-align:right}
.totals{border-top:2px solid #1e293b;padding-top:10px;margin-top:4px}
.totals .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
.totals .total{font-size:16px;font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px}
.footer{text-align:center;margin-top:24px;padding-top:16px;border-top:1px dashed #cbd5e1}
.footer p{font-size:10px;color:#94a3b8}
.badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px}
.paid{background:#f0fdf4;color:#16a34a}.pending{background:#fffbeb;color:#d97706}
@media print{body{padding:20px}button{display:none!important}}
</style></head><body>
<div class="header"><h1>${salonName}</h1><p>${tagline}</p><p>${gstNumber ? 'GST: ' + gstNumber + ' | ' : ''}Ph: ${salonPhone || ''}</p></div>
<div class="meta"><div>Invoice: <span>${inv.id}</span></div><div>Date: <span>${inv.date}</span></div></div>
<div class="meta"><div>Customer: <span>${inv.customer}</span></div><div>Stylist: <span>${inv.stylist}</span></div></div>
<div class="meta"><div>Status: <span class="badge ${inv.status === 'completed' ? 'paid' : 'pending'}">${inv.status === 'completed' ? 'PAID' : 'PENDING'}</span></div><div>Payment: <span>${inv.paymentMode}</span></div></div>
<table><thead><tr><th>Service</th><th class="amt">Amount</th></tr></thead><tbody>
${inv.services.map(s => `<tr><td>${s}</td><td class="amt">\u20B9${(SERVICES_PRICES[s] || 0).toLocaleString()}</td></tr>`).join('')}
</tbody></table>
<div class="totals"><div class="row"><span>Subtotal</span><span>\u20B9${inv.subtotal.toLocaleString()}</span></div>
${inv.discount > 0 ? `<div class="row"><span>Discount${inv.discountType === 'percentage' ? ` (${inv.discountValue}%)` : ''}</span><span style="color:#dc2626">-\u20B9${inv.discount.toLocaleString()}</span></div>` : ''}
<div class="row total"><span>Total</span><span>\u20B9${inv.total.toLocaleString()}</span></div></div>
<div class="footer"><p>Thank you for visiting ${salonName}!</p><p>We look forward to seeing you again.</p><p style="margin-top:10px">This is a computer generated invoice.</p></div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const shareWhatsApp = (inv) => {
    setWaModal({
      open: true,
      customer: { id: inv.customerId, name: inv.customer, phone: inv.phone },
      vars: {
        invoiceId: inv.id,
        date: inv.date,
        service: inv.services.join(', '),
        stylist: inv.stylist,
        total: inv.total.toLocaleString(),
        status: inv.status === 'completed' ? 'PAID' : 'PENDING',
        paymentMode: inv.paymentMode,
      },
    });
  };

  return (
    <div>
      <PageHeader title="Billing & Payments" description="Invoices, payments, and revenue tracking"
        actions={<><Button variant="outline" onClick={exportCSV}><Download size={16} /> Export CSV</Button><Button onClick={openAdd}><Plus size={16} /> New Invoice</Button></>} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-surface-700">Invoices</h2>
            <div className="flex gap-1">
              {['all', 'completed', 'pending'].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors capitalize
                    ${filterStatus === f ? 'bg-primary-50 text-primary-700 border-primary-200' : 'text-surface-500 border-surface-200 hover:bg-surface-50'}`}>{f}</button>
              ))}
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left">
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Invoice</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Customer</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden lg:table-cell">Services</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden xl:table-cell">Stylist</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Amount</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden xl:table-cell">Discount</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Total</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Payment</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Status</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                  <td className="px-3 sm:px-5 py-3 font-mono text-xs text-primary-600">{inv.id}</td>
                  <td className="px-3 sm:px-5 py-3 font-medium text-surface-700">{inv.customer}</td>
                  <td className="px-5 py-3 text-surface-500 hidden lg:table-cell">{inv.services.join(', ')}</td>
                  <td className="px-5 py-3 text-surface-500 hidden xl:table-cell">{inv.stylist}</td>
                  <td className="px-5 py-3 text-surface-600 hidden md:table-cell">{'₹'}{inv.subtotal}</td>
                  <td className="px-5 py-3 text-surface-400 hidden xl:table-cell">{inv.discount ? `₹${inv.discount}` : '—'}</td>
                  <td className="px-3 sm:px-5 py-3 text-surface-700 font-semibold">{'₹'}{inv.total}</td>
                  <td className="px-5 py-3 hidden md:table-cell"><span className={`text-xs font-medium ${inv.paymentMode === 'Pending' ? 'text-warning-600' : 'text-surface-600'}`}>{inv.paymentMode}</span></td>
                  <td className="px-3 sm:px-5 py-3"><Badge status={inv.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(inv)}><Eye size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => printInvoice(inv)} title="Print"><Printer size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => shareWhatsApp(inv)} title="Share via WhatsApp"><Share2 size={14} className="text-green-600" /></Button>
                      {inv.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => markPaid(inv.id)} className="text-success-600">Pay</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Create Invoice Slide-Over Panel ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity" onClick={() => setShowModal(false)} />
          {/* Panel */}
          <div ref={panelRef} className="relative w-full max-w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-gradient-to-r from-primary-50 to-white">
              <div>
                <h2 className="text-lg font-bold text-surface-800 flex items-center gap-2"><Receipt size={20} className="text-primary-500" /> New Invoice</h2>
                <p className="text-xs text-surface-400 mt-0.5">Create and generate a new invoice</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">

                {/* Step 1: Customer */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 mb-2"><User size={14} className="text-primary-400" /> Customer <span className="text-red-400">*</span></label>
                  {form.customer ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50/60 border border-primary-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">{form.customer.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-semibold text-surface-800">{form.customer}</p>
                          <p className="text-[11px] text-surface-400">Selected customer</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setForm({...form, customer: '', customerId: ''}); setCustomerSearch(''); }} className="p-1.5 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-600 transition-colors"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-surface-300" />
                        <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search customer by name..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 bg-surface-50/50" autoFocus />
                      </div>
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-surface-100 divide-y divide-surface-50">
                        {filteredCustomers.length === 0 ? (
                          <p className="text-xs text-surface-400 text-center py-4">No customers found</p>
                        ) : filteredCustomers.slice(0, 8).map(c => (
                          <button key={c.id} type="button" onClick={() => { setForm({...form, customer: c.name, customerId: c.id}); setCustomerSearch(''); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary-50/50 transition-colors text-left">
                            <div className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center text-surface-500 font-semibold text-xs">{c.name.charAt(0)}</div>
                            <span className="text-sm text-surface-700">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Stylist */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 mb-2"><Scissors size={14} className="text-primary-400" /> Stylist <span className="text-red-400">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {stylistsList.map(s => (
                      <button key={s.id} type="button" onClick={() => setForm({...form, stylist: s.name, stylistId: s.id})}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-all
                          ${form.stylist === s.name ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-200' : 'bg-white text-surface-600 border-surface-200 hover:border-primary-200 hover:bg-primary-50/50'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${form.stylist === s.name ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'}`}>{s.name.charAt(0)}</div>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Services */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-surface-700"><Tag size={14} className="text-primary-400" /> Services <span className="text-red-400">*</span></span>
                    {form.services.length > 0 && <span className="text-xs font-semibold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">{form.services.length} selected</span>}
                  </label>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-2.5 text-surface-300" />
                    <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)} placeholder="Search services..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 bg-surface-50/50" />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {filteredSvcList.map(svc => {
                      const selected = form.services.includes(svc.name);
                      return (
                        <button key={svc.id} type="button" onClick={() => toggleService(svc.name)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-left
                            ${selected ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-100' : 'bg-white border-surface-100 hover:border-surface-200 hover:bg-surface-50/50'}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${selected ? 'bg-primary-500' : 'border border-surface-300'}`}>
                              {selected && <CheckCircle size={12} className="text-white" />}
                            </div>
                            <span className={`text-sm ${selected ? 'font-semibold text-surface-800' : 'text-surface-600'}`}>{svc.name}</span>
                          </div>
                          <span className={`text-sm font-semibold ${selected ? 'text-primary-600' : 'text-surface-400'}`}>₹{svc.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 4: Discount */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 mb-2"><Percent size={14} className="text-primary-400" /> Discount</label>
                  <div className="flex gap-2">
                    <div className="flex rounded-xl border border-surface-200 overflow-hidden">
                      {[{ val: 'none', lbl: 'None' }, { val: 'flat', lbl: '₹ Flat' }, { val: 'percentage', lbl: '% Off' }].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setForm({...form, discountType: opt.val, discountValue: 0})}
                          className={`px-3.5 py-2 text-xs font-medium transition-colors ${form.discountType === opt.val ? 'bg-primary-500 text-white' : 'bg-white text-surface-500 hover:bg-surface-50'}`}>
                          {opt.lbl}
                        </button>
                      ))}
                    </div>
                    {form.discountType !== 'none' && (
                      <input type="number" min={0} max={form.discountType === 'percentage' ? 100 : subtotal} value={form.discountValue}
                        onChange={e => setForm({...form, discountValue: e.target.value})}
                        placeholder={form.discountType === 'flat' ? 'Amount' : '%'}
                        className="w-24 px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-center font-semibold" />
                    )}
                  </div>
                </div>

                {/* Step 5: Coupon */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 mb-2"><Ticket size={14} className="text-primary-400" /> Coupon Code</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input value={form.couponCode} onChange={e => setForm({...form, couponCode: e.target.value.toUpperCase(), couponDiscount: 0, couponApplied: false})}
                        className="w-full px-3.5 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono uppercase tracking-wider bg-surface-50/50"
                        placeholder="ENTER CODE" disabled={form.couponApplied} />
                    </div>
                    {form.couponApplied ? (
                      <button type="button" onClick={() => setForm({...form, couponCode: '', couponDiscount: 0, couponApplied: false})}
                        className="px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">Remove</button>
                    ) : (
                      <button type="button" onClick={applyCoupon} disabled={!form.couponCode.trim() || couponLoading || subtotal === 0}
                        className="px-4 py-2 text-xs font-medium bg-surface-800 text-white rounded-xl hover:bg-surface-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {form.couponApplied && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600 font-medium"><CheckCircle size={12} /> Coupon applied — ₹{couponDiscount} discount</div>
                  )}
                </div>

                {/* Step 6: Payment Mode */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 mb-2"><CreditCard size={14} className="text-primary-400" /> Payment Mode <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 'Cash', Icon: Banknote, color: 'emerald' },
                      { val: 'UPI', Icon: Smartphone, color: 'violet' },
                      { val: 'Card', Icon: CreditCard, color: 'blue' },
                      { val: 'Pending', Icon: Clock, color: 'amber' },
                    ].map(m => (
                      <button key={m.val} type="button" onClick={() => setForm({...form, paymentMode: m.val})}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-center
                          ${form.paymentMode === m.val ? `border-${m.color}-400 bg-${m.color}-50 shadow-sm` : 'border-surface-100 bg-white hover:border-surface-200 hover:bg-surface-50'}`}>
                        <m.Icon size={20} className={form.paymentMode === m.val ? `text-${m.color}-500` : 'text-surface-400'} />
                        <span className={`text-xs font-semibold ${form.paymentMode === m.val ? `text-${m.color}-700` : 'text-surface-500'}`}>{m.val}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            {/* Fixed Footer — Bill Summary + Actions */}
            <div className="border-t border-surface-100 bg-surface-50/80 backdrop-blur-sm">
              {/* Live Bill Summary */}
              <div className="px-6 py-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Subtotal ({form.services.length} items)</span>
                  <span className="text-surface-700 font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-400">Discount {form.discountType === 'percentage' ? `(${form.discountValue}%)` : ''}</span>
                    <span className="text-red-500 font-medium">-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-400">Coupon <span className="font-mono text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">{form.couponCode}</span></span>
                    <span className="text-green-600 font-medium">-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-surface-200">
                  <span className="text-base font-bold text-surface-800">Total</span>
                  <span className="text-xl font-black text-surface-900">₹{total.toLocaleString()}</span>
                </div>
              </div>
              {/* Action buttons */}
              <div className="px-6 pb-5 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">Cancel</button>
                <button type="submit" onClick={handleSave} disabled={!form.customer || !form.stylist || form.services.length === 0}
                  className="flex-[2] px-4 py-3 text-sm font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2">
                  <Receipt size={16} /> Generate Invoice <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      <Modal isOpen={showView} onClose={() => setShowView(false)} title="Invoice Details" size="md">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <p className="font-mono text-sm text-primary-600">{viewing.id}</p>
                <p className="text-xs text-surface-400">Date: {viewing.date}</p>
              </div>
              <Badge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-surface-400">Customer:</span> <span className="font-medium text-surface-700">{viewing.customer}</span></div>
              <div><span className="text-surface-400">Stylist:</span> <span className="font-medium text-surface-700">{viewing.stylist}</span></div>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-700 mb-2">Services:</p>
              {viewing.services.map(s => (
                <div key={s} className="flex justify-between text-sm py-1">
                  <span className="text-surface-600">{s}</span>
                  <span className="text-surface-700">{'\u20B9'}{SERVICES_PRICES[s] || 0}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-surface-500">Subtotal</span><span>{'\u20B9'}{viewing.subtotal}</span></div>
              {viewing.discount > 0 && <div className="flex justify-between text-sm"><span className="text-surface-500">Discount</span><span className="text-danger-600">-{'\u20B9'}{viewing.discount}</span></div>}
              <div className="flex justify-between text-base font-semibold border-t border-surface-200 pt-1"><span>Total</span><span>{'\u20B9'}{viewing.total}</span></div>
              <div className="flex justify-between text-xs pt-1"><span className="text-surface-400">Payment</span><span className={viewing.paymentMode === 'Pending' ? 'text-warning-600' : 'text-surface-600'}>{viewing.paymentMode}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => printInvoice(viewing)}><Printer size={14} /> Print</Button>
              {viewing.status === 'pending' && <Button onClick={() => { markPaid(viewing.id); setShowView(false); }}>Mark as Paid</Button>}
              <Button variant="outline" onClick={() => setShowView(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, customer: null, vars: {} })}
        customer={waModal.customer}
        template="invoice"
        templateVars={waModal.vars}
      />
    </div>
  );
}
