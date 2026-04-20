import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Users, Plus, Search, Phone, Edit, Trash2, Eye, Download, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X, Columns3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square, MinusSquare, MoreHorizontal, RotateCcw, ArrowUpDown, SlidersHorizontal, AlertCircle, Clock, UserCheck, Star, UserX, CalendarClock, MessageSquare } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Card } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { customers as customersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function mapCustomer(c) {
  return {
    id: c.id, name: c.name, phone: c.phone || '', email: c.email || '', dob: c.dob ? c.dob.slice(0, 10) : '',
    gender: c.gender || '', tag: (c.tag || 'new').toLowerCase(), stage: 'converted',
    visits: c.totalVisits || 0, totalSpent: c.totalSpent || 0,
    lastVisit: c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : '', notes: c.notes || '',
    joinedDate: c.createdAt ? c.createdAt.slice(0, 10) : '',
    outstandingDues: c.outstandingDues || 0,
    referredBy: c.referredBy || '',
  };
}

const STAGE_OPTIONS = ['enquiry', 'cold', 'warm', 'hot', 'converted', 'loyal', 'champion', 'lost'];

const emptyForm = { name: '', phone: '', email: '', dob: '', gender: 'Female', tag: 'new', stage: 'enquiry', notes: '', referredBy: '' };

const QUICK_FILTERS = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'new', label: 'New', icon: UserCheck, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'regular', label: 'Regular', icon: Clock, color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'vip', label: 'VIP', icon: Star, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'inactive', label: 'Inactive', icon: UserX, color: 'bg-surface-100 text-surface-600 border-surface-200' },
  { key: 'has-dues', label: 'Has Dues', icon: AlertCircle, color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'first-time', label: 'First Visit', icon: UserCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'frequent', label: 'Frequent (5+)', icon: Star, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'lapsed', label: 'Lapsed (90d+)', icon: CalendarClock, color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const LAST_VISIT_SHORTCUTS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Over 6 months', days: -180 },
];

const allColumns = [
  { key: 'name', label: 'Customer', sortable: true, filterable: true, type: 'text', alwaysVisible: true },
  { key: 'phone', label: 'Phone', sortable: true, filterable: true, type: 'text' },
  { key: 'email', label: 'Email', sortable: true, filterable: true, type: 'text' },
  { key: 'gender', label: 'Gender', sortable: true, filterable: true, type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'tag', label: 'Status', sortable: true, filterable: true, type: 'select', options: ['new', 'regular', 'vip', 'inactive'] },
  { key: 'stage', label: 'Stage', sortable: true, filterable: true, type: 'select', options: STAGE_OPTIONS },
  { key: 'visits', label: 'Visits', sortable: true, filterable: true, type: 'number' },
  { key: 'totalSpent', label: 'Total Spent', sortable: true, filterable: true, type: 'number' },
  { key: 'lastVisit', label: 'Last Visit', sortable: true, filterable: true, type: 'date' },
  { key: 'joinedDate', label: 'Joined', sortable: true, filterable: true, type: 'date' },
];

function SortIcon({ direction }) {
  if (direction === 'asc') return <ChevronUp size={14} className="text-primary-600" />;
  if (direction === 'desc') return <ChevronDown size={14} className="text-primary-600" />;
  return <ChevronsUpDown size={14} className="text-surface-300" />;
}

function ColumnFilterPopover({ column, value, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white border border-surface-200 rounded-lg shadow-lg p-3 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-surface-600">Filter {column.label}</span>
        {value && <button onClick={() => onChange('')} className="text-xs text-primary-600 hover:text-primary-700">Clear</button>}
      </div>
      {column.type === 'select' ? (
        <div className="space-y-1">
          <button onClick={() => onChange('')}
            className={`w-full text-left px-2 py-1.5 text-xs rounded ${!value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-600 hover:bg-surface-50'}`}>
            All
          </button>
          {column.options.map(opt => (
            <button key={opt} onClick={() => onChange(opt)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded capitalize ${value === opt ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-600 hover:bg-surface-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      ) : column.type === 'number' ? (
        <div className="space-y-2">
          <input type="number" placeholder="Min" value={value?.min || ''}
            onChange={e => onChange({ ...value, min: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
          <input type="number" placeholder="Max" value={value?.max || ''}
            onChange={e => onChange({ ...value, max: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
        </div>
      ) : column.type === 'date' ? (
        <div className="space-y-2">
          <label className="text-xs text-surface-500">From</label>
          <input type="date" value={value?.from || ''}
            onChange={e => onChange({ ...value, from: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
          <label className="text-xs text-surface-500">To</label>
          <input type="date" value={value?.to || ''}
            onChange={e => onChange({ ...value, to: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
          {(column.key === 'lastVisit' || column.key === 'joinedDate') && (
            <div className="border-t border-surface-100 pt-2 mt-1 space-y-1">
              <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Quick ranges</span>
              {LAST_VISIT_SHORTCUTS.map(s => {
                const today = new Date();
                let from, to;
                if (s.days > 0) {
                  from = new Date(today.getTime() - s.days * 86400000).toISOString().slice(0, 10);
                  to = today.toISOString().slice(0, 10);
                } else {
                  from = '';
                  to = new Date(today.getTime() + s.days * 86400000).toISOString().slice(0, 10);
                }
                return (
                  <button key={s.label} type="button" onClick={() => onChange({ from, to })}
                    className="w-full text-left px-2 py-1.5 text-xs rounded text-surface-600 hover:bg-surface-50 transition-colors">
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <input type="text" placeholder={`Search ${column.label.toLowerCase()}...`} value={value || ''}
          onChange={e => onChange(e.target.value)} autoFocus
          className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300" />
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const res = await customersApi.list({ limit: 200 });
        setCustomers((res.data || []).map(mapCustomer));
      } catch (err) { console.error('Failed to load customers:', err); toast.error(err.message || 'Failed to load customers'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [waModal, setWaModal] = useState({ open: false, customer: null });

  // Quick filter state
  const [quickFilter, setQuickFilter] = useState('all');

  // Grid state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [visibleCols, setVisibleCols] = useState(['name', 'phone', 'gender', 'tag', 'stage', 'visits', 'totalSpent', 'lastVisit']);
  const [showColMenu, setShowColMenu] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [density, setDensity] = useState('normal'); // compact, normal, comfortable
  const colMenuRef = useRef(null);

  // Close column menu on outside click
  useEffect(() => {
    const handleClick = (e) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setShowColMenu(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sorting
  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  }, []);

  // Column filter change
  const setColFilter = useCallback((key, value) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!value || value === '' || (typeof value === 'object' && !value.min && !value.max && !value.from && !value.to)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  // Filter + sort pipeline
  const processedData = useMemo(() => {
    let data = [...customers];

    // Quick filters
    if (quickFilter && quickFilter !== 'all') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const d90ago = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      switch (quickFilter) {
        case 'new': case 'regular': case 'vip': case 'inactive':
          data = data.filter(c => c.tag === quickFilter); break;
        case 'has-dues':
          data = data.filter(c => c.outstandingDues > 0); break;
        case 'first-time':
          data = data.filter(c => c.visits <= 1); break;
        case 'frequent':
          data = data.filter(c => c.visits >= 5); break;
        case 'lapsed':
          data = data.filter(c => c.lastVisit && c.lastVisit < d90ago); break;
      }
    }

    // Global search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      data = data.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q) ||
        (c.stage || '').toLowerCase().includes(q) ||
        c.gender.toLowerCase().includes(q)
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, val]) => {
      const col = allColumns.find(c => c.key === key);
      if (!col) return;
      data = data.filter(row => {
        const cellVal = row[key];
        if (col.type === 'select') {
          return String(cellVal).toLowerCase() === String(val).toLowerCase();
        } else if (col.type === 'number') {
          const num = Number(cellVal);
          if (val.min && num < Number(val.min)) return false;
          if (val.max && num > Number(val.max)) return false;
          return true;
        } else if (col.type === 'date') {
          if (val.from && cellVal < val.from) return false;
          if (val.to && cellVal > val.to) return false;
          return true;
        } else {
          return String(cellVal).toLowerCase().includes(String(val).toLowerCase());
        }
      });
    });

    // Sort
    if (sortConfig.key) {
      const col = allColumns.find(c => c.key === sortConfig.key);
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (col?.type === 'number') { aVal = Number(aVal); bVal = Number(bVal); }
        else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [customers, globalSearch, columnFilters, sortConfig, quickFilter]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, page, rowsPerPage]);

  // Reset page when filters change
  useEffect(() => { if (page > totalPages && totalPages > 0) setPage(totalPages); }, [totalPages, page]);

  // Row selection
  const allPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.id));
  const somePageSelected = paginatedData.some(r => selectedRows.has(r.id));
  const toggleSelectAll = () => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedData.forEach(r => next.delete(r.id));
      } else {
        paginatedData.forEach(r => next.add(r.id));
      }
      return next;
    });
  };
  const toggleSelectRow = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeFiltersCount = Object.keys(columnFilters).length + (quickFilter !== 'all' ? 1 : 0);

  // Helper for highlighting search matches
  const highlightMatch = useCallback((text, query) => {
    if (!query || !text) return text;
    const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const str = String(text);
    return (
      <>{str.slice(0, idx)}<mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{str.slice(idx, idx + query.length)}</mark>{str.slice(idx + query.length)}</>
    );
  }, []);

  // CRUD handlers
  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email, dob: c.dob, gender: c.gender, tag: c.tag, stage: c.stage || 'enquiry', notes: c.notes, referredBy: c.referredBy || '' }); setShowModal(true); };
  const openView = (c) => { setViewing(c); setShowView(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await customersApi.update(editing.id, { name: form.name, phone: form.phone, email: form.email || null, dob: form.dob || null, gender: form.gender, tag: form.tag.toUpperCase(), notes: form.notes || null, referredBy: form.referredBy || null });
        setCustomers(prev => prev.map(c => c.id === editing.id ? { ...c, ...form, tag: form.tag } : c));
        toast.success('Customer updated');
      } else {
        const res = await customersApi.create({ name: form.name, phone: form.phone, email: form.email || null, dob: form.dob || null, gender: form.gender, tag: form.tag.toUpperCase(), notes: form.notes || null, referredBy: form.referredBy || null });
        setCustomers(prev => [...prev, mapCustomer(res)]);
        toast.success('Customer created');
      }
    } catch (err) { toast.error(err.message || 'Failed to save customer'); return; }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this customer?')) return;
    try {
      await customersApi.remove(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelectedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Customer deleted');
    } catch (err) { toast.error(err.message || 'Failed to delete customer'); }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} selected customer(s)?`)) return;
    const ids = [...selectedRows];
    try {
      await Promise.all(ids.map(id => customersApi.remove(id)));
      setCustomers(prev => prev.filter(c => !selectedRows.has(c.id)));
      toast.success(`${ids.length} customer(s) deleted`);
    } catch (err) { toast.error(err.message || 'Failed to delete some customers'); }
    setSelectedRows(new Set());
  };

  const resetAllFilters = () => {
    setGlobalSearch('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: null });
    setQuickFilter('all');
    setPage(1);
  };

  const exportCSV = () => {
    const exportData = selectedRows.size > 0
      ? processedData.filter(c => selectedRows.has(c.id))
      : processedData;
    const headers = ['Name', 'Phone', 'Email', 'Gender', 'Status', 'Stage', 'Visits', 'Total Spent', 'Last Visit', 'Joined'];
    const rows = exportData.map(c => [c.name, c.phone, c.email, c.gender, c.tag, c.stage || '', c.visits, c.totalSpent, c.lastVisit, c.joinedDate]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const densityPadding = { compact: 'px-3 py-1.5', normal: 'px-4 py-3', comfortable: 'px-5 py-4' };
  const densityText = { compact: 'text-xs', normal: 'text-sm', comfortable: 'text-sm' };

  const renderCellContent = (col, c) => {
    switch (col.key) {
      case 'name':
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-primary-700">{c.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-surface-700 truncate">{globalSearch ? highlightMatch(c.name, globalSearch) : c.name}</span>
                {c.outstandingDues > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
                    Due {'\u20B9'}{c.outstandingDues.toLocaleString()}
                  </span>
                )}
              </div>
              {c.email && <span className="text-[11px] text-surface-400 block truncate">{globalSearch ? highlightMatch(c.email, globalSearch) : c.email}</span>}
            </div>
          </div>
        );
      case 'phone':
        return <div className="flex items-center gap-1 text-surface-500"><Phone size={12} /> {globalSearch ? highlightMatch(c.phone, globalSearch) : c.phone}</div>;
      case 'email':
        return <span className="text-surface-500 truncate block">{c.email ? (globalSearch ? highlightMatch(c.email, globalSearch) : c.email) : '—'}</span>;
      case 'gender':
        return <span className="text-surface-600">{c.gender}</span>;
      case 'tag':
        return <Badge status={c.tag} />;
      case 'stage':
        return <Badge status={c.stage} />;
      case 'visits':
        return <span className="text-surface-600 font-medium">{c.visits}</span>;
      case 'totalSpent':
        return <span className="text-surface-700 font-semibold">{'\u20B9'}{c.totalSpent.toLocaleString()}</span>;
      case 'lastVisit':
        return <span className="text-surface-500">{c.lastVisit}</span>;
      case 'joinedDate':
        return <span className="text-surface-400">{c.joinedDate}</span>;
      default:
        return String(c[col.key] ?? '');
    }
  };

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer database"
        actions={<Button onClick={openAdd}><Plus size={16} /> Add Customer</Button>} />

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {QUICK_FILTERS.map(f => {
          const Icon = f.icon;
          const active = quickFilter === f.key;
          return (
            <button key={f.key} onClick={() => { setQuickFilter(f.key); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                active
                  ? f.color || 'bg-primary-50 text-primary-700 border-primary-300 ring-1 ring-primary-200'
                  : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50 hover:border-surface-300'
              } ${active ? 'ring-1 ring-offset-0 ' + (f.color ? f.color.split(' ')[2] : 'ring-primary-200') : ''}`}>
              <Icon size={12} />
              {f.label}
              {f.key !== 'all' && (() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const d90ago = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
                let count = 0;
                switch (f.key) {
                  case 'new': case 'regular': case 'vip': case 'inactive': count = customers.filter(c => c.tag === f.key).length; break;
                  case 'has-dues': count = customers.filter(c => c.outstandingDues > 0).length; break;
                  case 'first-time': count = customers.filter(c => c.visits <= 1).length; break;
                  case 'frequent': count = customers.filter(c => c.visits >= 5).length; break;
                  case 'lapsed': count = customers.filter(c => c.lastVisit && c.lastVisit < d90ago).length; break;
                }
                return count > 0 ? <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-white/60' : 'bg-surface-100'}`}>{count}</span> : null;
              })()}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <Card className="mb-4">
        <div className="p-3 sm:p-4 space-y-3">
          {/* Row 1: Search + main actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Search customers by name, phone, email, status..." value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-surface-400" />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Column visibility */}
              <div className="relative" ref={colMenuRef}>
                <button onClick={() => setShowColMenu(p => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors">
                  <Columns3 size={14} /> Columns
                </button>
                {showColMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-surface-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                    <p className="text-xs font-semibold text-surface-500 mb-2">Toggle Columns</p>
                    {allColumns.map(col => (
                      <label key={col.key} className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer hover:bg-surface-50 ${col.alwaysVisible ? 'opacity-50' : ''}`}>
                        <input type="checkbox" checked={visibleCols.includes(col.key)} disabled={col.alwaysVisible}
                          onChange={() => {
                            if (col.alwaysVisible) return;
                            setVisibleCols(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]);
                          }}
                          className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                        <span className="text-surface-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Density */}
              <select value={density} onChange={e => setDensity(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 cursor-pointer">
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Comfortable</option>
              </select>

              {/* Export */}
              <button onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors">
                <Download size={14} /> Export
              </button>

              {/* Reset filters */}
              {(activeFiltersCount > 0 || globalSearch || sortConfig.key || quickFilter !== 'all') && (
                <button onClick={resetAllFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-danger-200 bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Active filters & bulk actions */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Column filter chips */}
              {Object.entries(columnFilters).map(([key, val]) => {
                const col = allColumns.find(c => c.key === key);
                let display = '';
                if (typeof val === 'string') display = val;
                else if (val.min || val.max) display = `${val.min || '0'} - ${val.max || '∞'}`;
                else if (val.from || val.to) display = `${val.from || '...'} → ${val.to || '...'}`;
                return (
                  <span key={key} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                    <Filter size={10} /> {col?.label}: <strong className="capitalize">{display}</strong>
                    <button onClick={() => setColFilter(key, '')} className="ml-0.5 hover:text-primary-900"><X size={12} /></button>
                  </span>
                );
              })}
              {sortConfig.key && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-accent-50 text-accent-700 border border-accent-200">
                  <ArrowUpDown size={10} /> Sort: {allColumns.find(c => c.key === sortConfig.key)?.label} ({sortConfig.direction})
                  <button onClick={() => setSortConfig({ key: null, direction: null })} className="ml-0.5 hover:text-accent-900"><X size={12} /></button>
                </span>
              )}
              <span className="text-xs text-surface-400">
                {processedData.length} result{processedData.length !== 1 ? 's' : ''}
                {selectedRows.size > 0 && ` · ${selectedRows.size} selected`}
              </span>
            </div>

            {/* Bulk actions */}
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const firstSelected = customers.find(c => selectedRows.has(c.id));
                  if (firstSelected) setWaModal({ open: true, customer: { id: firstSelected.id, name: firstSelected.name, phone: firstSelected.phone }, bulk: true, ids: [...selectedRows] });
                }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                  <MessageSquare size={12} /> Message ({selectedRows.size})
                </button>
                {user?.role === 'admin' && <button onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger-50 text-danger-600 border border-danger-200 hover:bg-danger-100 transition-colors">
                  <Trash2 size={12} /> Delete ({selectedRows.size})
                </button>}
                <button onClick={() => setSelectedRows(new Set())}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-50 text-surface-600 border border-surface-200 hover:bg-surface-100 transition-colors">
                  <X size={12} /> Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Data Grid */}
      <Card>
        <div className="overflow-x-auto">
          <table className={`w-full ${densityText[density]}`}>
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/70">
                {/* Checkbox col */}
                <th className={`${densityPadding[density]} w-10`}>
                  <button onClick={toggleSelectAll} className="text-surface-400 hover:text-surface-600">
                    {allPageSelected ? <CheckSquare size={16} className="text-primary-600" /> : somePageSelected ? <MinusSquare size={16} className="text-primary-400" /> : <Square size={16} />}
                  </button>
                </th>
                {allColumns.filter(c => visibleCols.includes(c.key)).map(col => (
                  <th key={col.key} className={`${densityPadding[density]} font-semibold text-surface-600 text-left relative group`}>
                    <div className="flex items-center gap-1">
                      {col.sortable ? (
                        <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                          {col.label}
                          <SortIcon direction={sortConfig.key === col.key ? sortConfig.direction : null} />
                        </button>
                      ) : (
                        <span>{col.label}</span>
                      )}
                      {col.filterable && (
                        <button onClick={(e) => { e.stopPropagation(); setActiveFilterCol(prev => prev === col.key ? null : col.key); }}
                          className={`ml-1 transition-opacity ${activeFilterCol === col.key || columnFilters[col.key] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${columnFilters[col.key] ? 'text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}>
                          <Filter size={12} />
                        </button>
                      )}
                    </div>
                    {activeFilterCol === col.key && (
                      <ColumnFilterPopover column={col} value={columnFilters[col.key] || ''} onChange={(v) => setColFilter(col.key, v)} onClose={() => setActiveFilterCol(null)} />
                    )}
                  </th>
                ))}
                {/* Actions col */}
                <th className={`${densityPadding[density]} font-semibold text-surface-600 text-left w-28`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((c) => {
                const isSelected = selectedRows.has(c.id);
                return (
                  <tr key={c.id} onClick={() => setDetailCustomer(c)} className={`border-b border-surface-50 transition-colors cursor-pointer ${isSelected ? 'bg-primary-50/40' : 'hover:bg-surface-50/50'}`}>
                    <td className={`${densityPadding[density]}`}>
                      <button onClick={(e) => { e.stopPropagation(); toggleSelectRow(c.id); }} className="text-surface-400 hover:text-surface-600">
                        {isSelected ? <CheckSquare size={16} className="text-primary-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    {allColumns.filter(col => visibleCols.includes(col.key)).map(col => (
                      <td key={col.key} className={`${densityPadding[density]}`}>
                        {renderCellContent(col, c)}
                      </td>
                    ))}
                    <td className={`${densityPadding[density]}`}>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openView(c); }} title="View"><Eye size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Edit"><Edit size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setWaModal({ open: true, customer: { id: c.id, name: c.name, phone: c.phone } }); }} title="WhatsApp"><MessageSquare size={14} className="text-green-600" /></Button>
                        {user?.role === 'admin' && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} title="Delete"><Trash2 size={14} className="text-danger-500" /></Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-surface-300" />
                      <p className="text-surface-400 font-medium">No customers found</p>
                      <p className="text-xs text-surface-300">Try adjusting your search or filter criteria</p>
                      {(activeFiltersCount > 0 || globalSearch) && (
                        <button onClick={resetAllFilters} className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-medium">Reset all filters</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {processedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-100">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 border border-surface-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-300 cursor-pointer">
                {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ml-2">
                {Math.min((page - 1) * rowsPerPage + 1, processedData.length)}–{Math.min(page * rowsPerPage, processedData.length)} of {processedData.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsLeft size={16} className="text-surface-600" />
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} className="text-surface-600" />
              </button>
              {/* Page numbers */}
              <div className="flex items-center gap-0.5 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} className="px-1 text-xs text-surface-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === p ? 'bg-primary-600 text-white' : 'text-surface-600 hover:bg-surface-100'}`}>
                        {p}
                      </button>
                    )
                  )}
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} className="text-surface-600" />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsRight size={16} className="text-surface-600" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Side Panel */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
              <h2 className="text-lg font-semibold text-surface-800">{editing ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number *</label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                    <option>Female</option><option>Male</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Tag</label>
                  <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                    <option value="new">New</option><option value="regular">Regular</option><option value="vip">VIP</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Lead Stage</label>
                  <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400">
                    {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Referred By</label>
                  <input value={form.referredBy} onChange={e => setForm({...form, referredBy: e.target.value})}
                    placeholder="Name of referring customer"
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">{editing ? 'Save Changes' : 'Add Customer'}</Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* View Modal */}
      <Modal isOpen={showView} onClose={() => setShowView(false)} title="Customer Profile" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-surface-100">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-700">{viewing.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-surface-800">{viewing.name}</h3>
                <p className="text-sm text-surface-500">{viewing.phone} {viewing.email && `\u00B7 ${viewing.email}`}</p>
              </div>
              <Badge status={viewing.tag} />
              {viewing.stage && <Badge status={viewing.stage} />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{viewing.visits}</p>
                <p className="text-xs text-surface-500">Total Visits</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{'\u20B9'}{viewing.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-surface-500">Total Spent</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{viewing.lastVisit}</p>
                <p className="text-xs text-surface-500">Last Visit</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-100 text-center">
                <p className="text-lg font-bold text-surface-800">{viewing.joinedDate}</p>
                <p className="text-xs text-surface-500">Joined</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-400">Gender:</span> <span className="text-surface-700 ml-1">{viewing.gender}</span></div>
              {viewing.dob && <div><span className="text-surface-400">Birthday:</span> <span className="text-surface-700 ml-1">{viewing.dob}</span></div>}
            </div>
            {viewing.notes && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-amber-800">{viewing.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowView(false); openEdit(viewing); }}>Edit Profile</Button>
              <Button onClick={() => setShowView(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {detailCustomer && (
        <CustomerDetailPanel
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
          onEdit={(c) => { setDetailCustomer(null); openEdit(c); }}
        />
      )}

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, customer: null })}
        customer={waModal.customer}
        template="custom"
      />
    </div>
  );
}