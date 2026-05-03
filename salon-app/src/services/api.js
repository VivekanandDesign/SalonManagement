// Use the local Vite proxy by default and normalize deployed API URLs to include `/api`.
function normalizeApiBaseUrl(rawBase) {
  if (!rawBase) return '/api';
  return rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`;
}

const API_BASE = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE);

function getToken() {
  const saved = localStorage.getItem('glowdesk_token');
  return saved || '';
}

// Endpoints that should NOT trigger a 401 redirect (auth pages)
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/resend-otp', '/auth/google', '/auth/facebook', '/settings/public'];

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (err) {
    // Network error — server unreachable or offline
    const networkError = new Error('Unable to connect to the server. Please check your internet connection and try again.');
    networkError.isNetworkError = true;
    throw networkError;
  }

  if (res.status === 401 && !AUTH_ENDPOINTS.some(e => endpoint.startsWith(e))) {
    localStorage.removeItem('glowdesk_token');
    localStorage.removeItem('glowdesk_user');
    window.location.href = '/login?expired=1';
    throw new Error('Session expired. Please log in again.');
  }

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ── Auth ──
export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  google: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  facebook: (accessToken, userID) => request('/auth/facebook', { method: 'POST', body: JSON.stringify({ accessToken, userID }) }),
  verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resendOtp: (email) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Customers ──
export const customers = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/customers${qs ? `?${qs}` : ''}`);
  },
  search: (q) => request(`/customers/search?q=${encodeURIComponent(q)}`),
  getById: (id) => request(`/customers/${id}`),
  create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  recordReferral: (data) => request('/customers/referral', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Services ──
export const services = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/services${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/services/${id}`),
  create: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  categories: () => request('/services/categories'),
  createCategory: (data) => request('/services/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/services/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/services/categories/${id}`, { method: 'DELETE' }),
  listCombos: () => request('/services/combos/all'),
  createCombo: (data) => request('/services/combos', { method: 'POST', body: JSON.stringify(data) }),
  updateCombo: (id, data) => request(`/services/combos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCombo: (id) => request(`/services/combos/${id}`, { method: 'DELETE' }),
};

// ── Staff ──
export const staff = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/staff${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/staff/${id}`),
  getSchedule: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/staff/${id}/schedule${qs ? `?${qs}` : ''}`);
  },
  create: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
  markAttendance: (id, data) => request(`/staff/${id}/attendance`, { method: 'POST', body: JSON.stringify(data) }),
  getAttendance: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/staff/${id}/attendance${qs ? `?${qs}` : ''}`);
  },
};

// ── Appointments ──
export const appointments = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/appointments${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/appointments/${id}`),
  create: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancel: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
};

// ── Invoices ──
export const invoices = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/invoices/${id}`),
  create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id, data) => request(`/invoices/${id}/payment`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Loyalty ──
export const loyalty = {
  configs: () => request('/loyalty/configs'),
  createConfig: (data) => request('/loyalty/configs', { method: 'POST', body: JSON.stringify(data) }),
  updateConfig: (id, data) => request(`/loyalty/configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConfig: (id) => request(`/loyalty/configs/${id}`, { method: 'DELETE' }),
  rewards: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/loyalty/rewards${qs ? `?${qs}` : ''}`);
  },
  redeemReward: (id) => request(`/loyalty/rewards/${id}/redeem`, { method: 'PATCH' }),
};

// ── Messages ──
export const messages = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/messages${qs ? `?${qs}` : ''}`);
  },
  stats: () => request('/messages/stats'),
  send: (data) => request('/messages/send', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Dashboard ──
export const dashboard = {
  summary: () => request('/dashboard/summary'),
  revenueChart: (months = 6) => request(`/dashboard/revenue-chart?months=${months}`),
  topServices: (limit = 5) => request(`/dashboard/top-services?limit=${limit}`),
  stylistPerformance: () => request('/dashboard/stylist-performance'),
  customerBreakdown: () => request('/dashboard/customer-breakdown'),
};

// ── Reports ──
export const reports = {
  revenue: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/revenue${qs ? `?${qs}` : ''}`);
  },
  customerBreakdown: () => request('/reports/customer-breakdown'),
  noShowRate: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/no-show-rate${qs ? `?${qs}` : ''}`);
  },
  appointmentStats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/appointment-stats${qs ? `?${qs}` : ''}`);
  },
  customerAnalytics: () => request('/reports/customer-analytics'),
  productReports: () => request('/reports/product-reports'),
  membershipReports: () => request('/reports/membership-reports'),
  discountAnalytics: () => request('/reports/discount-analytics'),
  dailySummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/daily-summary${qs ? `?${qs}` : ''}`);
  },
  exportCsv: (type, params = {}) => {
    const qs = new URLSearchParams({ type, ...params }).toString();
    return request(`/reports/export/csv?${qs}`);
  },
};

// ── Settings ──
export const settings = {
  get: () => request('/settings'),
  getPublic: () => request('/settings/public'),
  update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  backup: () => request('/settings/backup'),
};

// ── Expenses ──
export const expenses = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/expenses?${qs}`); },
  getById: (id) => request(`/expenses/${id}`),
  create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  categories: () => request('/expenses/categories'),
  summary: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/expenses/summary?${qs}`); },
  monthlyTrend: () => request('/expenses/monthly-trend'),
};

// ── WhatsApp ──
export const whatsapp = {
  status: () => request('/whatsapp/status'),
  qr: () => request('/whatsapp/qr'),
  connect: () => request('/whatsapp/connect', { method: 'POST' }),
  disconnect: () => request('/whatsapp/disconnect', { method: 'POST' }),
  logout: () => request('/whatsapp/logout', { method: 'POST' }),
  sendTest: (phone, message) => request('/whatsapp/send-test', { method: 'POST', body: JSON.stringify({ phone, message }) }),
  send: (customerId, content, type) => request('/whatsapp/send', { method: 'POST', body: JSON.stringify({ customerId, content, type }) }),
};

// ── Campaigns ──
export const campaigns = {
  list: () => request('/campaigns'),
  getById: (id) => request(`/campaigns/${id}`),
  create: (data) => request('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),
  send: (id) => request(`/campaigns/${id}/send`, { method: 'POST' }),
  cancel: (id) => request(`/campaigns/${id}/cancel`, { method: 'POST' }),
  stats: (id) => request(`/campaigns/${id}/stats`),
  validateCoupon: (data) => request('/campaigns/validate-coupon', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Feedback ──
export const feedback = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/feedback${qs ? `?${qs}` : ''}`);
  },
  stats: () => request('/feedback/stats'),
};

// ── Memberships ──
export const memberships = {
  listPlans: () => request('/memberships/plans'),
  createPlan: (data) => request('/memberships/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id, data) => request(`/memberships/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id) => request(`/memberships/plans/${id}`, { method: 'DELETE' }),
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/memberships${qs ? `?${qs}` : ''}`); },
  assign: (data) => request('/memberships', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id) => request(`/memberships/${id}`, { method: 'DELETE' }),
  checkUsage: (params) => { const qs = new URLSearchParams(params).toString(); return request(`/memberships/check-usage?${qs}`); },
};

// ── Wallet ──
export const wallet = {
  get: (customerId) => request(`/wallet/${customerId}`),
  topUp: (data) => request('/wallet/topup', { method: 'POST', body: JSON.stringify(data) }),
  deduct: (data) => request('/wallet/deduct', { method: 'POST', body: JSON.stringify(data) }),
  bonus: (data) => request('/wallet/bonus', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Gift Vouchers ──
export const giftVouchers = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/gift-vouchers${qs ? `?${qs}` : ''}`); },
  create: (data) => request('/gift-vouchers', { method: 'POST', body: JSON.stringify(data) }),
  validate: (code) => request('/gift-vouchers/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  redeem: (data) => request('/gift-vouchers/redeem', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Products ──
export const products = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/products${qs ? `?${qs}` : ''}`); },
  create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  recordSale: (data) => request('/products/sales', { method: 'POST', body: JSON.stringify(data) }),
  salesHistory: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/products/sales?${qs}`); },
  lowStock: () => request('/products/low-stock'),
};

// ── Happy Hours ──
export const happyHours = {
  list: () => request('/happy-hours'),
  current: () => request('/happy-hours/current'),
  create: (data) => request('/happy-hours', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/happy-hours/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/happy-hours/${id}`, { method: 'DELETE' }),
};

// ── Upsells ──
export const upsells = {
  list: () => request('/upsells'),
  suggestions: (serviceIds) => request(`/upsells/suggestions?serviceIds=${serviceIds}`),
  create: (data) => request('/upsells', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/upsells/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/upsells/${id}`, { method: 'DELETE' }),
};

// ── Waitlist ──
export const waitlistApi = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/waitlist${qs ? `?${qs}` : ''}`); },
  add: (data) => request('/waitlist', { method: 'POST', body: JSON.stringify(data) }),
  notified: (id) => request(`/waitlist/${id}/notified`, { method: 'PATCH' }),
  fulfilled: (id) => request(`/waitlist/${id}/fulfilled`, { method: 'PATCH' }),
  remove: (id) => request(`/waitlist/${id}`, { method: 'DELETE' }),
};

// ── Queue ──
export const queue = {
  list: () => request('/queue'),
  add: (data) => request('/queue', { method: 'POST', body: JSON.stringify(data) }),
  call: (id) => request(`/queue/${id}/call`, { method: 'PATCH' }),
  complete: (id) => request(`/queue/${id}/complete`, { method: 'PATCH' }),
  left: (id) => request(`/queue/${id}/left`, { method: 'PATCH' }),
  remove: (id) => request(`/queue/${id}`, { method: 'DELETE' }),
};

// ── Commissions ──
export const commissions = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/commissions${qs ? `?${qs}` : ''}`); },
  summary: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/commissions/summary${qs ? `?${qs}` : ''}`); },
  calculate: (invoiceId) => request('/commissions/calculate', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
  listTips: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/commissions/tips${qs ? `?${qs}` : ''}`); },
  addTip: (data) => request('/commissions/tips', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Referrals ──
export const referrals = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/referrals${qs ? `?${qs}` : ''}`); },
  create: (data) => request('/referrals', { method: 'POST', body: JSON.stringify(data) }),
  convert: (id) => request(`/referrals/${id}/convert`, { method: 'PATCH' }),
  stats: () => request('/referrals/stats'),
};

// ── VIP Tiers ──
export const vipTiers = {
  list: () => request('/vip-tiers'),
  upsert: (tiers) => request('/vip-tiers', { method: 'PUT', body: JSON.stringify({ tiers }) }),
  autoPromote: () => request('/vip-tiers/auto-promote', { method: 'POST' }),
};
