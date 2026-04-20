import { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, Save, Building2, Clock, Bell, Shield, Database, Palette, Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Download, Eye, Trash2, ChevronLeft, ChevronRight, MessageSquare, Plus, Edit2, KeyRound, Smartphone, Wifi, WifiOff, QrCode, Send, RefreshCw, LogOut, ScrollText, Search, Filter, Phone, XCircle, Loader2, Globe, Copy, ExternalLink, ListOrdered } from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import { settings as settingsApi, whatsapp as whatsappApi, messages as messagesApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const initialSettings = {
  salon: { name: '', phone: '', email: '', address: '', gst: '' },
  hours: { monday: { open: '09:00', close: '20:00', off: false }, tuesday: { open: '09:00', close: '20:00', off: false }, wednesday: { open: '09:00', close: '20:00', off: false }, thursday: { open: '09:00', close: '20:00', off: false }, friday: { open: '09:00', close: '20:00', off: false }, saturday: { open: '10:00', close: '21:00', off: false }, sunday: { open: '10:00', close: '18:00', off: true } },
  notifications: { appointmentReminder: true, reminderHours: 2, birthdayWish: true, followUp: true, followUpDays: 3, smsEnabled: true, whatsappEnabled: true, emailEnabled: false },
  access: { allowReceptionBooking: true, allowStylistView: true, requireApprovalForDiscount: true, maxDiscountPercent: 20 },
  backup: { autoBackup: true, backupFrequency: 'daily', lastBackup: '' },
  apiKeys: { whatsappApiKey: '', smsApiKey: '' },
  queue: { enabled: true, autoRefreshSec: 15, estimatedWaitMin: 15, notifyOnCall: true, callTemplate: 'Hi {{name}}, it\'s your turn at {{salon}}! Please come to the counter.', maxWaiting: 20 },
  staff: { defaultCommissionPercent: 0, attendanceTrackingEnabled: true, maxAppointmentsPerStylist: 10, minBreakMinutes: 30, staffCanViewOwnCommission: true, staffCanViewOwnSchedule: true },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [activeSection, setActiveSection] = useState('salon');
  const [showSaved, setShowSaved] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const toast = useToast();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await settingsApi.get();
        setSettings(prev => {
          const hours = { ...prev.hours };
          // Load per-day working hours
          if (data.workingHours && typeof data.workingHours === 'object') {
            DAYS.forEach(day => {
              if (data.workingHours[day]) {
                hours[day] = { open: data.workingHours[day].open || '09:00', close: data.workingHours[day].close || '20:00', off: !!data.workingHours[day].off };
              }
            });
          } else {
            // Fallback to legacy openTime/closeTime + weeklyOff
            const weeklyOffDays = (data.weeklyOff || '').toLowerCase().split(',').map(d => d.trim());
            DAYS.forEach(day => {
              hours[day] = { open: data.openTime || '09:00', close: data.closeTime || '20:00', off: weeklyOffDays.includes(day) };
            });
          }
          return {
            ...prev,
            salon: { name: data.salonName || '', phone: data.phone || '', email: data.email || '', address: data.address || '', gst: data.gstNumber || '' },
            hours,
            apiKeys: { whatsappApiKey: data.whatsappApiKey || '', smsApiKey: data.smsApiKey || '' },
            notifications: {
              appointmentReminder: data.appointmentReminder ?? true,
              reminderHours: data.reminderHours ?? 2,
              birthdayWish: data.birthdayWish ?? true,
              followUp: data.followUp ?? true,
              followUpDays: data.followUpDays ?? 3,
              smsEnabled: data.smsEnabled ?? true,
              whatsappEnabled: data.whatsappEnabled ?? true,
              emailEnabled: data.emailEnabled ?? false,
            },
            access: {
              allowReceptionBooking: data.allowReceptionBooking ?? true,
              allowStylistView: data.allowStylistView ?? true,
              requireApprovalForDiscount: data.requireApprovalForDiscount ?? true,
              maxDiscountPercent: data.maxDiscountPercent ?? 20,
            },
            backup: {
              autoBackup: data.autoBackup ?? true,
              backupFrequency: data.backupFrequency || 'daily',
              lastBackup: prev.backup.lastBackup,
            },
            queue: {
              enabled: data.queueEnabled ?? true,
              autoRefreshSec: data.queueAutoRefreshSec ?? 15,
              estimatedWaitMin: data.queueEstimatedWaitMin ?? 15,
              notifyOnCall: data.queueNotifyOnCall ?? true,
              callTemplate: data.queueCallTemplate || prev.queue.callTemplate,
              maxWaiting: data.queueMaxWaiting ?? 20,
            },
            staff: {
              defaultCommissionPercent: data.defaultCommissionPercent ?? 0,
              attendanceTrackingEnabled: data.attendanceTrackingEnabled ?? true,
              maxAppointmentsPerStylist: data.maxAppointmentsPerStylist ?? 10,
              minBreakMinutes: data.minBreakMinutes ?? 30,
              staffCanViewOwnCommission: data.staffCanViewOwnCommission ?? true,
              staffCanViewOwnSchedule: data.staffCanViewOwnSchedule ?? true,
            },
          };
        });
        if (data.logo) setLogoPreview(data.logo);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setLoadError(err.isNetworkError ? 'Unable to connect to the server.' : 'Failed to load settings.');
        toast.error(err.isNetworkError ? 'Server unreachable' : 'Failed to load settings');
      }
      setLoading(false);
    }
    load();
  }, []);

  const update = (section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const updateHours = (day, key, value) => {
    setSettings(prev => ({ ...prev, hours: { ...prev.hours, [day]: { ...prev.hours[day], [key]: value } } }));
  };

  const save = async () => {
    try {
      // Build per-day working hours object
      const workingHours = {};
      DAYS.forEach(day => {
        workingHours[day] = { open: settings.hours[day].open, close: settings.hours[day].close, off: settings.hours[day].off };
      });
      // Also keep legacy fields for backward compat
      const firstOpen = DAYS.find(d => !settings.hours[d].off);
      await settingsApi.update({
        salonName: settings.salon.name, phone: settings.salon.phone, email: settings.salon.email,
        address: settings.salon.address,
        gstNumber: settings.salon.gst || null,
        openTime: firstOpen ? settings.hours[firstOpen].open : '09:00',
        closeTime: firstOpen ? settings.hours[firstOpen].close : '20:00',
        weeklyOff: DAYS.filter(d => settings.hours[d].off).join(','),
        workingHours,
        whatsappApiKey: settings.apiKeys?.whatsappApiKey || null,
        smsApiKey: settings.apiKeys?.smsApiKey || null,
        logo: logoPreview || null,
        // Notification settings
        smsEnabled: settings.notifications.smsEnabled,
        whatsappEnabled: settings.notifications.whatsappEnabled,
        emailEnabled: settings.notifications.emailEnabled,
        appointmentReminder: settings.notifications.appointmentReminder,
        reminderHours: parseInt(settings.notifications.reminderHours) || 2,
        birthdayWish: settings.notifications.birthdayWish,
        followUp: settings.notifications.followUp,
        followUpDays: parseInt(settings.notifications.followUpDays) || 3,
        // Access control settings
        allowReceptionBooking: settings.access.allowReceptionBooking,
        allowStylistView: settings.access.allowStylistView,
        requireApprovalForDiscount: settings.access.requireApprovalForDiscount,
        maxDiscountPercent: parseInt(settings.access.maxDiscountPercent) || 20,
        // Backup settings
        autoBackup: settings.backup.autoBackup,
        backupFrequency: settings.backup.backupFrequency || 'daily',
        // Queue settings
        queueEnabled: settings.queue.enabled,
        queueAutoRefreshSec: parseInt(settings.queue.autoRefreshSec) || 15,
        queueEstimatedWaitMin: parseInt(settings.queue.estimatedWaitMin) || 15,
        queueNotifyOnCall: settings.queue.notifyOnCall,
        queueCallTemplate: settings.queue.callTemplate || null,
        queueMaxWaiting: parseInt(settings.queue.maxWaiting) || 20,
        // Staff settings
        defaultCommissionPercent: parseFloat(settings.staff.defaultCommissionPercent) || 0,
        attendanceTrackingEnabled: settings.staff.attendanceTrackingEnabled,
        maxAppointmentsPerStylist: parseInt(settings.staff.maxAppointmentsPerStylist) || 10,
        minBreakMinutes: parseInt(settings.staff.minBreakMinutes) || 30,
        staffCanViewOwnCommission: settings.staff.staffCanViewOwnCommission,
        staffCanViewOwnSchedule: settings.staff.staffCanViewOwnSchedule,
      });
    } catch (err) { console.error('Failed to save settings:', err); toast.error('Failed to save settings'); return; }
    toast.success('Settings saved');
    if (refreshSettings) refreshSettings();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // Excel import state
  const [importedData, setImportedData] = useState(null);
  const [importedHeaders, setImportedHeaders] = useState([]);
  const [importedSheets, setImportedSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importFileSize, setImportFileSize] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importPage, setImportPage] = useState(1);
  const [importSearch, setImportSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [workbookRef, setWorkbookRef] = useState(null);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // WhatsApp connection state
  const [waStatus, setWaStatus] = useState({ status: 'disconnected', phone: null });
  const [waQR, setWaQR] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMsg, setWaTestMsg] = useState(`Hello from ${settings.salon.name || 'our salon'}!`);
  const [waTestResult, setWaTestResult] = useState(null);
  const [waTestSending, setWaTestSending] = useState(false);

  // Generate QR code for booking page
  useEffect(() => {
    if (activeSection === 'booking') {
      QRCode.toDataURL(`${window.location.origin}/book`, { width: 300, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [activeSection]);

  // Poll WhatsApp status
  useEffect(() => {
    let interval;
    if (activeSection === 'apikeys') {
      const fetchStatus = async () => {
        try { const s = await whatsappApi.status(); setWaStatus(s); } catch {}
      };
      fetchStatus();
      interval = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [activeSection]);

  const handleWaConnect = async () => {
    setWaLoading(true); setWaQR(null);
    try {
      // POST /connect starts Baileys and waits for QR
      const res = await whatsappApi.connect();
      if (res.qr) setWaQR(res.qr);
      setWaStatus({ status: res.status, phone: res.phone || null });

      // If not immediately connected, poll for QR updates + status
      if (res.status !== 'connected') {
        const qrPoll = setInterval(async () => {
          try {
            const s = await whatsappApi.status();
            setWaStatus(s);
            if (s.status === 'connected') {
              setWaQR(null);
              clearInterval(qrPoll);
              return;
            }
            if (s.status === 'disconnected') {
              clearInterval(qrPoll);
              return;
            }
            // Refresh QR (it rotates every ~20s)
            const qrRes = await whatsappApi.qr();
            if (qrRes.qr) setWaQR(qrRes.qr);
          } catch { clearInterval(qrPoll); }
        }, 4000);
        // Stop polling after 2 min
        setTimeout(() => clearInterval(qrPoll), 120000);
      }
    } catch (err) { console.error('WhatsApp connect error:', err); toast.error('Failed to connect WhatsApp'); }
    setWaLoading(false);
  };

  const handleWaDisconnect = async () => {
    setWaLoading(true);
    try { await whatsappApi.disconnect(); setWaStatus({ status: 'disconnected', phone: null }); setWaQR(null); } catch {}
    setWaLoading(false);
  };

  const handleWaLogout = async () => {
    setWaLoading(true);
    try { await whatsappApi.logout(); setWaStatus({ status: 'disconnected', phone: null }); setWaQR(null); } catch {}
    setWaLoading(false);
  };

  const handleWaSendTest = async () => {
    if (!waTestPhone || !waTestMsg) return;
    setWaTestResult(null);
    setWaTestSending(true);
    try {
      const res = await whatsappApi.sendTest(waTestPhone, waTestMsg);
      setWaTestResult({ success: res.success, message: res.message });
    } catch (err) {
      setWaTestResult({ success: false, message: err.message || 'Failed to send message' });
    }
    setWaTestSending(false);
  };

  // Message templates state
  const DEFAULT_TEMPLATES = [
    { id: 1, name: 'Booking Confirmation', trigger: 'appointment_booked', channel: 'whatsapp', template: 'Hi {{name}}, your appointment at {{salon}} is confirmed for {{date}} at {{time}}. See you there!', active: true },
    { id: 2, name: 'Appointment Reminder (24h)', trigger: 'appointment_reminder', channel: 'whatsapp', template: 'Hi {{name}}, your appointment at {{salon}} is tomorrow at {{time}}. See you there!', active: true },
    { id: 3, name: 'Reschedule Notification', trigger: 'appointment_rescheduled', channel: 'whatsapp', template: 'Hi {{name}}, your appointment has been rescheduled to {{date}} at {{time}}. Let us know if this works!', active: true },
    { id: 4, name: 'Cancellation Notice', trigger: 'appointment_cancelled', channel: 'whatsapp', template: 'Hi {{name}}, your appointment on {{date}} has been cancelled. Feel free to rebook anytime!', active: true },
    { id: 5, name: 'Thank You', trigger: 'post_visit', channel: 'whatsapp', template: 'Thank you for visiting {{salon}}, {{name}}! We hope you loved your {{service}}. See you again!', active: true },
    { id: 6, name: 'Birthday Wish', trigger: 'birthday', channel: 'whatsapp', template: 'Happy Birthday {{name}}! 🎂 Enjoy 20% off on your next visit at {{salon}}. Valid for 7 days.', active: true },
    { id: 7, name: 'No-Show Follow-up', trigger: 'no_show', channel: 'whatsapp', template: 'Hi {{name}}, we missed you at your appointment yesterday. Hope everything is okay — feel free to rebook!', active: true },
    { id: 8, name: 'Re-engagement', trigger: 'inactive_30d', channel: 'whatsapp', template: 'We miss you, {{name}}! It has been a while. Enjoy 15% off on your next visit. Book now!', active: true },
  ];
  const [msgTemplates, setMsgTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', trigger: 'appointment_reminder', channel: 'whatsapp', template: '' });
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const TEMPLATE_TRIGGERS = [
    { value: 'appointment_booked', label: 'Appointment Booked' },
    { value: 'appointment_reminder', label: 'Appointment Reminder (24h)' },
    { value: 'appointment_rescheduled', label: 'Appointment Rescheduled' },
    { value: 'appointment_cancelled', label: 'Appointment Cancelled' },
    { value: 'post_visit', label: 'After Visit (Thank You)' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'no_show', label: 'No-Show Follow-up' },
    { value: 'inactive_30d', label: '30 Days Inactive' },
    { value: 'inactive_60d', label: '60 Days Inactive' },
    { value: 'loyalty_milestone', label: 'Loyalty Milestone' },
    { value: 'payment_reminder', label: 'Payment Reminder' },
  ];

  const openAddTemplate = () => { setEditingTemplate(null); setTemplateForm({ name: '', trigger: 'appointment_reminder', channel: 'whatsapp', template: '' }); setShowTemplateModal(true); };
  const openEditTemplate = (t) => { setEditingTemplate(t); setTemplateForm({ name: t.name, trigger: t.trigger, channel: t.channel, template: t.template }); setShowTemplateModal(true); };
  const saveTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      setMsgTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t));
    } else {
      setMsgTemplates(prev => [...prev, { id: Date.now(), ...templateForm, active: true }]);
    }
    setShowTemplateModal(false);
  };
  const deleteTemplate = (id) => setMsgTemplates(prev => prev.filter(t => t.id !== id));
  const toggleTemplate = (id) => setMsgTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));

  // ── Message Log State ──
  const [mlMessages, setMlMessages] = useState([]);
  const [mlStats, setMlStats] = useState({ total: 0, sentToday: 0, delivered: 0, failed: 0, queued: 0, successRate: 0, byType: {}, byChannel: {}, daily: [] });
  const [mlPagination, setMlPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [mlLoading, setMlLoading] = useState(false);
  const [mlSearch, setMlSearch] = useState('');
  const [mlStatusFilter, setMlStatusFilter] = useState('');
  const [mlTypeFilter, setMlTypeFilter] = useState('');
  const [mlChannelFilter, setMlChannelFilter] = useState('');
  const [mlDateFrom, setMlDateFrom] = useState('');
  const [mlDateTo, setMlDateTo] = useState('');
  const [mlExpandedRow, setMlExpandedRow] = useState(null);

  const ML_TYPES = ['REMINDER_24H', 'REMINDER_2H', 'THANK_YOU', 'BIRTHDAY', 'RE_ENGAGEMENT', 'MANUAL', 'CONFIRMATION', 'REMINDER', 'INVOICE', 'LOYALTY', 'CUSTOM', 'RESCHEDULE', 'CANCELLATION', 'NO_SHOW_FOLLOWUP'];
  const ML_STATUSES = ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'];
  const ML_TYPE_COLORS = {
    REMINDER_24H: 'bg-blue-50 text-blue-700', REMINDER_2H: 'bg-blue-50 text-blue-600', THANK_YOU: 'bg-green-50 text-green-700',
    BIRTHDAY: 'bg-orange-50 text-orange-700', RE_ENGAGEMENT: 'bg-purple-50 text-purple-700', MANUAL: 'bg-surface-100 text-surface-600',
    CONFIRMATION: 'bg-emerald-50 text-emerald-700', REMINDER: 'bg-sky-50 text-sky-700', INVOICE: 'bg-amber-50 text-amber-700',
    LOYALTY: 'bg-pink-50 text-pink-700', CUSTOM: 'bg-indigo-50 text-indigo-700', RESCHEDULE: 'bg-teal-50 text-teal-700',
    CANCELLATION: 'bg-red-50 text-red-700', NO_SHOW_FOLLOWUP: 'bg-rose-50 text-rose-700',
  };
  const ML_STATUS_BADGES = { QUEUED: 'pending', SENT: 'confirmed', DELIVERED: 'active', FAILED: 'inactive' };

  const loadMessageLog = useCallback(async (pg = 1) => {
    setMlLoading(true);
    try {
      const params = { page: pg, limit: mlPagination.limit };
      if (mlStatusFilter) params.status = mlStatusFilter;
      if (mlTypeFilter) params.type = mlTypeFilter;
      if (mlChannelFilter) params.channel = mlChannelFilter;
      if (mlDateFrom) params.from = mlDateFrom;
      if (mlDateTo) params.to = mlDateTo;
      const [listRes, statsRes] = await Promise.all([messagesApi.list(params), messagesApi.stats()]);
      setMlMessages(listRes.data || []);
      setMlPagination(listRes.pagination || { page: pg, limit: 20, total: 0 });
      setMlStats(statsRes);
    } catch (err) { toast.error('Failed to load message log'); }
    setMlLoading(false);
  }, [mlStatusFilter, mlTypeFilter, mlChannelFilter, mlDateFrom, mlDateTo, mlPagination.limit]);

  useEffect(() => {
    if (activeSection === 'messagelog') loadMessageLog(1);
  }, [activeSection, mlStatusFilter, mlTypeFilter, mlChannelFilter, mlDateFrom, mlDateTo]);

  const mlFiltered = mlMessages.filter(m => {
    if (!mlSearch) return true;
    const q = mlSearch.toLowerCase();
    return (m.customer?.name || '').toLowerCase().includes(q) || (m.customer?.phone || '').includes(q) || (m.content || '').toLowerCase().includes(q);
  });

  const mlSetQuickRange = (days) => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    setMlDateFrom(from); setMlDateTo(to);
  };

  const mlClearFilters = () => { setMlSearch(''); setMlStatusFilter(''); setMlTypeFilter(''); setMlChannelFilter(''); setMlDateFrom(''); setMlDateTo(''); };

  const mlExportCSV = () => {
    const header = 'Customer,Phone,Type,Channel,Status,Message,Sent At,Created At\n';
    const rows = mlFiltered.map(m => `"${m.customer?.name || ''}","${m.customer?.phone || ''}","${m.type}","${m.channel}","${m.status}","${(m.content || '').replace(/"/g, '""')}","${m.sentAt || ''}","${m.createdAt || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `message-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.info('Message log exported');
  };

  const IMPORT_PAGE_SIZE = 15;

  const processWorkbook = useCallback((wb, fileName, fileSize) => {
    setWorkbookRef(wb);
    const sheetNames = wb.SheetNames;
    setImportedSheets(sheetNames);
    setImportFileName(fileName);
    setImportFileSize(fileSize);
    setImportError('');
    setImportSuccess('');
    setImportPage(1);
    setImportSearch('');
    const firstSheet = sheetNames[0];
    setActiveSheet(firstSheet);
    loadSheet(wb, firstSheet);
  }, []);

  const loadSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (json.length === 0) { setImportedHeaders([]); setImportedData([]); return; }
    setImportedHeaders(json[0].map(h => String(h).trim()));
    setImportedData(json.slice(1).filter(row => row.some(cell => cell !== '')));
    setImportPage(1);
    setImportSearch('');
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportError('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sizeStr = file.size < 1024 ? `${file.size} B` : file.size < 1048576 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
        processWorkbook(wb, file.name, sizeStr);
      } catch {
        setImportError('Failed to parse the file. Please check if it is a valid Excel/CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); };

  const clearImport = () => {
    setImportedData(null); setImportedHeaders([]); setImportedSheets([]); setActiveSheet(''); setImportFileName(''); setImportFileSize(''); setImportError(''); setImportSuccess(''); setWorkbookRef(null); setImportPage(1); setImportSearch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportPreviewCSV = () => {
    if (!importedData || !importedHeaders.length) return;
    const csv = [importedHeaders, ...importedData].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = importFileName.replace(/\.[^.]+$/, '') + '_preview.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredImportData = importedData?.filter(row =>
    !importSearch || row.some(cell => String(cell).toLowerCase().includes(importSearch.toLowerCase()))
  ) || [];
  const importTotalPages = Math.ceil(filteredImportData.length / IMPORT_PAGE_SIZE);
  const paginatedImportData = filteredImportData.slice((importPage - 1) * IMPORT_PAGE_SIZE, importPage * IMPORT_PAGE_SIZE);

  const sections = [
    { key: 'salon', icon: Building2, label: 'Salon Details' },
    { key: 'hours', icon: Clock, label: 'Working Hours' },
    { key: 'notifications', icon: Bell, label: 'Notifications' },
    { key: 'booking', icon: Globe, label: 'Online Booking' },
    { key: 'apikeys', icon: Smartphone, label: 'WhatsApp' },
    { key: 'access', icon: Shield, label: 'Access Control' },
    { key: 'backup', icon: Database, label: 'Backup' },
    { key: 'queue', icon: ListOrdered, label: 'Live Queue' },
    { key: 'staff', icon: Settings, label: 'Staff Management' },
    { key: 'templates', icon: MessageSquare, label: 'Message Templates' },
    { key: 'messagelog', icon: ScrollText, label: 'Message Log' },
    { key: 'import', icon: FileSpreadsheet, label: 'Data Import' },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200';
  const labelCls = 'block text-sm font-medium text-surface-700 mb-1';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-surface-500">Loading settings...</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-md">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-surface-700 font-medium mb-1">Failed to load settings</p>
        <p className="text-sm text-surface-500 mb-4">{loadError}</p>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Settings" description="Salon configuration and preferences"
        actions={<Button onClick={save}><Save size={16} /> Save Changes</Button>} />

      {showSaved && (
        <div className="mb-4 px-4 py-2.5 bg-success-50 border border-success-200 text-success-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          Settings saved successfully!
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <Card>
            <div className="p-2 flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1">
              {sections.map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`flex items-center gap-2 lg:gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors whitespace-nowrap
                    ${activeSection === s.key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-500 hover:bg-surface-50'}`}>
                  <s.icon size={16} /> {s.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'salon' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Salon Details</h2></CardHeader>
              <div className="p-5 space-y-4">
                {/* Logo Upload */}
                <div>
                  <label className={labelCls}>Salon Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Upload size={20} className="text-surface-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 512 * 1024) { toast.warning('Logo must be under 512KB'); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => setLogoPreview(ev.target.result);
                        reader.readAsDataURL(file);
                      }} />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}><Upload size={12} /> Upload Logo</Button>
                      {logoPreview && <button onClick={() => setLogoPreview(null)} className="text-xs text-red-500 hover:text-red-600">Remove</button>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Salon Name</label><input value={settings.salon.name} onChange={e => update('salon', 'name', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Phone</label><input value={settings.salon.phone} onChange={e => update('salon', 'phone', e.target.value)} className={inputCls} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Email</label><input type="email" value={settings.salon.email} onChange={e => update('salon', 'email', e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>GST Number</label><input value={settings.salon.gst} onChange={e => update('salon', 'gst', e.target.value)} className={inputCls} /></div>
                </div>
                <div><label className={labelCls}>Address</label><textarea rows={2} value={settings.salon.address} onChange={e => update('salon', 'address', e.target.value)} className={inputCls + ' resize-none'} /></div>
              </div>
            </Card>
          )}

          {activeSection === 'hours' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Working Hours</h2></CardHeader>
              <div className="p-5 space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-4 py-2 border-b border-surface-50 last:border-0">
                    <div className="w-28">
                      <span className="text-sm font-medium text-surface-700 capitalize">{day}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!settings.hours[day].off} onChange={e => updateHours(day, 'off', !e.target.checked)}
                        className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-200" />
                      <span className="text-xs text-surface-500">{settings.hours[day].off ? 'Closed' : 'Open'}</span>
                    </label>
                    {!settings.hours[day].off && (
                      <>
                        <input type="time" value={settings.hours[day].open} onChange={e => updateHours(day, 'open', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                        <span className="text-surface-400 text-sm">to</span>
                        <input type="time" value={settings.hours[day].close} onChange={e => updateHours(day, 'close', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Notification Preferences</h2></CardHeader>
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-surface-600">Channels</h3>
                  {[['smsEnabled', 'SMS'], ['whatsappEnabled', 'WhatsApp'], ['emailEnabled', 'Email']].map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between py-2 border-b border-surface-50">
                      <span className="text-sm text-surface-700">{label}</span>
                      <button type="button" onClick={() => update('notifications', key, !settings.notifications[key])}
                        className={`relative w-9 h-5 rounded-full transition-colors ${settings.notifications[key] ? 'bg-primary-400' : 'bg-surface-200'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.notifications[key] ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-surface-600">Auto-Messages</h3>
                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <div><span className="text-sm text-surface-700">Appointment Reminder</span>
                      {settings.notifications.appointmentReminder && (
                        <div className="flex items-center gap-2 mt-1">
                          <input type="number" min={1} max={48} value={settings.notifications.reminderHours} onChange={e => update('notifications', 'reminderHours', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs border border-surface-200 rounded" />
                          <span className="text-xs text-surface-400">hours before</span>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => update('notifications', 'appointmentReminder', !settings.notifications.appointmentReminder)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.notifications.appointmentReminder ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.notifications.appointmentReminder ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <span className="text-sm text-surface-700">Birthday Wish</span>
                    <button type="button" onClick={() => update('notifications', 'birthdayWish', !settings.notifications.birthdayWish)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.notifications.birthdayWish ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.notifications.birthdayWish ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <div><span className="text-sm text-surface-700">Follow-up Message</span>
                      {settings.notifications.followUp && (
                        <div className="flex items-center gap-2 mt-1">
                          <input type="number" min={1} max={30} value={settings.notifications.followUpDays} onChange={e => update('notifications', 'followUpDays', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs border border-surface-200 rounded" />
                          <span className="text-xs text-surface-400">days after visit</span>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => update('notifications', 'followUp', !settings.notifications.followUp)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.notifications.followUp ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.notifications.followUp ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'booking' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Online Booking</h2></CardHeader>
              <div className="p-5 space-y-6">
                <p className="text-sm text-surface-500">Allow customers to book appointments online via a shareable link or QR code.</p>

                {/* Booking URL */}
                <div className="space-y-2">
                  <label className={labelCls}>Booking Page URL</label>
                  <div className="flex items-center gap-2">
                    <input readOnly value={`${window.location.origin}/book`} className={`${inputCls} bg-surface-50 font-mono text-xs`} />
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book`); toast.success('Link copied!'); }}
                      className="p-2 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors shrink-0"
                      title="Copy link"
                    >
                      <Copy size={16} className="text-surface-600" />
                    </button>
                    <a
                      href="/book"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors shrink-0"
                      title="Open booking page"
                    >
                      <ExternalLink size={16} className="text-surface-600" />
                    </a>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-3">
                  <label className={labelCls}>QR Code</label>
                  <div className="flex flex-col items-center bg-white border-2 border-dashed border-surface-200 rounded-xl p-6">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-surface-100">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Booking QR Code" className="w-48 h-48" id="booking-qr-img" />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-surface-300">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mt-3">Scan with any camera app to open the booking page</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          if (!qrDataUrl) return;
                          const a = document.createElement('a');
                          a.download = 'booking-qr.png';
                          a.href = qrDataUrl;
                          a.click();
                        }}
                        className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Download QR
                      </button>
                    </div>
                  </div>
                </div>

                {/* Share on WhatsApp */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-1">Share via WhatsApp</h3>
                  <p className="text-xs text-green-600 mb-3">Send the booking link to customers via WhatsApp broadcast</p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Book your appointment at ${settings.salon.name || 'our salon'} online! 💇\n\n${window.location.origin}/book`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Send size={14} /> Share Link
                  </a>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'apikeys' && (
            <div className="space-y-5">
              {/* WhatsApp Connection */}
              <Card>
                <CardHeader><h2 className="text-base font-semibold text-surface-700">WhatsApp Connection</h2></CardHeader>
                <div className="p-5 space-y-5">
                  <p className="text-xs text-surface-400">Connect your personal WhatsApp to send messages directly from this number. Scan the QR code with WhatsApp on your phone (Linked Devices &gt; Link a Device).</p>

                  {/* Status indicator */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${waStatus.status === 'connected' ? 'border-green-200 bg-green-50' : waStatus.status === 'connecting' ? 'border-yellow-200 bg-yellow-50' : 'border-surface-200 bg-surface-50'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${waStatus.status === 'connected' ? 'bg-green-500' : waStatus.status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-surface-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold capitalize ${waStatus.status === 'connected' ? 'text-green-700' : waStatus.status === 'connecting' ? 'text-yellow-700' : 'text-surface-600'}`}>
                          {waStatus.status === 'connected' ? 'Connected' : waStatus.status === 'connecting' ? 'Connecting...' : 'Disconnected'}
                        </span>
                        {waStatus.status === 'connected' && <Wifi size={14} className="text-green-500" />}
                      </div>
                      {waStatus.phone ? (
                        <p className="text-xs text-surface-500 mt-0.5">Linked to <span className="font-medium text-surface-700">+{waStatus.phone}</span></p>
                      ) : waStatus.status === 'disconnected' ? (
                        <p className="text-xs text-surface-400 mt-0.5">Click Connect to link your WhatsApp</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {waStatus.status === 'connected' ? (
                        <>
                          <Button variant="outline" size="sm" onClick={handleWaDisconnect} disabled={waLoading}><WifiOff size={14} /> Disconnect</Button>
                          <Button variant="danger" size="sm" onClick={handleWaLogout} disabled={waLoading}><LogOut size={14} /> Logout</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={handleWaConnect} disabled={waLoading}>
                          {waLoading ? <RefreshCw size={14} className="animate-spin" /> : <QrCode size={14} />}
                          {waLoading ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* QR code display */}
                  {waQR && waStatus.status !== 'connected' && (
                    <div className="flex flex-col items-center gap-4 p-8 border border-primary-100 rounded-lg bg-white">
                      <div className="flex items-center gap-2 text-primary-600">
                        <Smartphone size={18} />
                        <p className="text-sm font-medium">Scan this QR code with WhatsApp</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-surface-100">
                        <img src={waQR} alt="WhatsApp QR Code" className="w-56 h-56" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-surface-500">Open WhatsApp on your phone</p>
                        <p className="text-xs text-surface-400 mt-0.5">Settings &rarr; Linked Devices &rarr; Link a Device</p>
                      </div>
                    </div>
                  )}

                  {/* Test message */}
                  {waStatus.status === 'connected' && (
                    <div className="p-4 border border-green-100 rounded-lg bg-green-50/50 space-y-3">
                      <h3 className="text-sm font-medium text-surface-700 flex items-center gap-2"><Send size={14} className="text-surface-400" /> Send Test Message</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                        <input value={waTestPhone} onChange={e => setWaTestPhone(e.target.value)} placeholder="Phone with country code (e.g. 919876543210)" className={inputCls} />
                        <input value={waTestMsg} onChange={e => setWaTestMsg(e.target.value)} placeholder="Message text" className={inputCls} />
                        <Button size="sm" onClick={handleWaSendTest} disabled={!waTestPhone || !waTestMsg || waTestSending}>
                          {waTestSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                          {waTestSending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                      <p className="text-[10px] text-surface-400">Enter the full phone number with country code, without + or spaces.</p>
                      {waTestResult && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${waTestResult.success ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {waTestResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                          {waTestResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* SMS API Key */}
              <Card>
                <CardHeader><h2 className="text-base font-semibold text-surface-700">SMS API Configuration</h2></CardHeader>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelCls}>SMS Gateway API Key</label>
                    <input type="password" value={settings.apiKeys.smsApiKey} onChange={e => update('apiKeys', 'smsApiKey', e.target.value)}
                      placeholder="Enter SMS API key" className={inputCls} />
                    <p className="text-[10px] text-surface-400 mt-1">Used for SMS notifications when WhatsApp is unavailable.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'access' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Access Control</h2></CardHeader>
              <div className="p-5 space-y-4">
                {[['allowReceptionBooking', 'Receptionist can create bookings'], ['allowStylistView', 'Stylists can view their own schedule'], ['requireApprovalForDiscount', 'Require admin approval for discounts']].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between py-2 border-b border-surface-50">
                    <span className="text-sm text-surface-700">{label}</span>
                    <button type="button" onClick={() => update('access', key, !settings.access[key])}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.access[key] ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.access[key] ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                ))}
                <div>
                  <label className={labelCls}>Max Discount Without Approval (%)</label>
                  <input type="number" min={0} max={100} value={settings.access.maxDiscountPercent} onChange={e => update('access', 'maxDiscountPercent', Number(e.target.value))} className={inputCls + ' w-32'} />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'backup' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Backup & Data</h2></CardHeader>
              <div className="p-5 space-y-4">
                <label className="flex items-center justify-between py-2 border-b border-surface-50">
                  <span className="text-sm text-surface-700">Auto Backup</span>
                  <button type="button" onClick={() => update('backup', 'autoBackup', !settings.backup.autoBackup)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${settings.backup.autoBackup ? 'bg-primary-400' : 'bg-surface-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.backup.autoBackup ? 'translate-x-4' : ''}`} />
                  </button>
                </label>
                {settings.backup.autoBackup && (
                  <div>
                    <label className={labelCls}>Backup Frequency</label>
                    <select value={settings.backup.backupFrequency} onChange={e => update('backup', 'backupFrequency', e.target.value)} className={inputCls + ' w-48'}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-sm">
                  <span className="text-surface-400">Last Backup:</span> <span className="text-surface-700 font-medium">{settings.backup.lastBackup}</span>
                </div>
                <Button variant="outline" onClick={async () => {
                  try {
                    const data = await settingsApi.backup();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `salon-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
                    URL.revokeObjectURL(url);
                    update('backup', 'lastBackup', new Date().toLocaleString());
                  } catch (err) { console.error('Backup failed:', err); }
                }}>
                  <Database size={14} /> Backup Now
                </Button>
              </div>
            </Card>
          )}

          {activeSection === 'queue' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Live Queue Settings</h2></CardHeader>
              <div className="p-5 space-y-4">
                <label className="flex items-center justify-between py-2 border-b border-surface-50">
                  <div>
                    <span className="text-sm font-medium text-surface-700">Enable Live Queue</span>
                    <p className="text-xs text-surface-400 mt-0.5">Allow walk-in customers to join a live queue</p>
                  </div>
                  <button type="button" onClick={() => update('queue', 'enabled', !settings.queue.enabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${settings.queue.enabled ? 'bg-primary-400' : 'bg-surface-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.queue.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                </label>

                {settings.queue.enabled && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Auto Refresh (seconds)</label>
                        <input type="number" min="5" max="120" value={settings.queue.autoRefreshSec}
                          onChange={e => update('queue', 'autoRefreshSec', e.target.value)} className={inputCls} />
                        <p className="text-xs text-surface-400 mt-1">How often the queue display refreshes</p>
                      </div>
                      <div>
                        <label className={labelCls}>Default Est. Wait (min)</label>
                        <input type="number" min="5" max="120" value={settings.queue.estimatedWaitMin}
                          onChange={e => update('queue', 'estimatedWaitMin', e.target.value)} className={inputCls} />
                        <p className="text-xs text-surface-400 mt-1">Default estimated wait per person</p>
                      </div>
                      <div>
                        <label className={labelCls}>Max Waiting Limit</label>
                        <input type="number" min="1" max="100" value={settings.queue.maxWaiting}
                          onChange={e => update('queue', 'maxWaiting', e.target.value)} className={inputCls} />
                        <p className="text-xs text-surface-400 mt-1">Max customers allowed in waiting queue</p>
                      </div>
                    </div>

                    <label className="flex items-center justify-between py-2 border-b border-surface-50">
                      <div>
                        <span className="text-sm font-medium text-surface-700">WhatsApp Notify on Call</span>
                        <p className="text-xs text-surface-400 mt-0.5">Send WhatsApp message when customer's turn arrives</p>
                      </div>
                      <button type="button" onClick={() => update('queue', 'notifyOnCall', !settings.queue.notifyOnCall)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${settings.queue.notifyOnCall ? 'bg-primary-400' : 'bg-surface-200'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.queue.notifyOnCall ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>

                    {settings.queue.notifyOnCall && (
                      <div>
                        <label className={labelCls}>Queue Call Template</label>
                        <textarea rows={3} value={settings.queue.callTemplate}
                          onChange={e => update('queue', 'callTemplate', e.target.value)} className={inputCls} />
                        <p className="text-xs text-surface-400 mt-1">Variables: {'{{name}}'}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}

          {activeSection === 'staff' && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Staff Management Settings</h2></CardHeader>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Default Commission %</label>
                    <input type="number" min="0" max="100" step="0.5" value={settings.staff.defaultCommissionPercent}
                      onChange={e => update('staff', 'defaultCommissionPercent', e.target.value)} className={inputCls} />
                    <p className="text-xs text-surface-400 mt-1">Applied to new staff members by default</p>
                  </div>
                  <div>
                    <label className={labelCls}>Max Appointments per Stylist / Day</label>
                    <input type="number" min="1" max="50" value={settings.staff.maxAppointmentsPerStylist}
                      onChange={e => update('staff', 'maxAppointmentsPerStylist', e.target.value)} className={inputCls} />
                    <p className="text-xs text-surface-400 mt-1">Prevent overbooking per stylist</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Minimum Break Between Appointments (min)</label>
                  <input type="number" min="0" max="120" value={settings.staff.minBreakMinutes}
                    onChange={e => update('staff', 'minBreakMinutes', e.target.value)} className={inputCls + ' w-48'} />
                  <p className="text-xs text-surface-400 mt-1">Buffer time between consecutive appointments</p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <div>
                      <span className="text-sm font-medium text-surface-700">Attendance Tracking</span>
                      <p className="text-xs text-surface-400 mt-0.5">Track daily check-in / check-out for staff</p>
                    </div>
                    <button type="button" onClick={() => update('staff', 'attendanceTrackingEnabled', !settings.staff.attendanceTrackingEnabled)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.staff.attendanceTrackingEnabled ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.staff.attendanceTrackingEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>

                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <div>
                      <span className="text-sm font-medium text-surface-700">Staff Can View Own Commission</span>
                      <p className="text-xs text-surface-400 mt-0.5">Allow stylists to see their commission earnings</p>
                    </div>
                    <button type="button" onClick={() => update('staff', 'staffCanViewOwnCommission', !settings.staff.staffCanViewOwnCommission)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.staff.staffCanViewOwnCommission ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.staff.staffCanViewOwnCommission ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>

                  <label className="flex items-center justify-between py-2 border-b border-surface-50">
                    <div>
                      <span className="text-sm font-medium text-surface-700">Staff Can View Own Schedule</span>
                      <p className="text-xs text-surface-400 mt-0.5">Allow stylists to see their upcoming appointments</p>
                    </div>
                    <button type="button" onClick={() => update('staff', 'staffCanViewOwnSchedule', !settings.staff.staffCanViewOwnSchedule)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${settings.staff.staffCanViewOwnSchedule ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${settings.staff.staffCanViewOwnSchedule ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-surface-700">Message Templates</h2>
                <Button size="sm" onClick={openAddTemplate}><Plus size={14} /> Add Template</Button>
              </div>
              <div className="space-y-3">
                {msgTemplates.map(t => (
                  <Card key={t.id} className={!t.active ? 'opacity-60' : ''}>
                    <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.active ? t.channel === 'whatsapp' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600' : 'bg-surface-100 text-surface-400'}`}>
                          <MessageSquare size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-surface-700">{t.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${t.channel === 'whatsapp' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                              {t.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            </span>
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5">Trigger: {TEMPLATE_TRIGGERS.find(tr => tr.value === t.trigger)?.label || t.trigger}</p>
                          <div className="mt-2 p-2.5 rounded-lg bg-surface-50 border border-surface-100">
                            <p className="text-xs text-surface-500 leading-relaxed">{t.template}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => toggleTemplate(t.id)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${t.active ? 'bg-primary-400' : 'bg-surface-200'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${t.active ? 'translate-x-5' : ''}`} />
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => openEditTemplate(t)}><Edit2 size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}><Trash2 size={14} className="text-danger-500" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Template Modal */}
              <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={editingTemplate ? 'Edit Template' : 'Add Message Template'} size="md">
                <form onSubmit={saveTemplate} className="space-y-4">
                  <div>
                    <label className={labelCls}>Template Name *</label>
                    <input required value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Trigger *</label>
                      <select value={templateForm.trigger} onChange={e => setTemplateForm({...templateForm, trigger: e.target.value})} className={inputCls}>
                        {TEMPLATE_TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Channel *</label>
                      <select value={templateForm.channel} onChange={e => setTemplateForm({...templateForm, channel: e.target.value})} className={inputCls}>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Message Template *</label>
                    <textarea required rows={3} value={templateForm.template} onChange={e => setTemplateForm({...templateForm, template: e.target.value})} className={inputCls}
                      placeholder="Use {{name}}, {{salon}}, {{time}}, {{service}}, {{points}} as placeholders" />
                    <p className="text-[10px] text-surface-400 mt-1">Variables: {'{{name}}'}, {'{{salon}}'}, {'{{time}}'}, {'{{service}}'}, {'{{points}}'}, {'{{date}}'}</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
                    <Button type="submit">{editingTemplate ? 'Save Changes' : 'Add Template'}</Button>
                  </div>
                </form>
              </Modal>
            </div>
          )}

          {activeSection === 'messagelog' && (
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={Send} label="Total Messages" value={mlStats.total} />
                <StatCard icon={Clock} label="Sent Today" value={mlStats.sentToday} />
                <StatCard icon={CheckCircle} label="Delivered" value={mlStats.delivered} />
                <StatCard icon={XCircle} label="Failed" value={mlStats.failed} />
                <StatCard icon={Loader2} label="Queued" value={mlStats.queued} />
                <StatCard icon={AlertCircle} label="Success Rate" value={`${mlStats.successRate}%`} />
              </div>

              {/* Filters */}
              <Card>
                <CardBody>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-surface-400" />
                        <input value={mlSearch} onChange={e => setMlSearch(e.target.value)} placeholder="Search customer, phone or message..."
                          className="pl-8 pr-3 py-2 text-xs border border-surface-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-200" />
                      </div>
                      <select value={mlStatusFilter} onChange={e => setMlStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                        <option value="">All Status</option>
                        {ML_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={mlTypeFilter} onChange={e => setMlTypeFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                        <option value="">All Types</option>
                        {ML_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select>
                      <select value={mlChannelFilter} onChange={e => setMlChannelFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                        <option value="">All Channels</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="date" value={mlDateFrom} onChange={e => setMlDateFrom(e.target.value)}
                        className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                      <span className="text-xs text-surface-400">to</span>
                      <input type="date" value={mlDateTo} onChange={e => setMlDateTo(e.target.value)}
                        className="px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
                      <div className="flex gap-1">
                        {[{ label: 'Today', days: 0 }, { label: '7d', days: 7 }, { label: '30d', days: 30 }].map(r => (
                          <button key={r.label} onClick={() => r.days === 0 ? (() => { const t = new Date().toISOString().slice(0, 10); setMlDateFrom(t); setMlDateTo(t); })() : mlSetQuickRange(r.days)}
                            className="px-2.5 py-1.5 text-xs border border-surface-200 rounded-lg hover:bg-surface-50 text-surface-600 transition-colors">{r.label}</button>
                        ))}
                      </div>
                      {(mlSearch || mlStatusFilter || mlTypeFilter || mlChannelFilter || mlDateFrom || mlDateTo) && (
                        <button onClick={mlClearFilters} className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                          <X size={12} /> Clear
                        </button>
                      )}
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => loadMessageLog(mlPagination.page)} className="p-2 rounded-lg border border-surface-200 hover:bg-surface-50 text-surface-500 transition-colors" title="Refresh">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={mlExportCSV} className="px-3 py-1.5 text-xs border border-surface-200 rounded-lg hover:bg-surface-50 text-surface-600 transition-colors flex items-center gap-1">
                          <Download size={12} /> Export CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Messages Table */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 bg-surface-50">
                        <th className="text-left px-4 py-3 font-medium text-surface-500">Customer</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500">Message</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500 hidden md:table-cell">Channel</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500 hidden lg:table-cell">Sent At</th>
                        <th className="text-left px-4 py-3 font-medium text-surface-500 hidden xl:table-cell">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mlLoading ? (
                        <tr><td colSpan={7} className="text-center py-12 text-surface-400 text-sm">
                          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-primary-400" /> Loading messages...
                        </td></tr>
                      ) : mlFiltered.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-surface-400 text-sm">No messages found</td></tr>
                      ) : mlFiltered.map(m => (
                        <tr key={m.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors cursor-pointer" onClick={() => setMlExpandedRow(mlExpandedRow === m.id ? null : m.id)}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-surface-700 truncate max-w-[140px]">{m.customer?.name || 'Unknown'}</p>
                            <p className="text-[11px] text-surface-400 flex items-center gap-1"><Phone size={10} />{m.customer?.phone || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {mlExpandedRow === m.id ? (
                              <p className="text-xs text-surface-600 max-w-[300px] whitespace-pre-wrap">{m.content}</p>
                            ) : (
                              <p className="text-xs text-surface-600 truncate max-w-[200px]" title={m.content}>{m.content?.slice(0, 60)}{m.content?.length > 60 ? '...' : ''}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${ML_TYPE_COLORS[m.type] || 'bg-surface-100 text-surface-500'}`}>
                              {(m.type || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="flex items-center gap-1.5 text-xs text-surface-600">
                              {m.channel === 'whatsapp' ? <MessageSquare size={12} className="text-green-500" /> : <Phone size={12} className="text-blue-500" />}
                              {m.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge status={ML_STATUS_BADGES[m.status] || 'pending'} label={m.status} />
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-surface-500">{m.sentAt ? new Date(m.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <span className="text-xs text-surface-400">{m.createdAt ? new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {mlPagination.total > mlPagination.limit && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
                    <span className="text-xs text-surface-400">
                      Showing {((mlPagination.page - 1) * mlPagination.limit) + 1}–{Math.min(mlPagination.page * mlPagination.limit, mlPagination.total)} of {mlPagination.total}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => loadMessageLog(mlPagination.page - 1)} disabled={mlPagination.page <= 1}
                        className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                      <span className="px-2 text-xs text-surface-500">Page {mlPagination.page} of {Math.ceil(mlPagination.total / mlPagination.limit)}</span>
                      <button onClick={() => loadMessageLog(mlPagination.page + 1)} disabled={mlPagination.page >= Math.ceil(mlPagination.total / mlPagination.limit)}
                        className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Daily Breakdown */}
              {mlStats.daily.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Daily Breakdown (Last 30 Days)</h2></CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50">
                          <th className="text-left px-4 py-2.5 font-medium text-surface-500">Date</th>
                          <th className="text-right px-4 py-2.5 font-medium text-surface-500">Total</th>
                          <th className="text-right px-4 py-2.5 font-medium text-surface-500">Delivered</th>
                          <th className="text-right px-4 py-2.5 font-medium text-surface-500">Failed</th>
                          <th className="text-right px-4 py-2.5 font-medium text-surface-500">Success %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mlStats.daily.map(d => {
                          const rate = d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0;
                          return (
                            <tr key={d.date} className="border-b border-surface-50 hover:bg-surface-50/50">
                              <td className="px-4 py-2.5 text-sm text-surface-700 font-medium">
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-surface-600 text-right">{d.total}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-sm text-green-600 font-medium">{d.delivered}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-sm font-medium ${d.failed > 0 ? 'text-red-500' : 'text-surface-400'}`}>{d.failed}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                                  </div>
                                  <span className="text-xs text-surface-500 w-8 text-right">{rate}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Type Breakdown */}
              {Object.keys(mlStats.byType).length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Messages by Type</h2></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {Object.entries(mlStats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                        <div key={type} className="p-3 rounded-lg border border-surface-100 bg-surface-50/50">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full mb-2 ${ML_TYPE_COLORS[type] || 'bg-surface-100 text-surface-500'}`}>
                            {type.replace(/_/g, ' ')}
                          </span>
                          <p className="text-lg font-bold text-surface-800">{count}</p>
                          <p className="text-[10px] text-surface-400">{mlStats.total > 0 ? Math.round((count / mlStats.total) * 100) : 0}% of total</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'import' && (
            <div className="space-y-4">
              {/* Upload area */}
              {!importedData ? (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Import Data from Excel</h2></CardHeader>
                  <div className="p-5">
                    <div
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                        isDragging ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-primary-300 hover:bg-surface-50'
                      }`}>
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                      <Upload size={40} className={`mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-surface-300'}`} />
                      <p className="text-sm font-medium text-surface-700 mb-1">Drop your Excel file here or click to browse</p>
                      <p className="text-xs text-surface-400">Supports .xlsx, .xls, and .csv files</p>
                    </div>
                    {importError && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg">
                        <AlertCircle size={16} /> {importError}
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <>
                  {/* File info bar */}
                  <Card>
                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <FileSpreadsheet size={20} className="text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-700 truncate">{importFileName}</p>
                          <p className="text-xs text-surface-400">{importFileSize} · {importedData.length} rows · {importedHeaders.length} columns · {importedSheets.length} sheet{importedSheets.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={exportPreviewCSV}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors">
                          <Download size={12} /> Export CSV
                        </button>
                        <button onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors">
                          <Upload size={12} /> Upload New
                        </button>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                        <button onClick={clearImport}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-danger-200 bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors">
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  </Card>

                  {importSuccess && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-success-50 border border-success-200 text-success-700 text-sm rounded-lg">
                      <CheckCircle size={16} /> {importSuccess}
                    </div>
                  )}
                  {importError && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg">
                      <AlertCircle size={16} /> {importError}
                    </div>
                  )}

                  {/* Sheet tabs + search */}
                  <Card>
                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-surface-100">
                      {/* Sheet tabs */}
                      {importedSheets.length > 1 && (
                        <div className="flex gap-1 overflow-x-auto">
                          {importedSheets.map(sheet => (
                            <button key={sheet} onClick={() => { setActiveSheet(sheet); loadSheet(workbookRef, sheet); }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                                activeSheet === sheet ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                              }`}>
                              {sheet}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="relative flex-1 max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" placeholder="Search in data..." value={importSearch}
                          onChange={(e) => { setImportSearch(e.target.value); setImportPage(1); }}
                          className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-surface-400" />
                      </div>
                    </div>

                    {/* Data preview table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface-50/70 border-b border-surface-200">
                            <th className="px-3 py-2.5 text-left font-semibold text-surface-500 w-12">#</th>
                            {importedHeaders.map((h, i) => (
                              <th key={i} className="px-3 py-2.5 text-left font-semibold text-surface-600 whitespace-nowrap">{h || `Column ${i + 1}`}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedImportData.map((row, ri) => (
                            <tr key={ri} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                              <td className="px-3 py-2 text-surface-400 font-mono">{(importPage - 1) * IMPORT_PAGE_SIZE + ri + 1}</td>
                              {importedHeaders.map((_, ci) => (
                                <td key={ci} className="px-3 py-2 text-surface-700 max-w-[200px] truncate" title={String(row[ci] ?? '')}>
                                  {row[ci] !== undefined && row[ci] !== '' ? String(row[ci]) : <span className="text-surface-300">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {paginatedImportData.length === 0 && (
                            <tr>
                              <td colSpan={importedHeaders.length + 1} className="px-3 py-10 text-center text-surface-400">
                                {importSearch ? 'No matching rows found' : 'No data in this sheet'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredImportData.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-100">
                        <span className="text-xs text-surface-400">
                          Showing {Math.min((importPage - 1) * IMPORT_PAGE_SIZE + 1, filteredImportData.length)}–{Math.min(importPage * IMPORT_PAGE_SIZE, filteredImportData.length)} of {filteredImportData.length} rows
                          {importSearch && ` (filtered from ${importedData.length})`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setImportPage(1)} disabled={importPage === 1}
                            className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-surface-600">
                            <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2.5" />
                          </button>
                          <button onClick={() => setImportPage(p => Math.max(1, p - 1))} disabled={importPage === 1}
                            className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft size={14} className="text-surface-600" />
                          </button>
                          <span className="px-2 text-xs text-surface-500">Page {importPage} of {importTotalPages}</span>
                          <button onClick={() => setImportPage(p => Math.min(importTotalPages, p + 1))} disabled={importPage === importTotalPages}
                            className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight size={14} className="text-surface-600" />
                          </button>
                          <button onClick={() => setImportPage(importTotalPages)} disabled={importPage === importTotalPages}
                            className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-surface-600">
                            <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Column summary */}
                  <Card>
                    <CardHeader><h2 className="text-base font-semibold text-surface-700">Column Summary</h2></CardHeader>
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {importedHeaders.map((h, i) => {
                          const colData = importedData.map(r => r[i]).filter(v => v !== undefined && v !== '');
                          const filled = colData.length;
                          const empty = importedData.length - filled;
                          const isNumeric = colData.length > 0 && colData.every(v => !isNaN(Number(v)));
                          return (
                            <div key={i} className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                              <p className="text-xs font-semibold text-surface-700 truncate mb-1.5" title={h}>{h || `Col ${i + 1}`}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-surface-400">Filled</span>
                                  <span className="text-surface-600 font-medium">{filled}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-surface-400">Empty</span>
                                  <span className="text-surface-600 font-medium">{empty}</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-400 rounded-full" style={{ width: `${importedData.length ? (filled / importedData.length) * 100 : 0}%` }} />
                                </div>
                                <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-medium rounded ${isNumeric ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {isNumeric ? 'Numeric' : 'Text'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
