import { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  Filter,
  CreditCard,
  Wallet,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Scissors,
  Users,
  Receipt,
  Target,
  Activity,
  Clock,
  CalendarCheck,
  UserPlus,
  Package,
  Crown,
  Percent,
  Sun,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area, ComposedChart, ReferenceLine } from 'recharts';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { reports as reportsApi, dashboard as dashboardApi, invoices as invoicesApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Fallback empty arrays (API data replaces these)
const monthlyRevenue = [];
const dailyRevenue = [];
const paymentModes = [];
const serviceRevenue = [];
const stylistRevenue = [];
const expenseBreakdown = [];
const recentTransactions = [];
const retentionCohorts = [];
const churnData = [];
const clvSegments = [];
const heatmapData = [];
const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapHours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM'];
const peakServices = [];
const goals = [];

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'daily', label: 'Daily Summary', icon: Sun },
  { key: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { key: 'customers', label: 'Customers', icon: UserPlus },
  { key: 'services', label: 'Service Revenue', icon: Scissors },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'staff', label: 'Staff Performance', icon: Users },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'memberships', label: 'Memberships', icon: Crown },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'discounts', label: 'Discounts', icon: Percent },
  { key: 'retention', label: 'Retention', icon: Activity },
  { key: 'demand', label: 'Demand Heatmap', icon: Clock },
  { key: 'goals', label: 'Goals', icon: Target },
];

const modeIcons = { UPI: Wallet, Cash: Banknote, Card: CreditCard, Wallet: Wallet, Pending: IndianRupee };

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const toast = useToast();
  const { salonName } = useSettings();

  // API state
  const [apiMonthlyRevenue, setApiMonthlyRevenue] = useState(null);
  const [apiDailyRevenue, setApiDailyRevenue] = useState(null);
  const [apiServiceRevenue, setApiServiceRevenue] = useState(null);
  const [apiStylistRevenue, setApiStylistRevenue] = useState(null);
  const [apiTransactions, setApiTransactions] = useState(null);
  const [apptStats, setApptStats] = useState(null);
  const [custAnalytics, setCustAnalytics] = useState(null);
  const [productData, setProductData] = useState(null);
  const [membershipData, setMembershipData] = useState(null);
  const [discountData, setDiscountData] = useState(null);
  const [dailyData, setDailyData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardApi.revenueChart(9);
        if (res?.data?.length) {
          setApiMonthlyRevenue(res.data.map(m => ({
            month: m.month.split(' ')[0],
            revenue: m.revenue,
            expenses: Math.round(m.revenue * 0.45),
            profit: Math.round(m.revenue * 0.55),
          })));
        }
      } catch (e) { console.error('monthly revenue', e); toast.error('Failed to load monthly revenue'); }

      try {
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const to = now.toISOString().split('T')[0];
        const res = await reportsApi.revenue({ groupBy: 'day', from, to });
        if (res?.data?.length) {
          setApiDailyRevenue(res.data.map(d => ({
            day: d.date.split('-')[2],
            amount: d.revenue,
          })));
        }
      } catch (e) { console.error('daily revenue', e); toast.error('Failed to load daily revenue'); }

      try {
        const res = await dashboardApi.topServices(10);
        if (res?.data?.length) {
          setApiServiceRevenue(res.data.map(s => ({
            service: s.name,
            revenue: s.revenue,
            bookings: s.bookings,
            avgTicket: s.bookings > 0 ? Math.round(s.revenue / s.bookings) : 0,
          })));
        }
      } catch (e) { console.error('service revenue', e); toast.error('Failed to load service data'); }

      try {
        const res = await dashboardApi.stylistPerformance();
        if (res?.data?.length) {
          setApiStylistRevenue(res.data.map(s => ({
            name: s.name,
            revenue: s.revenue,
            clients: s.appointments,
            avgRating: 4.5,
            topService: '-',
          })));
        }
      } catch (e) { console.error('stylist performance', e); toast.error('Failed to load stylist data'); }

      try {
        const res = await invoicesApi.list({ limit: 8 });
        const list = res?.data || res || [];
        if (list.length) {
          setApiTransactions(list.map((inv, i) => ({
            id: inv.invoiceNumber || `TXN-${String(i + 1).padStart(4, '0')}`,
            customer: inv.customer?.name || 'Unknown',
            service: inv.items?.[0]?.service?.name || '-',
            amount: inv.totalAmount || 0,
            mode: inv.paymentMode ? inv.paymentMode.charAt(0) + inv.paymentMode.slice(1).toLowerCase() : 'Cash',
            date: inv.createdAt ? inv.createdAt.split('T')[0] : '-',
            time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          })));
        }
      } catch (e) { console.error('transactions', e); toast.error('Failed to load transactions'); }

      // New report endpoints
      try { const res = await reportsApi.appointmentStats(); if (res?.data) setApptStats(res.data); } catch (e) { console.error('appt stats', e); }
      try { const res = await reportsApi.customerAnalytics(); if (res?.data) setCustAnalytics(res.data); } catch (e) { console.error('cust analytics', e); }
      try { const res = await reportsApi.productReports(); if (res?.data) setProductData(res.data); } catch (e) { console.error('product reports', e); }
      try { const res = await reportsApi.membershipReports(); if (res?.data) setMembershipData(res.data); } catch (e) { console.error('membership reports', e); }
      try { const res = await reportsApi.discountAnalytics(); if (res?.data) setDiscountData(res.data); } catch (e) { console.error('discount analytics', e); }
      try { const res = await reportsApi.dailySummary(); if (res?.data) setDailyData(res.data); } catch (e) { console.error('daily summary', e); }
    })();
  }, []);

  // Use API data with hardcoded fallbacks
  const activeMonthly = apiMonthlyRevenue || monthlyRevenue;
  const activeDaily = apiDailyRevenue || dailyRevenue;
  const activeSvcRevenue = apiServiceRevenue || serviceRevenue;
  const activeStylists = apiStylistRevenue || stylistRevenue;
  const activeTxns = apiTransactions || recentTransactions;

  // Summary stats
  const totalRevenue = activeMonthly.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = activeMonthly.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const todayRev = activeDaily.length > 0 ? activeDaily[activeDaily.length - 1]?.amount || 0 : 0;

  const exportCSV = async () => {
    try {
      const res = await reportsApi.exportCsv('invoices');
      const blob = new Blob([res], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'invoices.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to client-side
      const headers = 'Transaction ID,Customer,Service,Amount,Mode,Date,Time\n';
      const rows = activeTxns.map(t => `${t.id},${t.customer},${t.service},${t.amount},${t.mode},${t.date},${t.time}`).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'transactions.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${salonName} — Financial Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    // Summary
    doc.setFontSize(12);
    doc.text('Summary', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', `₹${totalRevenue.toLocaleString()}`],
        ['Total Expenses', `₹${totalExpenses.toLocaleString()}`],
        ['Net Profit', `₹${totalProfit.toLocaleString()}`],
        ['Profit Margin', `${((totalProfit / totalRevenue) * 100).toFixed(1)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 143, 244] },
    });

    // Recent Transactions
    doc.text('Recent Transactions', 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['ID', 'Customer', 'Service', 'Amount', 'Mode', 'Date']],
      body: activeTxns.map(t => [t.id, t.customer, t.service, `₹${t.amount}`, t.mode, t.date]),
      theme: 'striped',
      headStyles: { fillColor: [59, 143, 244] },
      styles: { fontSize: 8 },
    });

    doc.save('salon-report.pdf');
  };

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        subtitle="Revenue, expenses, and business performance analytics"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors">
              <Download size={14} /> CSV
            </button>
            <button onClick={exportPDF} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label="Today's Revenue" value={`\u20B9${todayRev.toLocaleString()}`} change="+8% vs yesterday" changeType="up" />
        <StatCard icon={TrendingUp} label="Monthly Revenue" value={`\u20B9${(totalRevenue / 1000).toFixed(0)}k`} change="+14% vs last period" changeType="up" />
        <StatCard icon={TrendingDown} label="Total Expenses" value={`\u20B9${(totalExpenses / 1000).toFixed(0)}k`} change="+5% vs last period" changeType="down" />
        <StatCard icon={IndianRupee} label="Net Profit" value={`\u20B9${(totalProfit / 1000).toFixed(0)}k`} change={`${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin`} changeType="up" />
      </div>

      {/* Tabs */}
      <div className="flex gap-6">
        {/* Left sidebar nav */}
        <div className="hidden lg:flex flex-col w-48 flex-shrink-0 space-y-0.5 sticky top-4 self-start">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${activeTab === t.key ? 'bg-primary-600 text-white' : 'text-surface-600 hover:bg-surface-100'}`}>
                <Icon size={15} className="flex-shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>
        {/* Mobile horizontal scroll tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1 lg:hidden">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === t.key ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
        {/* Right content area */}
        <div className="flex-1 min-w-0">

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue vs Expenses vs Profit chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-surface-700">Revenue vs Expenses vs Profit</h2>
                <span className="text-xs text-surface-400">Last 9 months</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeMonthly} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`\u20B9${v.toLocaleString()}`, n.charAt(0).toUpperCase() + n.slice(1)]} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="revenue" fill="#3b8ff4" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Daily Revenue Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-surface-700">Daily Revenue — April 2026</h2>
                <span className="text-xs text-surface-400">Up to today</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `Apr ${v}`} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b8ff4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b8ff4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="amount" stroke="#3b8ff4" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-surface-700">Recent Transactions</h2>
                <span className="text-xs text-surface-400">{activeTxns.length} records</span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Service</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Amount</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Mode</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTxns.map(t => (
                      <tr key={t.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-surface-500">{t.id}</td>
                        <td className="px-4 py-3 font-medium text-surface-700">{t.customer}</td>
                        <td className="px-4 py-3 text-surface-500">{t.service}</td>
                        <td className="px-4 py-3 text-right font-semibold text-surface-700">{'\u20B9'}{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${t.mode === 'UPI' ? 'bg-blue-50 text-blue-600' : t.mode === 'Cash' ? 'bg-green-50 text-green-600' : t.mode === 'Card' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>
                            {t.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-surface-400">{t.date} · {t.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Service Revenue Table */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-surface-700">Revenue by Service</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Service</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Bookings</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Avg Ticket</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSvcRevenue.map((s, i) => {
                      const totalSvcRev = activeSvcRevenue.reduce((sum, x) => sum + x.revenue, 0);
                      const share = ((s.revenue / totalSvcRev) * 100).toFixed(1);
                      return (
                        <tr key={s.service} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-600">{i + 1}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-surface-700">{s.service}</td>
                          <td className="px-4 py-3 text-right font-semibold text-surface-700">{'\u20B9'}{s.revenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-surface-500">{s.bookings}</td>
                          <td className="px-4 py-3 text-right text-surface-500">{'\u20B9'}{s.avgTicket.toLocaleString()}</td>
                          <td className="px-4 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-400 rounded-full" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-xs text-surface-400 w-10 text-right">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 border-t border-surface-200">
                      <td colSpan={2} className="px-4 py-3 font-semibold text-surface-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">{'\u20B9'}{activeSvcRevenue.reduce((s, x) => s + x.revenue, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-600">{activeSvcRevenue.reduce((s, x) => s + x.bookings, 0)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Service Revenue Bar Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-surface-700">Service Revenue Chart</h2>
            </CardHeader>
            <CardBody>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeSvcRevenue.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v / 1000}k`} />
                    <YAxis type="category" dataKey="service" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3b8ff4" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Payment Mode Pie Chart */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-surface-700">Payment Mode Breakdown</h2>
              </CardHeader>
              <CardBody className="flex flex-col items-center">
                <div className="h-56 w-full max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentModes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {paymentModes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}%`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  {paymentModes.map(m => (
                    <div key={m.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-xs text-surface-500">{m.name} ({m.value}%)</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Payment Mode Cards */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-surface-700">Collection by Mode</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {paymentModes.map(m => {
                    const Icon = modeIcons[m.name] || IndianRupee;
                    return (
                      <div key={m.name} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${m.color}15` }}>
                          <Icon size={16} style={{ color: m.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-surface-700">{m.name}</p>
                            <p className="text-sm font-bold text-surface-700">{'\u20B9'}{m.amount.toLocaleString()}</p>
                          </div>
                          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-surface-400 w-10 text-right">{m.value}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-surface-700">Staff Performance & Revenue</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Stylist</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Clients</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Avg/Client</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Rating</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Top Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStylists.map((s, i) => (
                      <tr key={s.name} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-surface-200 text-surface-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-100 text-surface-500'}`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary-700">{s.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <span className="font-medium text-surface-700">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-surface-700">{'\u20B9'}{s.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-surface-500">{s.clients}</td>
                        <td className="px-4 py-3 text-right text-surface-500">{'\u20B9'}{Math.round(s.revenue / s.clients).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ${s.avgRating >= 4.7 ? 'bg-green-50 text-green-600' : s.avgRating >= 4.5 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            ★ {s.avgRating}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-surface-500">{s.topService}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 border-t border-surface-200">
                      <td colSpan={2} className="px-4 py-3 font-semibold text-surface-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">{'\u20B9'}{activeStylists.reduce((s, x) => s + x.revenue, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-600">{activeStylists.reduce((s, x) => s + x.clients, 0)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Staff Revenue Bar Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-surface-700">Revenue by Stylist</h2>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeStylists}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`\u20B9${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3b8ff4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Expense Pie */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-surface-700">Expense Breakdown</h2>
              </CardHeader>
              <CardBody className="flex flex-col items-center">
                <div className="h-56 w-full max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="amount" nameKey="category">
                        {expenseBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`\u20B9${v.toLocaleString()}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  {expenseBreakdown.map(e => (
                    <div key={e.category} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-xs text-surface-500">{e.category}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-surface-700">Expense Categories</h2>
                  <span className="text-xs font-medium px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{'\u20B9'}{expenseBreakdown.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {expenseBreakdown.map(e => (
                    <div key={e.category} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${e.color}15` }}>
                        <Receipt size={16} style={{ color: e.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-surface-700">{e.category}</p>
                          <p className="text-sm font-bold text-surface-700">{'\u20B9'}{e.amount.toLocaleString()}</p>
                        </div>
                        <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${e.percentage}%`, backgroundColor: e.color }} />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-surface-400 w-12 text-right">{e.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Monthly Expense Trend */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-surface-700">Monthly Expense Trend</h2>
            </CardHeader>
            <CardBody>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`\u20B9${v.toLocaleString()}`]} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#3b8ff4" strokeWidth={2} name="Revenue" dot={{ r: 3 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* RETENTION TAB */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardBody className="text-center py-5">
              <p className="text-2xl font-bold text-green-600">82%</p>
              <p className="text-xs text-surface-400 mt-0.5">Retention Rate</p>
              <p className="text-[10px] text-green-500 mt-1">↑ 4% vs last quarter</p>
            </CardBody></Card>
            <Card><CardBody className="text-center py-5">
              <p className="text-2xl font-bold text-red-500">3.8%</p>
              <p className="text-xs text-surface-400 mt-0.5">Churn Rate (Mar)</p>
              <p className="text-[10px] text-green-500 mt-1">↓ from 6.7% in Oct</p>
            </CardBody></Card>
            <Card><CardBody className="text-center py-5">
              <p className="text-2xl font-bold text-primary-600">₹12,400</p>
              <p className="text-xs text-surface-400 mt-0.5">Avg. Customer LTV</p>
              <p className="text-[10px] text-green-500 mt-1">↑ 8% vs last quarter</p>
            </CardBody></Card>
            <Card><CardBody className="text-center py-5">
              <p className="text-2xl font-bold text-surface-700">215</p>
              <p className="text-xs text-surface-400 mt-0.5">Active Customers</p>
              <p className="text-[10px] text-green-500 mt-1">↑ 79% since Oct</p>
            </CardBody></Card>
          </div>

          {/* Churn Chart */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Active Customers & Churn Trend</h2></CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={churnData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="active" fill="#3b8ff4" name="Active" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="churned" fill="#ef4444" name="Churned" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Cohort Table */}
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Retention Cohorts</h2></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 text-left">
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">Cohort</th>
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">New</th>
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">1-Mo</th>
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">3-Mo</th>
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">6-Mo</th>
                      <th className="px-4 py-2.5 font-medium text-surface-500 text-xs">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionCohorts.map(c => (
                      <tr key={c.month} className="border-b border-surface-50">
                        <td className="px-4 py-2 text-xs font-medium text-surface-700">{c.month}</td>
                        <td className="px-4 py-2 text-xs text-surface-600">{c.newCustomers}</td>
                        <td className="px-4 py-2 text-xs">
                          {c.returned1 !== null ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(c.returned1 / c.newCustomers * 100) >= 80 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                              {c.returned1} ({Math.round(c.returned1 / c.newCustomers * 100)}%)
                            </span>
                          ) : <span className="text-surface-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.returned3 !== null ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(c.returned3 / c.newCustomers * 100) >= 60 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                              {c.returned3} ({Math.round(c.returned3 / c.newCustomers * 100)}%)
                            </span>
                          ) : <span className="text-surface-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.returned6 !== null ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(c.returned6 / c.newCustomers * 100) >= 40 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {c.returned6} ({Math.round(c.returned6 / c.newCustomers * 100)}%)
                            </span>
                          ) : <span className="text-surface-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-xs font-semibold">
                          {c.retentionRate !== null ? <span className={c.retentionRate >= 80 ? 'text-green-600' : 'text-amber-600'}>{c.retentionRate}%</span> : <span className="text-surface-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* CLV Segments */}
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Customer Lifetime Value by Segment</h2></CardHeader>
              <CardBody className="space-y-3">
                {clvSegments.map(s => {
                  const maxCLV = clvSegments[0].avgCLV;
                  const pct = Math.round((s.avgCLV / maxCLV) * 100);
                  const colors = { Platinum: 'bg-purple-400', Gold: 'bg-yellow-400', Silver: 'bg-surface-400', Bronze: 'bg-amber-400' };
                  return (
                    <div key={s.segment} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-surface-700">{s.segment}</span>
                          <span className="text-[10px] text-surface-400">{s.customers} customers</span>
                        </div>
                        <span className="text-sm font-bold text-surface-700">₹{s.avgCLV.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[s.segment]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-4 text-[10px] text-surface-400">
                        <span>Avg {s.avgVisits} visits</span>
                        <span>Avg ₹{s.avgSpend}/visit</span>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* DEMAND HEATMAP TAB */}
      {activeTab === 'demand' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Booking Demand Heatmap</h2></CardHeader>
            <CardBody>
              <p className="text-xs text-surface-400 mb-4">Number of bookings per hour slot. Darker = more bookings. Plan staffing around peak times.</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-2 py-1.5 text-[10px] font-medium text-surface-400 text-left w-12" />
                      {heatmapHours.map(h => (
                        <th key={h} className="px-1 py-1.5 text-[10px] font-medium text-surface-400 text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapDays.map((day, dayIdx) => (
                      <tr key={day}>
                        <td className="px-2 py-1 text-xs font-medium text-surface-600">{day}</td>
                        {heatmapData[dayIdx].map((val, hourIdx) => {
                          const max = 14;
                          const intensity = val / max;
                          const bg = intensity >= 0.8 ? 'bg-red-500 text-white' : intensity >= 0.6 ? 'bg-orange-400 text-white' : intensity >= 0.4 ? 'bg-amber-300 text-amber-900' : intensity >= 0.2 ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-700';
                          return (
                            <td key={hourIdx} className="px-0.5 py-0.5">
                              <div className={`w-full h-8 rounded flex items-center justify-center text-[10px] font-semibold ${bg}`}>
                                {val}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-3 justify-center">
                <span className="text-[10px] text-surface-400">Low</span>
                {['bg-green-100', 'bg-yellow-200', 'bg-amber-300', 'bg-orange-400', 'bg-red-500'].map((c, i) => (
                  <div key={i} className={`w-6 h-3 rounded ${c}`} />
                ))}
                <span className="text-[10px] text-surface-400">High</span>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Peak Demand by Service */}
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Peak Demand by Service</h2></CardHeader>
              <CardBody className="space-y-2">
                {peakServices.map(s => (
                  <div key={s.service} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50/50 border border-surface-100">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Scissors size={14} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-700">{s.service}</p>
                      <p className="text-xs text-surface-400">{s.peak}</p>
                    </div>
                    <span className="text-sm font-bold text-surface-600">{s.avgBookings}/wk</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Hourly Distribution */}
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-surface-700">Hourly Booking Distribution</h2></CardHeader>
              <CardBody>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heatmapHours.map((h, i) => ({
                      hour: h,
                      bookings: heatmapData.reduce((sum, row) => sum + row[i], 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="bookings" fill="#3b8ff4" name="Total Bookings" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Staffing Recommendations */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Staffing Recommendations</h2></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { day: 'Saturday', staff: 5, hours: '9 AM – 8 PM', note: 'Peak day — full team required', color: 'bg-red-50 border-red-200 text-red-700' },
                  { day: 'Friday', staff: 4, hours: '10 AM – 8 PM', note: 'High demand from 2 PM onwards', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                  { day: 'Thursday', staff: 4, hours: '10 AM – 8 PM', note: 'Steady demand all day', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { day: 'Tuesday', staff: 3, hours: '10 AM – 7 PM', note: 'Moderate demand', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                  { day: 'Wednesday', staff: 3, hours: '10 AM – 7 PM', note: 'Calm day — 3 staff sufficient', color: 'bg-green-50 border-green-200 text-green-700' },
                  { day: 'Monday', staff: 3, hours: '10 AM – 7 PM', note: 'Slow start, picks up evenings', color: 'bg-green-50 border-green-200 text-green-700' },
                ].map(r => (
                  <div key={r.day} className={`p-3 rounded-lg border ${r.color}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{r.day}</span>
                      <span className="text-xs font-bold">{r.staff} staff</span>
                    </div>
                    <p className="text-[10px] opacity-80">{r.hours}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{r.note}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* GOALS TAB */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(g => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100));
              const Icon = g.icon;
              const statusColor = pct >= 90 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500';
              const barColor = pct >= 90 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
              const bgColor = pct >= 90 ? 'bg-green-50 border-green-200' : pct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
              return (
                <Card key={g.id}>
                  <CardBody className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                          <Icon size={16} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-700">{g.name}</p>
                          <p className="text-[10px] text-surface-400">{g.period}</p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${statusColor}`}>{pct}%</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-surface-500">
                          {g.unit === '₹' ? `₹${g.current.toLocaleString()}` : g.unit === '%' ? `${g.current}%` : g.unit === '★' ? `${g.current}★` : g.current}
                        </span>
                        <span className="text-surface-400">
                          Target: {g.unit === '₹' ? `₹${g.target.toLocaleString()}` : g.unit === '%' ? `${g.target}%` : g.unit === '★' ? `${g.target}★` : g.target}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className={`px-2.5 py-1.5 rounded-lg border text-center ${bgColor}`}>
                      <p className="text-[10px] font-medium">
                        {pct >= 100 ? '🎉 Goal achieved!' : pct >= 90 ? 'Almost there!' : pct >= 60 ? `${g.unit === '₹' ? `₹${(g.target - g.current).toLocaleString()}` : (g.target - g.current)} to go` : 'Needs attention'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Revenue trend vs target */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Revenue vs Monthly Target (₹65,000)</h2></CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activeMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v.toLocaleString()}`]} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="revenue" fill="#3b8ff4" name="Revenue" radius={[4, 4, 0, 0]} />
                    <ReferenceLine y={65000} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Target ₹65K', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Summary insights */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Goal Insights</h2></CardHeader>
            <CardBody className="space-y-2">
              {[
                { icon: '📈', text: 'Revenue is at 74.6% of the April target. Dec was the only month exceeding ₹65K.' },
                { icon: '👥', text: '14 of 25 new customer goal achieved. Marketing push recommended for the remaining 11.' },
                { icon: '📋', text: '142 of 200 bookings done. On track to achieve if current pace continues (avg 18/day).' },
                { icon: '⭐', text: 'Average rating is 4.6, just 0.2 below the 4.8 target. Focus on service quality.' },
                { icon: '🔄', text: 'Retention at 82% vs 85% target. Follow-up reminders can help close the gap.' },
                { icon: '🤝', text: '9 of 15 referrals achieved. Boost referral rewards or run a campaign.' },
              ].map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-surface-50 transition-colors">
                  <span className="text-base flex-shrink-0">{insight.icon}</span>
                  <p className="text-xs text-surface-600 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* DAILY SUMMARY TAB */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {dailyData ? (
            <>
              {/* P&L Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">{'\u20B9'}{dailyData.collections.total.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Total Collections</p>
                  <p className="text-[10px] mt-1">{dailyData.yesterdayCollections.total > 0 ? (
                    <span className={dailyData.collections.total >= dailyData.yesterdayCollections.total ? 'text-green-500' : 'text-red-500'}>
                      {dailyData.collections.total >= dailyData.yesterdayCollections.total ? '↑' : '↓'} vs ₹{dailyData.yesterdayCollections.total.toLocaleString()} yesterday
                    </span>
                  ) : <span className="text-surface-400">No data yesterday</span>}</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-red-500">{'\u20B9'}{dailyData.expenses.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Expenses</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-primary-600">{'\u20B9'}{dailyData.netProfit.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Net Profit</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-surface-700">{dailyData.collections.count}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Invoices Generated</p>
                </CardBody></Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Appointments Today */}
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Appointments — {dailyData.date}</h2></CardHeader>
                  <CardBody className="space-y-3">
                    {[
                      { label: 'Total Appointments', value: dailyData.appointments.total, color: 'text-surface-700' },
                      { label: 'Completed', value: dailyData.appointments.completed, color: 'text-green-600' },
                      { label: 'Walk-ins', value: dailyData.appointments.walkins, color: 'text-blue-600' },
                      { label: 'No-shows', value: dailyData.appointments.noShows, color: 'text-red-500' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between p-3 rounded-lg bg-surface-50 border border-surface-100">
                        <span className="text-sm text-surface-600">{r.label}</span>
                        <span className={`text-lg font-bold ${r.color}`}>{r.value}</span>
                      </div>
                    ))}
                    {dailyData.yesterdayAppointments && (
                      <p className="text-xs text-surface-400 text-center">Yesterday: {dailyData.yesterdayAppointments.total} appointments, {dailyData.yesterdayAppointments.completed} completed</p>
                    )}
                  </CardBody>
                </Card>

                {/* Cash vs Digital & Top Services */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader><h2 className="text-base font-semibold text-surface-700">Cash vs Digital</h2></CardHeader>
                    <CardBody>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-surface-400 mb-1">Cash</p>
                          <p className="text-lg font-bold text-green-600">{'\u20B9'}{dailyData.collections.cash.toLocaleString()}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-surface-400 mb-1">Digital (UPI/Card)</p>
                          <p className="text-lg font-bold text-blue-600">{'\u20B9'}{dailyData.collections.digital.toLocaleString()}</p>
                        </div>
                      </div>
                      {dailyData.collections.total > 0 && (
                        <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-400 rounded-l-full" style={{ width: `${(dailyData.collections.cash / dailyData.collections.total * 100)}%` }} />
                          <div className="h-full bg-blue-400 rounded-r-full" style={{ width: `${(dailyData.collections.digital / dailyData.collections.total * 100)}%` }} />
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader><h2 className="text-base font-semibold text-surface-700">Top Services Today</h2></CardHeader>
                    <CardBody className="space-y-2">
                      {dailyData.topServices.length > 0 ? dailyData.topServices.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-100">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-600">{i + 1}</span>
                            <span className="text-sm font-medium text-surface-700">{s.name}</span>
                          </div>
                          <span className="text-sm font-bold text-surface-600">{s.count}x</span>
                        </div>
                      )) : <p className="text-sm text-surface-400 text-center py-4">No services yet today</p>}
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* vs Last Week Same Day */}
              {dailyData.lastWeekCollections && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Comparison</h2></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: 'Today', value: dailyData.collections.total, count: dailyData.collections.count },
                        { label: 'Yesterday', value: dailyData.yesterdayCollections.total, count: dailyData.yesterdayCollections.count },
                        { label: 'Last Week Same Day', value: dailyData.lastWeekCollections.total, count: dailyData.lastWeekCollections.count },
                      ].map(c => (
                        <div key={c.label} className="text-center p-4 rounded-lg bg-surface-50 border border-surface-100">
                          <p className="text-xs text-surface-400 mb-1">{c.label}</p>
                          <p className="text-xl font-bold text-surface-700">{'\u20B9'}{c.value.toLocaleString()}</p>
                          <p className="text-[10px] text-surface-400">{c.count} invoices</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading daily summary...</CardBody></Card>
          )}
        </div>
      )}

      {/* APPOINTMENTS TAB */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {apptStats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total', value: apptStats.total, color: 'text-surface-700' },
                  { label: 'Completed', value: apptStats.completed, color: 'text-green-600' },
                  { label: 'Cancelled', value: apptStats.cancelled, color: 'text-red-500' },
                  { label: 'No-shows', value: apptStats.noShow, color: 'text-amber-600' },
                  { label: 'Walk-ins', value: apptStats.walkins, color: 'text-blue-600' },
                  { label: 'Booked', value: apptStats.booked, color: 'text-purple-600' },
                ].map(s => (
                  <Card key={s.label}><CardBody className="text-center py-4">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{s.label}</p>
                  </CardBody></Card>
                ))}
              </div>

              {/* Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">{apptStats.completionRate}%</p>
                  <p className="text-xs text-surface-400 mt-0.5">Completion Rate</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-red-500">{apptStats.cancellationRate}%</p>
                  <p className="text-xs text-surface-400 mt-0.5">Cancellation Rate</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-amber-600">{apptStats.noShowRate}%</p>
                  <p className="text-xs text-surface-400 mt-0.5">No-show Rate</p>
                </CardBody></Card>
              </div>

              {/* Monthly Trend */}
              {apptStats.monthly?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Monthly Appointment Trend</h2></CardHeader>
                  <CardBody>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={apptStats.monthly} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="noShow" fill="#f59e0b" name="No-show" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Walk-in vs Booked Pie + Busiest Days */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Walk-in vs Booked</h2></CardHeader>
                  <CardBody className="flex flex-col items-center">
                    <div className="h-52 w-full max-w-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ name: 'Walk-in', value: apptStats.walkins }, { name: 'Booked', value: apptStats.booked }]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            <Cell fill="#3b8ff4" />
                            <Cell fill="#8b5cf6" />
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-2">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-surface-500">Walk-in ({apptStats.walkins})</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span className="text-xs text-surface-500">Booked ({apptStats.booked})</span></div>
                    </div>
                  </CardBody>
                </Card>

                {apptStats.dayDistribution?.length > 0 && (
                  <Card>
                    <CardHeader><h2 className="text-base font-semibold text-surface-700">Busiest Days</h2></CardHeader>
                    <CardBody>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={apptStats.dayDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="count" fill="#3b8ff4" name="Appointments" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading appointment stats...</CardBody></Card>
          )}
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {custAnalytics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardBody className="text-center py-4">
                  <p className="text-2xl font-bold text-surface-700">{custAnalytics.total}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Total Customers</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-4">
                  <p className="text-2xl font-bold text-green-600">{custAnalytics.returning}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Returning</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-4">
                  <p className="text-2xl font-bold text-blue-600">{custAnalytics.newOnly}</p>
                  <p className="text-xs text-surface-400 mt-0.5">New (1 visit)</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-4">
                  <p className="text-2xl font-bold text-primary-600">{'\u20B9'}{custAnalytics.avgSpendPerVisit.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Avg Spend/Visit</p>
                </CardBody></Card>
              </div>

              {/* Monthly Growth */}
              {custAnalytics.monthlyGrowth?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">New Customer Growth (Monthly)</h2></CardHeader>
                  <CardBody>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={custAnalytics.monthlyGrowth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="#3b8ff4" name="New Customers" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Gender Split */}
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Gender Split</h2></CardHeader>
                  <CardBody className="flex flex-col items-center">
                    <div className="h-52 w-full max-w-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={custAnalytics.genderSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                            {custAnalytics.genderSplit.map((_, i) => <Cell key={i} fill={['#3b8ff4', '#ec4899', '#94a3b8', '#f59e0b'][i % 4]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {custAnalytics.genderSplit.map((g, i) => (
                        <div key={g.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3b8ff4', '#ec4899', '#94a3b8', '#f59e0b'][i % 4] }} />
                          <span className="text-xs text-surface-500">{g.name} ({g.value})</span>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {/* Tag Distribution */}
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Customer Tags</h2></CardHeader>
                  <CardBody className="space-y-3">
                    {custAnalytics.tagDistribution.map(t => {
                      const colors = { NEW: '#3b8ff4', REGULAR: '#10b981', VIP: '#8b5cf6', INACTIVE: '#94a3b8' };
                      const pct = custAnalytics.total > 0 ? ((t.count / custAnalytics.total) * 100).toFixed(1) : 0;
                      return (
                        <div key={t.tag} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors[t.tag] || '#94a3b8'}15` }}>
                            <Users size={16} style={{ color: colors[t.tag] || '#94a3b8' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-surface-700">{t.tag}</p>
                              <p className="text-sm font-bold text-surface-700">{t.count}</p>
                            </div>
                            <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[t.tag] || '#94a3b8' }} />
                            </div>
                          </div>
                          <span className="text-xs font-medium text-surface-400 w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>
              </div>

              {/* Top 10 Customers */}
              {custAnalytics.top10?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Top 10 Customers by Spend</h2></CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-50 border-b border-surface-100">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">#</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Total Spent</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Visits</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Avg/Visit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {custAnalytics.top10.map((c, i) => (
                            <tr key={c.name} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-surface-200 text-surface-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-100 text-surface-500'}`}>{i + 1}</span>
                              </td>
                              <td className="px-4 py-3 font-medium text-surface-700">{c.name}</td>
                              <td className="px-4 py-3 text-right font-semibold text-surface-700">{'\u20B9'}{c.totalSpent.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-surface-500">{c.totalVisits}</td>
                              <td className="px-4 py-3 text-right text-surface-500">{'\u20B9'}{c.avgSpend.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading customer analytics...</CardBody></Card>
          )}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {productData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-primary-600">{'\u20B9'}{productData.totalProductRevenue.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Product Revenue</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">{'\u20B9'}{productData.totalServiceRevenue.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Service Revenue</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-surface-700">{productData.products.length}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Total Products</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-red-500">{productData.lowStock.length}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Low Stock Alerts</p>
                </CardBody></Card>
              </div>

              {/* Product vs Service Revenue Split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Revenue Split: Products vs Services</h2></CardHeader>
                  <CardBody className="flex flex-col items-center">
                    {(productData.totalProductRevenue + productData.totalServiceRevenue) > 0 ? (
                      <>
                        <div className="h-52 w-full max-w-xs">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{ name: 'Products', value: productData.totalProductRevenue }, { name: 'Services', value: productData.totalServiceRevenue }]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                <Cell fill="#8b5cf6" />
                                <Cell fill="#3b8ff4" />
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v.toLocaleString()}`]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex gap-6 mt-2">
                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span className="text-xs text-surface-500">Products</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-surface-500">Services</span></div>
                        </div>
                      </>
                    ) : <p className="text-sm text-surface-400 py-8">No revenue data yet</p>}
                  </CardBody>
                </Card>

                {/* Low Stock */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <h2 className="text-base font-semibold text-surface-700">Low Stock Alerts</h2>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {productData.lowStock.length > 0 ? productData.lowStock.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                        <div>
                          <p className="text-sm font-medium text-surface-700">{p.name}</p>
                          {p.brand && <p className="text-xs text-surface-400">{p.brand}</p>}
                        </div>
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-600">{p.stock} left</span>
                      </div>
                    )) : <p className="text-sm text-surface-400 text-center py-8">All products well-stocked</p>}
                  </CardBody>
                </Card>
              </div>

              {/* Monthly Product Sales Trend */}
              {productData.monthlyTrend?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Monthly Product Sales</h2></CardHeader>
                  <CardBody>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productData.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [n === 'revenue' ? `₹${v.toLocaleString()}` : v, n === 'revenue' ? 'Revenue' : 'Units']} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Top Selling Products Table */}
              <Card>
                <CardHeader><h2 className="text-base font-semibold text-surface-700">Product Performance</h2></CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-50 border-b border-surface-100">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">#</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Product</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Brand</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Sold</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Revenue</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productData.products.map((p, i) => (
                          <tr key={p.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-surface-400">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-surface-700">{p.name}</td>
                            <td className="px-4 py-3 text-surface-500">{p.brand || '-'}</td>
                            <td className="px-4 py-3 text-right text-surface-500">₹{p.price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-surface-600 font-medium">{p.totalSold}</td>
                            <td className="px-4 py-3 text-right font-semibold text-surface-700">₹{p.revenue.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${p.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{p.stock}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading product reports...</CardBody></Card>
          )}
        </div>
      )}

      {/* MEMBERSHIPS TAB */}
      {activeTab === 'memberships' && (
        <div className="space-y-6">
          {membershipData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">{membershipData.active}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Active</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-surface-400">{membershipData.expired}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Expired</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-amber-600">{membershipData.expiringSoon}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Expiring in 30d</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-primary-600">₹{membershipData.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Total Revenue</p>
                </CardBody></Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Active Memberships by Plan</h2></CardHeader>
                  <CardBody>
                    {membershipData.planDistribution.length > 0 ? (
                      <>
                        <div className="h-52 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={membershipData.planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="name">
                                {membershipData.planDistribution.map((_, i) => <Cell key={i} fill={['#3b8ff4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5]} />)}
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                          {membershipData.planDistribution.map((p, i) => (
                            <div key={p.name} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3b8ff4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5] }} />
                              <span className="text-xs text-surface-500">{p.name} ({p.count})</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <p className="text-sm text-surface-400 text-center py-8">No active memberships</p>}
                  </CardBody>
                </Card>

                {/* Expiring Soon List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <h2 className="text-base font-semibold text-surface-700">Expiring Soon (30 days)</h2>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {membershipData.expiringSoonList?.length > 0 ? membershipData.expiringSoonList.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div>
                          <p className="text-sm font-medium text-surface-700">{m.customer}</p>
                          <p className="text-xs text-surface-400">{m.plan}</p>
                        </div>
                        <span className="text-xs font-medium text-amber-600">Expires {new Date(m.endDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    )) : <p className="text-sm text-surface-400 text-center py-8">No memberships expiring soon</p>}
                  </CardBody>
                </Card>
              </div>
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading membership reports...</CardBody></Card>
          )}
        </div>
      )}

      {/* DISCOUNTS TAB */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {discountData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-red-500">₹{discountData.totalDiscount.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Total Discounts Given</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-surface-700">{discountData.discountPercent}%</p>
                  <p className="text-xs text-surface-400 mt-0.5">Discount % of Gross</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-primary-600">{discountData.discountedInvoices}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Discounted Bills</p>
                  <p className="text-[10px] text-surface-400">of {discountData.totalInvoices} total</p>
                </CardBody></Card>
                <Card><CardBody className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">₹{discountData.totalGross.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-0.5">Gross Revenue</p>
                </CardBody></Card>
              </div>

              {/* Impact Analysis */}
              <Card>
                <CardHeader><h2 className="text-base font-semibold text-surface-700">Discount Impact Analysis</h2></CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="text-center p-6 rounded-xl bg-green-50 border border-green-100">
                      <p className="text-xs text-surface-400 mb-1">Avg Bill WITH Discount</p>
                      <p className="text-3xl font-bold text-green-600">₹{discountData.avgWithDiscount.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-6 rounded-xl bg-surface-50 border border-surface-100">
                      <p className="text-xs text-surface-400 mb-1">Avg Bill WITHOUT Discount</p>
                      <p className="text-3xl font-bold text-surface-600">₹{discountData.avgWithoutDiscount.toLocaleString()}</p>
                    </div>
                  </div>
                  {discountData.avgWithDiscount > 0 && discountData.avgWithoutDiscount > 0 && (
                    <p className="text-xs text-surface-400 text-center mt-3">
                      Discounted bills are {discountData.avgWithDiscount > discountData.avgWithoutDiscount ? 'higher' : 'lower'} by ₹{Math.abs(discountData.avgWithDiscount - discountData.avgWithoutDiscount).toLocaleString()} on average
                      — {discountData.avgWithDiscount > discountData.avgWithoutDiscount ? 'customers spend more when offered discounts' : 'discounts are applied to smaller bills'}
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Monthly Discount Trend */}
              {discountData.monthlyTrend?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Monthly Discount Trend</h2></CardHeader>
                  <CardBody>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={discountData.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                          <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v.toLocaleString()}`]} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="gross" fill="#3b8ff4" name="Gross" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="discount" fill="#ef4444" name="Discount" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="net" fill="#10b981" name="Net" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Top Coupons */}
              {discountData.topCoupons?.length > 0 && (
                <Card>
                  <CardHeader><h2 className="text-base font-semibold text-surface-700">Most Used Coupons</h2></CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-50 border-b border-surface-100">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Coupon Code</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Times Used</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase">Total Discount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discountData.topCoupons.map(c => (
                            <tr key={c.code} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                              <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-mono bg-primary-50 text-primary-700 rounded">{c.code}</span></td>
                              <td className="px-4 py-3 text-right font-medium text-surface-600">{c.used}</td>
                              <td className="px-4 py-3 text-right font-semibold text-red-500">₹{c.totalDiscount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card><CardBody className="text-center py-12 text-surface-400">Loading discount analytics...</CardBody></Card>
          )}
        </div>
      )}
      </div>{/* end content area */}
      </div>{/* end flex container */}
    </div>
  );
}
