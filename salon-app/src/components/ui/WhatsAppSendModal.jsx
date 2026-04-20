import { useState, useEffect } from 'react';
import { X, Send, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { whatsapp as whatsappApi, services as servicesApi, staff as staffApi } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

// Field types: text, date, time, select, multi-service, multi-stylist, number
const TEMPLATE_FIELDS = {
  confirmation: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'time', label: 'Time', type: 'time' },
    { key: 'service', label: 'Services', type: 'multi-service' },
    { key: 'stylist', label: 'Stylists', type: 'multi-stylist' },
  ],
  reminder: [
    { key: 'time', label: 'Time', type: 'time' },
    { key: 'service', label: 'Services', type: 'multi-service' },
    { key: 'stylist', label: 'Stylists', type: 'multi-stylist' },
  ],
  reschedule: [
    { key: 'date', label: 'New Date', type: 'date' },
    { key: 'time', label: 'New Time', type: 'time' },
    { key: 'service', label: 'Services', type: 'multi-service' },
    { key: 'stylist', label: 'Stylists', type: 'multi-stylist' },
  ],
  cancellation: [
    { key: 'date', label: 'Original Date', type: 'date' },
    { key: 'service', label: 'Services', type: 'multi-service' },
  ],
  invoice: [
    { key: 'invoiceId', label: 'Invoice #', type: 'text', placeholder: 'e.g. INV-001' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'service', label: 'Services', type: 'multi-service' },
    { key: 'total', label: 'Total (₹)', type: 'number', placeholder: 'e.g. 1500' },
    { key: 'status', label: 'Status', type: 'select', options: ['PAID', 'PENDING'] },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'UPI', 'Card'] },
  ],
  birthday: [],
  loyalty: [
    { key: 'points', label: 'Points', type: 'number', placeholder: 'e.g. 250' },
    { key: 'tier', label: 'Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
  ],
  custom: [],
};

const TEMPLATES = {
  confirmation: {
    label: 'Appointment Confirmation',
    build: (vars, salon) => `Hi ${vars.name}, your appointment at ${salon} is confirmed!\n\nDate: ${vars.date || ''}\nTime: ${vars.time || ''}\nServices: ${vars.service || ''}\nStylist: ${vars.stylist || ''}\n\nSee you there! ✨`,
  },
  reminder: {
    label: 'Appointment Reminder',
    build: (vars, salon) => `Hi ${vars.name}, just a reminder — your appointment at ${salon} is tomorrow at ${vars.time || ''}.\n\nServices: ${vars.service || ''}\nStylist: ${vars.stylist || ''}\n\nSee you soon!`,
  },
  reschedule: {
    label: 'Reschedule Notification',
    build: (vars, salon) => `Hi ${vars.name}, your appointment at ${salon} has been rescheduled.\n\nNew Date: ${vars.date || ''}\nNew Time: ${vars.time || ''}\nServices: ${vars.service || ''}\nStylist: ${vars.stylist || ''}\n\nPlease let us know if this works for you! 📅`,
  },
  cancellation: {
    label: 'Cancellation Notice',
    build: (vars, salon) => `Hi ${vars.name}, your appointment at ${salon} for ${vars.service || ''} on ${vars.date || ''} has been cancelled.\n\nWe'd love to see you — feel free to rebook anytime! 💛`,
  },
  invoice: {
    label: 'Invoice / Bill',
    build: (vars, salon) => `*${salon} — Invoice*\n\nInvoice: ${vars.invoiceId || ''}\nDate: ${vars.date || ''}\nCustomer: ${vars.name}\nServices: ${vars.service || ''}\nTotal: ₹${vars.total || 0}\nStatus: ${vars.status || 'PAID'}\nPayment: ${vars.paymentMode || ''}\n\nThank you for visiting ${salon}!`,
  },
  birthday: {
    label: 'Birthday Wish',
    build: (vars, salon) => `Happy Birthday ${vars.name}! 🎂🎉\n\nWishing you a wonderful day! As a special treat, enjoy 20% off on your next visit at ${salon}. Valid for 7 days.\n\nSee you soon! ✨`,
  },
  loyalty: {
    label: 'Loyalty Points Update',
    build: (vars, salon) => `Hi ${vars.name}, here's your ${salon} loyalty update!\n\nPoints: ${vars.points || 0}\nTier: ${vars.tier || 'Bronze'}\n\nKeep earning points with every visit. Redeem them for exciting rewards! 🌟`,
  },
  custom: {
    label: 'Custom Message',
    build: () => '',
  },
};

export default function WhatsAppSendModal({ isOpen, onClose, customer, template = 'custom', templateVars = {}, onSent }) {
  const { salonName } = useSettings();
  const [selectedTemplate, setSelectedTemplate] = useState(template);
  const [vars, setVars] = useState({ name: customer?.name || '', ...templateVars });
  const [message, setMessage] = useState(() => {
    if (template && TEMPLATES[template]) {
      return TEMPLATES[template].build({ name: customer?.name || '', ...templateVars }, salonName);
    }
    return '';
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [servicesList, setServicesList] = useState([]);
  const [stylistsList, setStylistsList] = useState([]);

  // Fetch services and stylists when modal opens (if needed by any template)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const [svcRes, staffRes] = await Promise.all([servicesApi.list(), staffApi.list()]);
        if (cancelled) return;
        setServicesList((svcRes.data || []).map(s => s.name));
        setStylistsList((staffRes.data || []).filter(s => s.role === 'STYLIST').map(s => s.name));
      } catch { /* ignore */ }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Get fields that need user input (empty required fields for selected template)
  const requiredFields = TEMPLATE_FIELDS[selectedTemplate] || [];
  const missingFields = requiredFields.filter(f => !vars[f.key]?.toString().trim());

  if (!isOpen) return null;

  const updateVar = (key, value) => {
    const newVars = { ...vars, [key]: value };
    setVars(newVars);
    // Rebuild message from template with updated vars
    if (selectedTemplate !== 'custom' && TEMPLATES[selectedTemplate]) {
      setMessage(TEMPLATES[selectedTemplate].build(newVars, salonName));
    }
    setResult(null);
  };

  const handleTemplateChange = (key) => {
    setSelectedTemplate(key);
    if (key !== 'custom') {
      setMessage(TEMPLATES[key].build(vars, salonName));
    } else {
      setMessage('');
    }
    setResult(null);
  };

  const handleSend = async () => {
    if (!message.trim() || !customer?.id) return;
    setSending(true);
    setResult(null);
    try {
      await whatsappApi.send(customer.id, message.trim(), selectedTemplate === 'custom' ? 'CUSTOM' : selectedTemplate.toUpperCase());
      setResult({ success: true, message: 'Message sent successfully!' });
      if (onSent) onSent();
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to send message' });
    }
    setSending(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <MessageSquare size={16} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-800">Send WhatsApp</h2>
              <p className="text-[11px] text-surface-400">to {customer?.name || 'Customer'} {customer?.phone ? `· ${customer.phone}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">Message Template</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => handleTemplateChange(key)}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                    selectedTemplate === key
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template variable inputs */}
          {requiredFields.length > 0 && selectedTemplate !== 'custom' && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-2">Fill Details</label>
              <div className="space-y-2.5 p-3 rounded-lg bg-surface-50 border border-surface-100">
                {requiredFields.map(f => {
                  const isEmpty = !vars[f.key]?.toString().trim();
                  const inputCls = `w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 ${
                    isEmpty ? 'border-amber-300 bg-amber-50/30' : 'border-surface-200 bg-white'
                  }`;

                  let input;
                  if (f.type === 'date') {
                    const handleDateChange = (e) => {
                      const raw = e.target.value;
                      if (raw) {
                        const d = new Date(raw + 'T00:00:00');
                        const display = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        updateVar(f.key, display);
                      } else {
                        updateVar(f.key, '');
                      }
                    };
                    input = (
                      <div>
                        {vars[f.key] && <p className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded mb-1 inline-block">{vars[f.key]}</p>}
                        <input type="date" onChange={handleDateChange} className={inputCls} />
                      </div>
                    );
                  } else if (f.type === 'time') {
                    const handleTimeChange = (e) => {
                      const raw = e.target.value;
                      if (raw) {
                        const [h, m] = raw.split(':').map(Number);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        updateVar(f.key, `${h12}:${String(m).padStart(2, '0')} ${ampm}`);
                      } else {
                        updateVar(f.key, '');
                      }
                    };
                    input = (
                      <div>
                        {vars[f.key] && <p className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded mb-1 inline-block">{vars[f.key]}</p>}
                        <input type="time" onChange={handleTimeChange} className={inputCls} />
                      </div>
                    );
                  } else if (f.type === 'multi-service') {
                    const selected = vars[f.key] ? vars[f.key].split(', ').filter(Boolean) : [];
                    const toggleItem = (item) => {
                      const next = selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item];
                      updateVar(f.key, next.join(', '));
                    };
                    input = (
                      <div>
                        {selected.length > 0 && <p className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded mb-1.5 inline-block">{selected.join(', ')}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {servicesList.map(s => (
                            <button key={s} type="button" onClick={() => toggleItem(s)}
                              className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                                selected.includes(s) ? 'bg-green-50 text-green-700 border-green-200 font-medium' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                              }`}>{s}</button>
                          ))}
                          {servicesList.length === 0 && <span className="text-[11px] text-surface-400 italic">Loading services...</span>}
                        </div>
                      </div>
                    );
                  } else if (f.type === 'multi-stylist') {
                    const selected = vars[f.key] ? vars[f.key].split(', ').filter(Boolean) : [];
                    const toggleItem = (item) => {
                      const next = selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item];
                      updateVar(f.key, next.join(', '));
                    };
                    input = (
                      <div>
                        {selected.length > 0 && <p className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded mb-1.5 inline-block">{selected.join(', ')}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {stylistsList.map(s => (
                            <button key={s} type="button" onClick={() => toggleItem(s)}
                              className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                                selected.includes(s) ? 'bg-primary-50 text-primary-700 border-primary-200 font-medium' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                              }`}>{s}</button>
                          ))}
                          {stylistsList.length === 0 && <span className="text-[11px] text-surface-400 italic">Loading stylists...</span>}
                        </div>
                      </div>
                    );
                  } else if (f.type === 'select') {
                    input = (
                      <select value={vars[f.key] || ''} onChange={e => updateVar(f.key, e.target.value)} className={inputCls}>
                        <option value="">Select {f.label.toLowerCase()}</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    );
                  } else if (f.type === 'number') {
                    input = (
                      <input type="number" min={0} value={vars[f.key] || ''} onChange={e => updateVar(f.key, e.target.value)}
                        placeholder={f.placeholder || ''} className={inputCls} />
                    );
                  } else {
                    input = (
                      <input type="text" value={vars[f.key] || ''} onChange={e => updateVar(f.key, e.target.value)}
                        placeholder={f.placeholder || ''} className={inputCls} />
                    );
                  }

                  return (
                    <div key={f.key}>
                      <label className="block text-[11px] font-medium text-surface-500 mb-0.5">
                        {f.label} {isEmpty && <span className="text-amber-500">*</span>}
                      </label>
                      {input}
                    </div>
                  );
                })}
                {missingFields.length > 0 && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                    <AlertCircle size={10} /> Fill the highlighted fields to complete the message
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">Message</label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => { setMessage(e.target.value); setResult(null); }}
              placeholder="Type your message here..."
              className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 resize-none"
            />
            <p className="text-[10px] text-surface-400 mt-1">{message.length} characters</p>
          </div>

          {/* Preview */}
          {message && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Preview</label>
              <div className="p-3 rounded-xl bg-green-50/50 border border-green-100">
                <p className="text-xs text-surface-600 whitespace-pre-wrap leading-relaxed">{message}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {result.success ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" /> : <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
              <p className={`text-xs font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-100 shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending || !message.trim() || !customer?.id || missingFields.length > 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : missingFields.length > 0 ? `Fill ${missingFields.length} field${missingFields.length > 1 ? 's' : ''}` : 'Send WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
