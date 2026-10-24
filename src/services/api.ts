import {
  User,
  OrganizationalUnit,
  Household,
  Resident,
  FeeType,
  Invoice,
  Payment,
  CashAccount,
  Category,
  FinancialTransaction,
  Budget,
  Vendor,
  AuditLog,
  NotificationItem,
  DashboardStats,
  TestSuiteResponse
} from '../types';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isAdmin = localStorage.getItem('kas_warga_is_admin') === 'true';
  const currentUserId = isAdmin ? 'usr-admin' : (localStorage.getItem('kas_warga_user_id') || 'usr-guest');
  const currentUserRole = isAdmin ? 'super_admin' : 'warga';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
    'x-user-role': currentUserRole,
    ...(options.headers as Record<string, string> || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errMsg = data.error;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Auth (Admin Only)
  login: (username: string, password?: string) =>
    request<{ user: User; unit: OrganizationalUnit; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  getMe: () => request<{ user: User; unit: OrganizationalUnit }>('/api/auth/me'),

  switchRole: (role: string) =>
    request<{ user: User; unit: OrganizationalUnit; token: string }>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role })
    }),

  // Dashboard
  getDashboardStats: (period?: string) =>
    request<DashboardStats>(`/api/dashboard/stats${period ? `?period=${period}` : ''}`),

  // Households & Residents
  getHouseholds: (search?: string) =>
    request<Household[]>(`/api/households${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  createHousehold: (data: Partial<Household>) =>
    request<{ id: string; message: string }>('/api/households', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateHousehold: (id: string, data: Partial<Household>) =>
    request<{ message: string }>(`/api/households/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteHousehold: (id: string) =>
    request<{ message: string }>(`/api/households/${id}`, { method: 'DELETE' }),

  getResidents: (householdId?: string) =>
    request<Resident[]>(`/api/residents${householdId ? `?household_id=${householdId}` : ''}`),

  createResident: (data: Partial<Resident>) =>
    request<{ id: string; message: string }>('/api/residents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Fee Types
  getFeeTypes: () => request<FeeType[]>('/api/fee-types'),

  createFeeType: (data: Partial<FeeType>) =>
    request<{ id: string; message: string }>('/api/fee-types', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateFeeType: (id: string, data: Partial<FeeType>) =>
    request<{ message: string }>(`/api/fee-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Invoices
  getInvoices: (params: { period?: string; status?: string; household_id?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.status) query.append('status', params.status);
    if (params.household_id) query.append('household_id', params.household_id);
    return request<Invoice[]>(`/api/invoices?${query.toString()}`);
  },

  generateRecurringInvoices: (period: string) =>
    request<{ message: string; createdCount: number; skippedCount: number }>('/api/invoices/generate-recurring', {
      method: 'POST',
      body: JSON.stringify({ period })
    }),

  // Payments & Receipt
  getPayments: (householdId?: string) =>
    request<Payment[]>(`/api/payments${householdId ? `?household_id=${householdId}` : ''}`),

  getPaymentDetail: (id: string) =>
    request<Payment & { unit_name: string; rt_number: string; rw_number: string }>(`/api/payments/${id}`),

  createPayment: (data: {
    household_id: string;
    allocations: { invoice_id: string; amount: number }[];
    payment_method: string;
    cash_account_id: string;
    reference_no?: string;
    notes?: string;
  }) =>
    request<{ message: string; paymentId: string; receiptNumber: string }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Financial Transactions
  getTransactions: (params: { type?: string; status?: string; period?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.period) query.append('period', params.period);
    return request<FinancialTransaction[]>(`/api/transactions?${query.toString()}`);
  },

  getTransactionDetail: (id: string) =>
    request<FinancialTransaction & {
      unit_name: string;
      rt_number: string;
      rw_number: string;
      bank_name?: string;
      account_number?: string;
      vendor_service?: string;
      vendor_bank?: string;
    }>(`/api/transactions/${id}`),

  createTransaction: (data: Partial<FinancialTransaction>) =>
    request<{ id: string; transaction_number: string; status: string; message: string }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  transferCash: (data: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    description: string;
    transaction_date?: string;
  }) =>
    request<{ message: string }>('/api/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  approveTransaction: (id: string) =>
    request<{ message: string }>(`/api/transactions/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({})
    }),

  rejectTransaction: (id: string, rejection_reason: string) =>
    request<{ message: string }>(`/api/transactions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejection_reason })
    }),

  // Cash Accounts
  getCashAccounts: () => request<CashAccount[]>('/api/cash-accounts'),

  // Categories & Budgets
  getCategories: () => request<Category[]>('/api/categories'),

  getBudgets: (year?: number) =>
    request<Budget[]>(`/api/budgets${year ? `?year=${year}` : ''}`),

  saveBudget: (data: { category_id: string; year: number; budgeted_amount: number; notes?: string }) =>
    request<{ message: string }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Vendors
  getVendors: () => request<Vendor[]>('/api/vendors'),

  createVendor: (data: Partial<Vendor>) =>
    request<{ id: string; message: string }>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reports
  getCashbookReport: (params: { period?: string; account_id?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.account_id) query.append('account_id', params.account_id);
    return request<{ period: string; generatedAt: string; transactions: FinancialTransaction[] }>(`/api/reports/cashbook?${query.toString()}`);
  },

  getTransparencyReport: (period?: string) =>
    request<{
      unit: OrganizationalUnit;
      period: string;
      totalBalance: number;
      totalIncome: number;
      totalExpense: number;
      netSurplus: number;
      categoryBreakdown: { name: string; total: number }[];
      publishedAt: string;
    }>(`/api/reports/transparency${period ? `?period=${period}` : ''}`),

  // Audit Logs, Notifications, Settings, Users
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),
  getNotifications: () => request<NotificationItem[]>('/api/notifications'),
  getUsers: () => request<User[]>('/api/users'),
  getSettings: () => request<Record<string, string>>('/api/settings'),
  saveSettings: (settings: Record<string, string>) =>
    request<{ message: string }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ settings })
    }),

  // Automated Tests Runner
  runTests: () => request<TestSuiteResponse>('/api/tests/run', { method: 'POST' })
};
