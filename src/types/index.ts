export type UserRole = 'super_admin' | 'ketua_rt' | 'bendahara' | 'warga';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  unit_id: string;
  household_id?: string;
  is_active: number;
}

export interface OrganizationalUnit {
  id: string;
  code: string;
  name: string;
  rt_number: string;
  rw_number: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  address: string;
}

export interface Household {
  id: string;
  unit_id: string;
  family_card_no: string;
  head_name: string;
  block_number: string;
  address: string;
  phone?: string;
  status: 'active' | 'inactive' | 'moved_out';
  notes?: string;
  registered_date: string;
  resident_count?: number;
  arrears_total?: number;
}

export interface Resident {
  id: string;
  household_id: string;
  nik?: string;
  name: string;
  relation_to_head: string;
  gender: 'L' | 'P';
  phone?: string;
  occupation?: string;
  is_active: number;
  block_number?: string;
  head_name?: string;
}

export interface FeeType {
  id: string;
  unit_id: string;
  code: string;
  name: string;
  description?: string;
  amount: number;
  frequency: 'monthly' | 'one_time' | 'voluntary';
  is_mandatory: number;
  is_active: number;
  due_day_of_month: number;
}

export interface Invoice {
  id: string;
  unit_id: string;
  invoice_number: string;
  household_id: string;
  fee_type_id: string;
  period: string; // YYYY-MM
  amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'canceled';
  due_date: string;
  notes?: string;
  head_name?: string;
  block_number?: string;
  household_phone?: string;
  fee_name?: string;
  fee_code?: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  invoice_number?: string;
  period?: string;
  fee_name?: string;
}

export interface Payment {
  id: string;
  unit_id: string;
  payment_number: string;
  receipt_number: string;
  household_id: string;
  total_amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'qris' | 'other';
  cash_account_id: string;
  reference_no?: string;
  proof_attachment?: string;
  notes?: string;
  created_by: string;
  status: 'completed' | 'reversed';
  head_name?: string;
  block_number?: string;
  account_name?: string;
  allocations?: PaymentAllocation[];
}

export interface CashAccount {
  id: string;
  unit_id: string;
  code: string;
  name: string;
  account_type: 'cash' | 'bank' | 'other';
  bank_name?: string;
  account_number?: string;
  initial_balance: number;
  current_balance: number;
  is_active: number;
}

export interface Category {
  id: string;
  unit_id: string;
  type: 'income' | 'expense';
  code: string;
  name: string;
  description?: string;
  is_active: number;
}

export interface FinancialTransaction {
  id: string;
  unit_id: string;
  transaction_number: string;
  transaction_date: string;
  type: 'income' | 'expense' | 'transfer';
  category_id?: string;
  cash_account_id: string;
  to_cash_account_id?: string;
  amount: number;
  description: string;
  payer_payee?: string;
  payment_method: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'reversed';
  rejection_reason?: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  receipt_attachment?: string;
  payment_id?: string;
  vendor_id?: string;
  category_name?: string;
  category_code?: string;
  account_name?: string;
  to_account_name?: string;
  vendor_name?: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  category_id: string;
  category_code: string;
  category_name: string;
  year: number;
  budgeted_amount: number;
  actual_spent: number;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  service_type: string;
  contact_person?: string;
  phone?: string;
  bank_account?: string;
  address?: string;
  status: 'active' | 'inactive';
  notes?: string;
  total_disbursed?: number;
  transaction_count?: number;
}

export interface AuditLog {
  id: string;
  unit_id?: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  is_read: number;
  link?: string;
  created_at: string;
}

export interface DashboardStats {
  totalCashBalance: number;
  incomeCurrentPeriod: number;
  expenseCurrentPeriod: number;
  netCashFlow: number;
  outstandingFees: number;
  unpaidHouseholdsCount: number;
  collectionRate: number;
  accounts: CashAccount[];
  recentTransactions: FinancialTransaction[];
  categoryExpenses: { name: string; amount: number }[];
  pendingApprovals: FinancialTransaction[];
  monthlyFlow: { month: string; label: string; income: number; expense: number }[];
}

export interface TestResultItem {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, any>;
}

export interface TestSuiteResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
  };
  results: TestResultItem[];
}
