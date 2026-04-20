import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Filter, Phone, Mail, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import { messages as messagesApi, customers as customersApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const CHANNELS = ['WhatsApp', 'SMS', 'Email'];
const TEMPLATE_DEFS = [
  { name: 'Appointment Reminder', body: 'Hi {name}, this is a reminder for your appointment at {{salon}} on {date} at {time}. See you soon!' },
  { name: 'Birthday Wish', body: 'Happy Birthday {name}! \ud83c\udf89 Enjoy a special 20% off on all services today at {{salon}}.' },
  { name: 'Follow-up', body: 'Hi {name}, we hope you loved your visit! Book your next appointment and earn loyalty points.' },
  { name: 'Offer / Promo', body: 'Hi {name}, exciting news! Get flat 15% off on all spa services this weekend at {{salon}}.' },
  { name: 'Custom', body: '' },
];

function mapMessage(m) {
  return {
    id: m.id,
    customer: m.customer?.name || '',
    channel: m.channel === 'sms' ? 'SMS' : m.channel === 'whatsapp' ? 'WhatsApp' : 'Email',
    type: m.type || 'Custom',
    message: m.content || '',
    status: (m.status || 'pending').toLowerCase() === 'delivered' || (m.status || '').toLowerCase() === 'sent' ? 'delivered' : (m.status || '').toLowerCase() === 'failed' ? 'failed' : 'pending',
    sentAt: m.sentAt ? new Date(m.sentAt).toISOString().replace('T', ' ').slice(0, 16) : m.createdAt ? new Date(m.createdAt).toISOString().replace('T', ' ').slice(0, 16) : '',
  };
}

const emptyForm = { customers: [], channel: 'WhatsApp', template: '', message: '', selectAll: false };

export default function CommunicationsPage() {
  const [messages, setMessages] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { salonName } = useSettings();
  const TEMPLATES = TEMPLATE_DEFS.map(t => ({ ...t, body: t.body.replace(/\{\{salon\}\}/g, salonName) }));

  useEffect(() => {
    async function load() {
      try {
        const [msgRes, custRes] = await Promise.all([messagesApi.list({ limit: 200 }), customersApi.list({ limit: 200 })]);
        setMessages((msgRes.data || []).map(mapMessage));
        setCustomersList((custRes.data || []).map(c => ({ name: c.name, phone: c.phone || '', email: c.email || '', id: c.id })));
      } catch (err) { console.error('Failed to load communications:', err); toast.error('Failed to load messages'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showSend, setShowSend] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = messages.filter(m => {
    if (filterChannel !== 'all' && m.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (search && !m.customer.toLowerCase().includes(search.toLowerCase()) && !m.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sent = messages.filter(m => m.status === 'delivered').length;
  const failed = messages.filter(m => m.status === 'failed').length;
  const pending = messages.filter(m => m.status === 'pending').length;

  const openSend = () => { setForm(emptyForm); setShowSend(true); };
  const openView = (msg) => { setViewing(msg); setShowView(true); };

  const toggleCustomer = (name) => {
    setForm(prev => ({
      ...prev,
      customers: prev.customers.includes(name) ? prev.customers.filter(c => c !== name) : [...prev.customers, name],
      selectAll: false,
    }));
  };

  const toggleAll = () => {
    setForm(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      customers: !prev.selectAll ? customersList.map(c => c.name) : [],
    }));
  };

  const pickTemplate = (tplName) => {
    const tpl = TEMPLATES.find(t => t.name === tplName);
    setForm(prev => ({ ...prev, template: tplName, message: tpl ? tpl.body : '' }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newMsgs = [];
    for (const custName of form.customers) {
      const cust = customersList.find(c => c.name === custName);
      const content = form.message.replace(/{name}/g, custName.split(' ')[0]);
      try {
        const res = await messagesApi.send({ customerId: cust?.id, channel: form.channel.toLowerCase(), content, type: form.template || 'MANUAL' });
        newMsgs.push({ id: res.id || Date.now(), customer: custName, channel: form.channel, type: form.template || 'Custom', message: content, status: 'delivered', sentAt: now });
      } catch { newMsgs.push({ id: Date.now(), customer: custName, channel: form.channel, type: form.template || 'Custom', message: content, status: 'failed', sentAt: now }); }
    }
    setMessages(prev => [...newMsgs, ...prev]);
    const failedCount = newMsgs.filter(m => m.status === 'failed').length;
    if (failedCount === 0) toast.success(`Message sent to ${newMsgs.length} customer(s)`);
    else if (failedCount === newMsgs.length) toast.error('Failed to send messages');
    else toast.warning(`${newMsgs.length - failedCount} sent, ${failedCount} failed`);
    setShowSend(false);
  };

  const retrySend = (id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'delivered' } : m));

  const statusIcon = (status) => {
    if (status === 'delivered') return <CheckCircle size={14} className="text-success-500" />;
    if (status === 'failed') return <XCircle size={14} className="text-danger-500" />;
    return <Clock size={14} className="text-warning-500" />;
  };

  const channelIcon = (ch) => {
    if (ch === 'Email') return <Mail size={14} />;
    if (ch === 'SMS') return <Phone size={14} />;
    return <MessageSquare size={14} />;
  };

  return (
    <div>
      <PageHeader title="Communications" description="Message customers via WhatsApp, SMS, and Email"
        actions={<Button onClick={openSend}><Send size={16} /> Send Message</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} label="Total Messages" value={messages.length} />
        <StatCard icon={CheckCircle} label="Delivered" value={sent} />
        <StatCard icon={XCircle} label="Failed" value={failed} changeType="down" />
        <StatCard icon={Clock} label="Pending" value={pending} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-surface-700">Message Log</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-surface-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="pl-8 pr-3 py-2 text-xs border border-surface-200 rounded-lg w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
                className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="all">All Channels</option>
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="all">All Status</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left">
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Customer</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500 hidden sm:table-cell">Channel</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Type</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden lg:table-cell">Message</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Status</th>
                <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Sent At</th>
                <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(msg => (
                <tr key={msg.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                  <td className="px-3 sm:px-5 py-3 font-medium text-surface-700">{msg.customer}</td>
                  <td className="px-3 sm:px-5 py-3 hidden sm:table-cell"><span className="flex items-center gap-1.5 text-surface-500">{channelIcon(msg.channel)} {msg.channel}</span></td>
                  <td className="px-5 py-3 text-surface-500 text-xs hidden md:table-cell">{msg.type}</td>
                  <td className="px-5 py-3 text-surface-500 text-xs max-w-xs truncate hidden lg:table-cell">{msg.message}</td>
                  <td className="px-3 sm:px-5 py-3"><span className="flex items-center gap-1.5 text-xs">{statusIcon(msg.status)} {msg.status}</span></td>
                  <td className="px-5 py-3 text-surface-400 text-xs hidden md:table-cell">{msg.sentAt}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(msg)}>View</Button>
                      {msg.status === 'failed' && <Button variant="ghost" size="sm" onClick={() => retrySend(msg.id)} className="text-primary-600">Retry</Button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-surface-400">No messages found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Send Message Modal */}
      <Modal isOpen={showSend} onClose={() => setShowSend(false)} title="Send Message" size="lg">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700">Recipients *</label>
              <button type="button" onClick={toggleAll} className="text-xs text-primary-600 hover:underline">{form.selectAll ? 'Deselect All' : 'Select All'}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customersList.map(c => (
                <button type="button" key={c.name} onClick={() => toggleCustomer(c.name)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors
                    ${form.customers.includes(c.name) ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Channel *</label>
              <select value={form.channel} onChange={e => setForm({...form, channel: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Template</label>
              <select value={form.template} onChange={e => pickTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="">Select template...</option>
                {TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Message *</label>
            <textarea required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              placeholder="Type your message... Use {name} for customer's first name."
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
            <p className="text-xs text-surface-400 mt-1">Use {'{name}'} to personalize. Will send to {form.customers.length} recipient(s).</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button type="submit" disabled={form.customers.length === 0}><Send size={14} /> Send</Button>
          </div>
        </form>
      </Modal>

      {/* View Message Modal */}
      <Modal isOpen={showView} onClose={() => setShowView(false)} title="Message Details" size="md">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <p className="font-medium text-surface-700">{viewing.customer}</p>
                <p className="text-xs text-surface-400">{viewing.sentAt}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs">{statusIcon(viewing.status)} {viewing.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-surface-400">Channel:</span> <span className="font-medium text-surface-700">{viewing.channel}</span></div>
              <div><span className="text-surface-400">Type:</span> <span className="font-medium text-surface-700">{viewing.type}</span></div>
            </div>
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
              <p className="text-sm text-surface-600 whitespace-pre-wrap">{viewing.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              {viewing.status === 'failed' && <Button onClick={() => { retrySend(viewing.id); setShowView(false); }}>Retry Send</Button>}
              <Button variant="outline" onClick={() => setShowView(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
