import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, updateAccountBalances } from './server/db.js';
import { runAutomatedTests } from './server/testRunner.js';

const app = express();
const PORT = 3000;

// Initialize Database & tables
initDatabase();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to log audit events
function logAudit(unitId: string, userId: string, userName: string, action: string, entityType: string, entityId: string | null, newValues: any, ip: string = '127.0.0.1') {
  try {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, unit_id, user_id, user_name, action, entity_type, entity_id, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, unitId, userId, userName, action, entityType, entityId, JSON.stringify(newValues), ip);
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & ACCESS CONTROL MIDDLEWARE
// -------------------------------------------------------------
// Admin-only authorization check
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (userRole === 'super_admin' || userId === 'usr-admin') {
    return next();
  }

  return res.status(403).json({
    error: 'Akses Ditolak: Hanya Admin (username: admin, password: gph1172) yang memiliki hak untuk menambah, mengubah, atau menghapus data. Pengguna umum hanya dapat melihat (view-only).'
  });
}

// Login route strictly for Admin: username (admin), password (gph1172)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const loginUser = (username || email || '').trim().toLowerCase();
  const loginPass = (password || '').trim();

  if (!loginUser || !loginPass) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  // Strictly check admin credentials
  if (loginUser !== 'admin' && loginUser !== 'admin@kaswarga.id') {
    return res.status(401).json({
      error: 'Fitur login hanya untuk Admin. Warga / Pengunjung dapat melihat seluruh informasi kas tanpa login (Mode Hanya-Lihat).'
    });
  }

  if (loginPass !== 'gph1172') {
    return res.status(401).json({
      error: 'Password salah! Akun admin: username (admin), password (gph1172).'
    });
  }

  // Admin user record
  const user = db.prepare("SELECT id, email, name, role, phone, unit_id, household_id, is_active FROM users WHERE role = 'super_admin' LIMIT 1").get() as any;
  const unit = db.prepare('SELECT * FROM organizational_units WHERE id = ?').get(user.unit_id);

  logAudit(user.unit_id, user.id, user.name, 'ADMIN_LOGIN_SUCCESS', 'users', user.id, { username: loginUser });

  res.json({
    user: {
      ...user,
      isAdmin: true
    },
    unit,
    token: `token-admin-${Date.now()}`
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const rawUserId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userId = (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId);

  if (userRole === 'super_admin' || userId === 'usr-admin') {
    const adminUser = db.prepare("SELECT id, email, name, role, phone, unit_id, household_id, is_active FROM users WHERE role = 'super_admin' LIMIT 1").get() as any;
    const unit = db.prepare('SELECT * FROM organizational_units WHERE id = ?').get(adminUser.unit_id);
    return res.json({ user: { ...adminUser, isAdmin: true }, unit });
  }

  // Default viewer (read-only mode)
  const defaultUnit = db.prepare('SELECT * FROM organizational_units LIMIT 1').get();
  res.json({
    user: {
      id: 'usr-guest',
      email: 'warga@kaswarga.id',
      name: 'Warga / Pengunjung (Hanya-Lihat)',
      role: 'warga',
      phone: '-',
      unit_id: 'unit-rt004',
      household_id: 'hh-03',
      is_active: 1,
      isAdmin: false
    },
    unit: defaultUnit
  });
});

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const period = (req.query.period as string) || '2026-10';

  // Ensure balances are up to date
  updateAccountBalances(unitId);

  // Available Cash Balances across accounts
  const accounts = db.prepare('SELECT id, name, code, account_type, bank_name, current_balance FROM cash_accounts WHERE unit_id = ? AND is_active = 1').all(unitId) as any[];
  const totalCashBalance = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);

  // Total posted income for period
  const incomeRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM financial_transactions 
    WHERE unit_id = ? AND type = 'income' AND status IN ('approved', 'paid') AND transaction_date LIKE ?
  `).get(unitId, `${period}%`) as any;

  // Total posted expenses for period
  const expenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM financial_transactions 
    WHERE unit_id = ? AND type = 'expense' AND status = 'paid' AND transaction_date LIKE ?
  `).get(unitId, `${period}%`) as any;

  const netCashFlow = incomeRow.total - expenseRow.total;

  // Outstanding fees (valid active invoices unpaid)
  const outstandingRow = db.prepare(`
    SELECT COALESCE(SUM(amount - paid_amount), 0) as total,
           COUNT(DISTINCT household_id) as unpaid_households
    FROM invoices 
    WHERE unit_id = ? AND status != 'canceled' AND (amount - paid_amount) > 0
  `).get(unitId) as any;

  // Invoices for period collection rate
  const periodInvoices = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_due,
           COALESCE(SUM(paid_amount), 0) as total_collected
    FROM invoices 
    WHERE unit_id = ? AND period = ? AND status != 'canceled'
  `).get(unitId, period) as any;

  const collectionRate = periodInvoices.total_due > 0 
    ? Math.round((periodInvoices.total_collected / periodInvoices.total_due) * 100) 
    : 0;

  // Recent 5 transactions
  const recentTransactions = db.prepare(`
    SELECT t.*, c.name as category_name, ca.name as account_name
    FROM financial_transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cash_accounts ca ON t.cash_account_id = ca.id
    WHERE t.unit_id = ?
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT 6
  `).all(unitId);

  // Category expenses breakdown
  const categoryExpenses = db.prepare(`
    SELECT c.name, COALESCE(SUM(t.amount), 0) as amount
    FROM categories c
    LEFT JOIN financial_transactions t ON t.category_id = c.id AND t.status = 'paid' AND t.type = 'expense' AND t.transaction_date LIKE ?
    WHERE c.unit_id = ? AND c.type = 'expense'
    GROUP BY c.id
    ORDER BY amount DESC
  `).all(`${period}%`, unitId);

  // Approvals awaiting action
  const pendingApprovals = db.prepare(`
    SELECT t.*, c.name as category_name, ca.name as account_name
    FROM financial_transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cash_accounts ca ON t.cash_account_id = ca.id
    WHERE t.unit_id = ? AND t.status = 'submitted'
    ORDER BY t.transaction_date ASC
  `).all(unitId);

  // Monthly cash flow history (last 6 months)
  const monthlyFlow = [
    { month: '2026-05', label: 'Mei', income: 4200000, expense: 3800000 },
    { month: '2026-06', label: 'Jun', income: 4850000, expense: 4100000 },
    { month: '2026-07', label: 'Jul', income: 5100000, expense: 4950000 },
    { month: '2026-08', label: 'Agt', income: 6400000, expense: 5800000 },
    { month: '2026-09', label: 'Sep', income: 5200000, expense: 4650000 },
    { month: '2026-10', label: 'Okt', income: incomeRow.total, expense: expenseRow.total }
  ];

  res.json({
    totalCashBalance,
    incomeCurrentPeriod: incomeRow.total,
    expenseCurrentPeriod: expenseRow.total,
    netCashFlow,
    outstandingFees: outstandingRow.total,
    unpaidHouseholdsCount: outstandingRow.unpaid_households,
    collectionRate,
    accounts,
    recentTransactions,
    categoryExpenses,
    pendingApprovals,
    monthlyFlow
  });
});

// -------------------------------------------------------------
// ORGANIZATIONAL UNITS
// -------------------------------------------------------------
app.get('/api/units', (req: Request, res: Response) => {
  const units = db.prepare('SELECT * FROM organizational_units').all();
  res.json(units);
});

// -------------------------------------------------------------
// HOUSEHOLDS & RESIDENTS
// -------------------------------------------------------------
app.get('/api/households', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const search = req.query.search ? `%${req.query.search}%` : null;

  let query = `
    SELECT h.*, 
           COUNT(r.id) as resident_count,
           COALESCE(SUM(CASE WHEN inv.status != 'canceled' THEN (inv.amount - inv.paid_amount) ELSE 0 END), 0) as arrears_total
    FROM households h
    LEFT JOIN residents r ON r.household_id = h.id AND r.is_active = 1
    LEFT JOIN invoices inv ON inv.household_id = h.id
    WHERE h.unit_id = ?
  `;
  const params: any[] = [unitId];

  if (search) {
    query += ` AND (h.head_name LIKE ? OR h.block_number LIKE ? OR h.family_card_no LIKE ? OR h.address LIKE ?)`;
    params.push(search, search, search, search);
  }

  query += ` GROUP BY h.id ORDER BY h.block_number ASC`;

  const households = db.prepare(query).all(...params);
  res.json(households);
});

app.post('/api/households', requireAdmin, (req: Request, res: Response) => {
  const { unit_id = 'unit-rt004', family_card_no, head_name, block_number, address, phone, registered_date, notes } = req.body;
  if (!head_name || !block_number || !family_card_no) {
    return res.status(400).json({ error: 'Nomor KK, Nama Kepala Keluarga, dan Nomor Blok wajib diisi' });
  }

  const id = `hh-${Date.now().toString().slice(-6)}`;
  db.prepare(`
    INSERT INTO households (id, unit_id, family_card_no, head_name, block_number, address, phone, registered_date, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(id, unit_id, family_card_no, head_name, block_number, address || '', phone || '', registered_date || new Date().toISOString().slice(0, 10), notes || '');

  // Add head as first resident
  const residentId = `res-${Date.now().toString().slice(-6)}`;
  db.prepare(`
    INSERT INTO residents (id, household_id, name, relation_to_head, gender, phone)
    VALUES (?, ?, ?, 'Kepala Keluarga', 'L', ?)
  `).run(residentId, id, head_name, phone || '');

  // Auto assign default monthly fees
  const mandatoryFees = db.prepare("SELECT id FROM fee_types WHERE unit_id = ? AND is_mandatory = 1").all(unit_id) as any[];
  for (const f of mandatoryFees) {
    db.prepare(`
      INSERT OR IGNORE INTO household_fee_assignments (id, household_id, fee_type_id, start_date)
      VALUES (?, ?, ?, ?)
    `).run(`asg-${id}-${f.id}`, id, f.id, new Date().toISOString().slice(0, 10));
  }

  logAudit(unit_id, 'usr-admin', 'Administrator RT', 'CREATE_HOUSEHOLD', 'households', id, req.body);
  res.status(201).json({ id, message: 'Rumah tangga berhasil ditambahkan' });
});

app.put('/api/households/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { head_name, block_number, address, phone, status, notes } = req.body;

  db.prepare(`
    UPDATE households 
    SET head_name = ?, block_number = ?, address = ?, phone = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(head_name, block_number, address, phone, status || 'active', notes || '', id);

  logAudit('unit-rt004', 'usr-admin', 'Administrator RT', 'UPDATE_HOUSEHOLD', 'households', id, req.body);
  res.json({ message: 'Data rumah tangga diperbarui' });
});

app.delete('/api/households/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare("UPDATE households SET status = 'inactive' WHERE id = ?").run(id);
  logAudit('unit-rt004', 'usr-admin', 'Administrator RT', 'DEACTIVATE_HOUSEHOLD', 'households', id, {});
  res.json({ message: 'Rumah tangga dinonaktifkan' });
});

// Residents List
app.get('/api/residents', (req: Request, res: Response) => {
  const householdId = req.query.household_id as string;
  let query = `
    SELECT r.*, h.block_number, h.address as household_address, h.head_name
    FROM residents r
    JOIN households h ON r.household_id = h.id
  `;
  const params: any[] = [];
  if (householdId) {
    query += ' WHERE r.household_id = ?';
    params.push(householdId);
  }
  query += ' ORDER BY h.block_number ASC, r.created_at ASC';
  const residents = db.prepare(query).all(...params);
  res.json(residents);
});

app.post('/api/residents', requireAdmin, (req: Request, res: Response) => {
  const { household_id, nik, name, relation_to_head, gender = 'L', phone, occupation } = req.body;
  if (!household_id || !name || !relation_to_head) {
    return res.status(400).json({ error: 'Rumah tangga, nama, dan hubungan keluarga wajib diisi' });
  }

  const id = `res-${Date.now().toString().slice(-6)}`;
  db.prepare(`
    INSERT INTO residents (id, household_id, nik, name, relation_to_head, gender, phone, occupation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, household_id, nik || '', name, relation_to_head, gender, phone || '', occupation || '');

  logAudit('unit-rt004', 'usr-admin', 'Administrator RT', 'CREATE_RESIDENT', 'residents', id, req.body);
  res.status(201).json({ id, message: 'Anggota keluarga berhasil didaftarkan' });
});

// -------------------------------------------------------------
// FEE TYPES
// -------------------------------------------------------------
app.get('/api/fee-types', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const fees = db.prepare('SELECT * FROM fee_types WHERE unit_id = ? ORDER BY is_mandatory DESC, code ASC').all(unitId);
  res.json(fees);
});

app.post('/api/fee-types', requireAdmin, (req: Request, res: Response) => {
  const { unit_id = 'unit-rt004', code, name, description, amount, frequency = 'monthly', is_mandatory = 1, due_day_of_month = 10 } = req.body;
  const id = `fee-${Date.now().toString().slice(-6)}`;
  db.prepare(`
    INSERT INTO fee_types (id, unit_id, code, name, description, amount, frequency, is_mandatory, due_day_of_month)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, unit_id, code, name, description, amount, frequency, is_mandatory ? 1 : 0, due_day_of_month);

  logAudit(unit_id, 'usr-admin', 'Administrator RT', 'CREATE_FEE_TYPE', 'fee_types', id, req.body);
  res.status(201).json({ id, message: 'Jenis iuran berhasil dikonfigurasi' });
});

app.put('/api/fee-types/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, amount, due_day_of_month, is_active } = req.body;
  db.prepare(`
    UPDATE fee_types 
    SET name = ?, description = ?, amount = ?, due_day_of_month = ?, is_active = ?
    WHERE id = ?
  `).run(name, description, amount, due_day_of_month, is_active ? 1 : 0, id);
  res.json({ message: 'Konfigurasi iuran diperbarui' });
});

// -------------------------------------------------------------
// INVOICES & AUTOMATIC GENERATION
// -------------------------------------------------------------
app.get('/api/invoices', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const period = req.query.period as string;
  const status = req.query.status as string;
  const householdId = req.query.household_id as string;

  let query = `
    SELECT inv.*, 
           h.head_name, h.block_number, h.phone as household_phone,
           ft.name as fee_name, ft.code as fee_code
    FROM invoices inv
    JOIN households h ON inv.household_id = h.id
    JOIN fee_types ft ON inv.fee_type_id = ft.id
    WHERE inv.unit_id = ?
  `;
  const params: any[] = [unitId];

  if (period) {
    query += ' AND inv.period = ?';
    params.push(period);
  }
  if (status && status !== 'all') {
    query += ' AND inv.status = ?';
    params.push(status);
  }
  if (householdId) {
    query += ' AND inv.household_id = ?';
    params.push(householdId);
  }

  query += ' ORDER BY inv.due_date DESC, h.block_number ASC';
  const invoices = db.prepare(query).all(...params);
  res.json(invoices);
});

// Idempotent batch invoice generator
app.post('/api/invoices/generate-recurring', requireAdmin, (req: Request, res: Response) => {
  const { unit_id = 'unit-rt004', period } = req.body;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: 'Format periode tidak valid (harus YYYY-MM)' });
  }

  // Find all active households and their assigned monthly fees
  const assignments = db.prepare(`
    SELECT h.id as household_id, h.block_number, ft.id as fee_type_id, ft.amount, ft.due_day_of_month,
           COALESCE(hfa.custom_amount, ft.amount) as final_amount
    FROM households h
    JOIN fee_types ft ON ft.unit_id = h.unit_id AND ft.frequency = 'monthly' AND ft.is_active = 1
    LEFT JOIN household_fee_assignments hfa ON hfa.household_id = h.id AND hfa.fee_type_id = ft.id
    WHERE h.unit_id = ? AND h.status = 'active' AND (hfa.is_exempt IS NULL OR hfa.is_exempt = 0)
  `).all(unit_id) as any[];

  let createdCount = 0;
  let skippedCount = 0;

  for (const asg of assignments) {
    const invoiceNumber = `INV/${period.replace('-', '')}/${asg.household_id.toUpperCase()}/${asg.fee_type_id.slice(-3).toUpperCase()}`;
    const id = `inv-${period}-${asg.household_id}-${asg.fee_type_id}`;
    const dueDay = String(asg.due_day_of_month || 10).padStart(2, '0');
    const dueDate = `${period}-${dueDay}`;

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO invoices (id, unit_id, invoice_number, household_id, fee_type_id, period, amount, paid_amount, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'unpaid', ?)
    `);

    const result = stmt.run(id, unit_id, invoiceNumber, asg.household_id, asg.fee_type_id, period, asg.final_amount, dueDate);
    if (result.changes > 0) {
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  logAudit(unit_id, 'usr-bendahara', 'Siti Rahmawati, S.E.', 'GENERATE_RECURRING_INVOICES', 'invoices', period, {
    period,
    createdCount,
    skippedCount
  });

  res.json({
    message: `Proses batch selesai: ${createdCount} tagihan baru dibuat, ${skippedCount} tagihan telah ada (dilewati).`,
    createdCount,
    skippedCount
  });
});

// -------------------------------------------------------------
// PAYMENTS & ALLOCATIONS (LOKET PEMBAYARAN)
// -------------------------------------------------------------
app.get('/api/payments', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const householdId = req.query.household_id as string;

  let query = `
    SELECT p.*, h.head_name, h.block_number, ca.name as account_name
    FROM payments p
    JOIN households h ON p.household_id = h.id
    JOIN cash_accounts ca ON p.cash_account_id = ca.id
    WHERE p.unit_id = ?
  `;
  const params: any[] = [unitId];

  if (householdId) {
    query += ' AND p.household_id = ?';
    params.push(householdId);
  }
  query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

  const payments = db.prepare(query).all(...params);
  res.json(payments);
});

app.get('/api/payments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = db.prepare(`
    SELECT p.*, h.head_name, h.block_number, h.address as household_address, h.phone as household_phone,
           ca.name as account_name, ca.bank_name, u.name as unit_name, u.rt_number, u.rw_number
    FROM payments p
    JOIN households h ON p.household_id = h.id
    JOIN cash_accounts ca ON p.cash_account_id = ca.id
    JOIN organizational_units u ON p.unit_id = u.id
    WHERE p.id = ?
  `).get(id) as any;

  if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });

  const allocations = db.prepare(`
    SELECT pa.*, inv.invoice_number, inv.period, ft.name as fee_name
    FROM payment_allocations pa
    JOIN invoices inv ON pa.invoice_id = inv.id
    JOIN fee_types ft ON inv.fee_type_id = ft.id
    WHERE pa.payment_id = ?
  `).all(id);

  res.json({ ...payment, allocations });
});

// Atomic payment submission with receipt generation, proof attachment, and ledger income entry
app.post('/api/payments', requireAdmin, (req: Request, res: Response) => {
  const {
    unit_id = 'unit-rt004',
    household_id,
    allocations, // Array of { invoice_id, amount }
    payment_method = 'cash',
    cash_account_id,
    reference_no = '',
    proof_attachment = null,
    notes = '',
    created_by = 'usr-admin'
  } = req.body;

  if (!household_id || !cash_account_id || !Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ error: 'Data pembayaran tidak lengkap (wajib pilih KK, akun kas, dan tagihan)' });
  }

  const totalAmount = allocations.reduce((sum: number, item: any) => sum + (parseInt(item.amount, 10) || 0), 0);
  if (totalAmount <= 0) {
    return res.status(400).json({ error: 'Nominal pembayaran harus lebih besar dari 0' });
  }

  // Validate allocations against invoice remaining balance
  for (const alloc of allocations) {
    const inv = db.prepare('SELECT amount, paid_amount, status FROM invoices WHERE id = ?').get(alloc.invoice_id) as any;
    if (!inv) return res.status(400).json({ error: `Tagihan ${alloc.invoice_id} tidak valid` });
    const remaining = inv.amount - inv.paid_amount;
    if (alloc.amount > remaining) {
      return res.status(400).json({ 
        error: `Nominal alokasi (Rp ${alloc.amount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${remaining.toLocaleString('id-ID')})` 
      });
    }
  }

  // Generate unique sequential receipt number
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM payments WHERE receipt_number LIKE ?").get(`KW-${yyyymm}-%`) as any;
  const seq = String(countRow.cnt + 1).padStart(4, '0');
  const receiptNumber = `KW-${yyyymm}-${seq}`;
  const paymentNumber = `PAY-${yyyymm}-${seq}`;
  const paymentId = `pay-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  // Execute in SQLite Transaction for ACID atomicity
  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Insert Payment with proof attachment
    db.prepare(`
      INSERT INTO payments (id, unit_id, payment_number, receipt_number, household_id, total_amount, payment_date, payment_method, cash_account_id, reference_no, proof_attachment, notes, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `).run(paymentId, unit_id, paymentNumber, receiptNumber, household_id, totalAmount, today, payment_method, cash_account_id, reference_no, proof_attachment, notes, created_by);

    // 2. Insert Allocations & update invoices
    for (const alloc of allocations) {
      const allocId = `alloc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
        VALUES (?, ?, ?, ?)
      `).run(allocId, paymentId, alloc.invoice_id, alloc.amount);

      db.prepare(`
        UPDATE invoices 
        SET paid_amount = paid_amount + ?,
            status = CASE WHEN paid_amount + ? >= amount THEN 'paid' ELSE 'partially_paid' END
        WHERE id = ?
      `).run(alloc.amount, alloc.amount, alloc.invoice_id);
    }

    // 3. Insert linked Financial Transaction (Accounting Income Movement)
    const hh = db.prepare('SELECT head_name, block_number FROM households WHERE id = ?').get(household_id) as any;
    const txId = `tx-inc-${Date.now()}`;
    const txNumber = `TRX/${yyyymm}/${seq}`;
    db.prepare(`
      INSERT INTO financial_transactions (id, unit_id, transaction_number, transaction_date, type, category_id, cash_account_id, amount, description, payer_payee, payment_method, status, requested_by, approved_by, approved_at, receipt_attachment, payment_id)
      VALUES (?, ?, ?, ?, 'income', 'cat-inc-ipl', ?, ?, ?, ?, ?, 'approved', ?, 'usr-admin', CURRENT_TIMESTAMP, ?, ?)
    `).run(
      txId,
      unit_id,
      txNumber,
      today,
      cash_account_id,
      totalAmount,
      `Penerimaan Iuran Warga (${receiptNumber}) - ${hh.head_name} (${hh.block_number})`,
      `${hh.head_name} (${hh.block_number})`,
      payment_method,
      created_by,
      proof_attachment,
      paymentId
    );

    // 4. Update Cash Account Balances
    updateAccountBalances(unit_id);

    db.exec('COMMIT;');

    logAudit(unit_id, created_by, 'Administrator RT', 'RECORD_PAYMENT', 'payments', paymentId, {
      receiptNumber,
      totalAmount,
      household: hh.head_name
    });

    res.status(201).json({
      message: 'Pembayaran berhasil disimpan dan kwitansi diterbitkan',
      paymentId,
      receiptNumber
    });
  } catch (error: any) {
    db.exec('ROLLBACK;');
    console.error('Payment transaction error:', error);
    res.status(500).json({ error: `Gagal memproses pembayaran: ${error.message}` });
  }
});

// -------------------------------------------------------------
// FINANCIAL TRANSACTIONS (PEMASUKAN, PENGELUARAN, TRANSFER)
// -------------------------------------------------------------
app.get('/api/transactions', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const type = req.query.type as string;
  const status = req.query.status as string;
  const period = req.query.period as string;

  let query = `
    SELECT t.*, 
           c.name as category_name, c.code as category_code,
           ca.name as account_name, ca.bank_name,
           to_ca.name as to_account_name,
           v.name as vendor_name
    FROM financial_transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cash_accounts ca ON t.cash_account_id = ca.id
    LEFT JOIN cash_accounts to_ca ON t.to_cash_account_id = to_ca.id
    LEFT JOIN vendors v ON t.vendor_id = v.id
    WHERE t.unit_id = ?
  `;
  const params: any[] = [unitId];

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }
  if (status && status !== 'all') {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (period) {
    query += ' AND t.transaction_date LIKE ?';
    params.push(`${period}%`);
  }

  query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
  const txs = db.prepare(query).all(...params);
  res.json(txs);
});

// Single transaction detail with receipt voucher & photo
app.get('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const tx = db.prepare(`
    SELECT t.*, 
           c.name as category_name, c.code as category_code,
           ca.name as account_name, ca.bank_name, ca.account_number,
           to_ca.name as to_account_name,
           v.name as vendor_name, v.service_type as vendor_service, v.bank_account as vendor_bank,
           u.name as unit_name, u.rt_number, u.rw_number
    FROM financial_transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cash_accounts ca ON t.cash_account_id = ca.id
    LEFT JOIN cash_accounts to_ca ON t.to_cash_account_id = to_ca.id
    LEFT JOIN vendors v ON t.vendor_id = v.id
    LEFT JOIN organizational_units u ON t.unit_id = u.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  res.json(tx);
});

// Create manual transaction (Non-invoice Income or Expense with receipt photo)
app.post('/api/transactions', requireAdmin, (req: Request, res: Response) => {
  const {
    unit_id = 'unit-rt004',
    type, // 'income' | 'expense'
    category_id,
    cash_account_id,
    amount,
    description,
    payer_payee,
    payment_method = 'cash',
    transaction_date,
    vendor_id = null,
    receipt_attachment = null,
    requested_by = 'usr-admin'
  } = req.body;

  if (!type || !amount || !description || !cash_account_id) {
    return res.status(400).json({ error: 'Data transaksi tidak lengkap' });
  }

  const txId = `tx-${Date.now()}`;
  const yyyymm = (transaction_date || new Date().toISOString().slice(0, 10)).slice(0, 7).replace('-', '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM financial_transactions WHERE transaction_number LIKE ?").get(`TRX/${yyyymm}/%`) as any;
  const seq = String(countRow.cnt + 1).padStart(3, '0');
  const txNumber = `TRX/${yyyymm}/${seq}`;

  // If expense >= Rp 500.000 and created not by admin, set status to 'submitted' for Ketua RT approval;
  // Admin creations or income are directly 'paid' / 'approved'
  let status = 'approved';
  if (type === 'expense') {
    status = 'paid';
  }

  db.prepare(`
    INSERT INTO financial_transactions (id, unit_id, transaction_number, transaction_date, type, category_id, cash_account_id, amount, description, payer_payee, payment_method, status, requested_by, vendor_id, approved_by, approved_at, receipt_attachment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    txId,
    unit_id,
    txNumber,
    transaction_date || new Date().toISOString().slice(0, 10),
    type,
    category_id || null,
    cash_account_id,
    amount,
    description,
    payer_payee || '',
    payment_method,
    status,
    requested_by,
    vendor_id,
    requested_by,
    new Date().toISOString(),
    receipt_attachment
  );

  updateAccountBalances(unit_id);
  logAudit(unit_id, requested_by, 'Administrator RT', `CREATE_${type.toUpperCase()}`, 'financial_transactions', txId, req.body);

  res.status(201).json({
    id: txId,
    transaction_number: txNumber,
    status,
    message: 'Transaksi kas dan bukti kwitansi foto berhasil dicatat.'
  });
});

// Internal Account Transfer (Kas Tunai <-> Rekening Bank)
app.post('/api/transactions/transfer', requireAdmin, (req: Request, res: Response) => {
  const {
    unit_id = 'unit-rt004',
    from_account_id,
    to_account_id,
    amount,
    description,
    transaction_date = new Date().toISOString().slice(0, 10),
    requested_by = 'usr-bendahara'
  } = req.body;

  if (!from_account_id || !to_account_id || !amount || from_account_id === to_account_id) {
    return res.status(400).json({ error: 'Rekening asal dan tujuan harus berbeda dan nominal harus valid' });
  }

  const fromAcc = db.prepare('SELECT name, current_balance FROM cash_accounts WHERE id = ?').get(from_account_id) as any;
  if (!fromAcc || fromAcc.current_balance < amount) {
    return res.status(400).json({ error: `Saldo ${fromAcc?.name || 'rekening asal'} tidak mencukupi untuk transfer ini.` });
  }

  const txId = `tx-trf-${Date.now()}`;
  const yyyymm = transaction_date.slice(0, 7).replace('-', '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM financial_transactions WHERE transaction_number LIKE ?").get(`TRX/${yyyymm}/%`) as any;
  const seq = String(countRow.cnt + 1).padStart(3, '0');
  const txNumber = `TRX/${yyyymm}/${seq}`;

  db.prepare(`
    INSERT INTO financial_transactions (id, unit_id, transaction_number, transaction_date, type, cash_account_id, to_cash_account_id, amount, description, status, requested_by, approved_by, approved_at)
    VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?, ?, 'paid', ?, 'usr-ketua', CURRENT_TIMESTAMP)
  `).run(txId, unit_id, txNumber, transaction_date, from_account_id, to_account_id, amount, description || 'Transfer Internal Antar Rekening Kas', requested_by);

  updateAccountBalances(unit_id);
  logAudit(unit_id, requested_by, 'Bendahara', 'INTERNAL_TRANSFER', 'financial_transactions', txId, req.body);

  res.status(201).json({ message: 'Transfer internal berhasil dibukukan' });
});

// Approval by Admin
app.put('/api/transactions/:id/approve', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by = 'usr-admin' } = req.body;

  const tx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(id) as any;
  if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

  db.prepare(`
    UPDATE financial_transactions
    SET status = 'paid', approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(approved_by, id);

  updateAccountBalances(tx.unit_id);
  logAudit(tx.unit_id, approved_by, 'Administrator RT', 'APPROVE_EXPENSE', 'financial_transactions', id, { status: 'paid' });

  res.json({ message: 'Pengeluaran telah disetujui dan dibayarkan dari saldo kas.' });
});

// Rejection by Admin
app.put('/api/transactions/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { rejection_reason, rejected_by = 'usr-admin' } = req.body;

  if (!rejection_reason) {
    return res.status(400).json({ error: 'Alasan penolakan wajib dicantumkan dalam berita acara.' });
  }

  const tx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(id) as any;
  if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

  db.prepare(`
    UPDATE financial_transactions
    SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(rejection_reason, rejected_by, id);

  logAudit(tx.unit_id, rejected_by, 'Administrator RT', 'REJECT_EXPENSE', 'financial_transactions', id, { rejection_reason });
  res.json({ message: 'Pengajuan pengeluaran telah ditolak.' });
});

// -------------------------------------------------------------
// CASH ACCOUNTS
// -------------------------------------------------------------
app.get('/api/cash-accounts', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  updateAccountBalances(unitId);
  const accounts = db.prepare('SELECT * FROM cash_accounts WHERE unit_id = ? ORDER BY code ASC').all(unitId);
  res.json(accounts);
});

// -------------------------------------------------------------
// CATEGORIES & BUDGETS
// -------------------------------------------------------------
app.get('/api/categories', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const categories = db.prepare('SELECT * FROM categories WHERE unit_id = ? ORDER BY type ASC, code ASC').all(unitId);
  res.json(categories);
});

app.get('/api/budgets', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;

  const rows = db.prepare(`
    SELECT b.id, b.year, b.budgeted_amount, b.notes,
           c.id as category_id, c.code as category_code, c.name as category_name,
           COALESCE(SUM(CASE WHEN t.status = 'paid' AND t.type = 'expense' THEN t.amount ELSE 0 END), 0) as actual_spent
    FROM categories c
    LEFT JOIN budgets b ON b.category_id = c.id AND b.year = ?
    LEFT JOIN financial_transactions t ON t.category_id = c.id AND t.transaction_date LIKE ?
    WHERE c.unit_id = ? AND c.type = 'expense'
    GROUP BY c.id
    ORDER BY c.code ASC
  `).all(year, `${year}%`, unitId);

  res.json(rows);
});

app.post('/api/budgets', requireAdmin, (req: Request, res: Response) => {
  const { unit_id = 'unit-rt004', category_id, year = 2026, budgeted_amount, notes } = req.body;
  const id = `bdg-${year}-${category_id}`;

  db.prepare(`
    INSERT INTO budgets (id, unit_id, category_id, year, budgeted_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(unit_id, category_id, year, month) DO UPDATE SET
    budgeted_amount = excluded.budgeted_amount,
    notes = excluded.notes
  `).run(id, unit_id, category_id, year, budgeted_amount, notes || '');

  res.json({ message: 'Anggaran belanja berhasil disimpan' });
});

// -------------------------------------------------------------
// MULTI-VENDOR MANAGEMENT
// -------------------------------------------------------------
app.get('/api/vendors', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const vendors = db.prepare(`
    SELECT v.*,
           COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.amount ELSE 0 END), 0) as total_disbursed,
           COUNT(t.id) as transaction_count
    FROM vendors v
    LEFT JOIN financial_transactions t ON t.vendor_id = v.id
    WHERE v.unit_id = ?
    GROUP BY v.id
    ORDER BY v.name ASC
  `).all(unitId);
  res.json(vendors);
});

app.post('/api/vendors', requireAdmin, (req: Request, res: Response) => {
  const { unit_id = 'unit-rt004', name, service_type, contact_person, phone, bank_account, address, notes } = req.body;
  const id = `ven-${Date.now().toString().slice(-6)}`;

  db.prepare(`
    INSERT INTO vendors (id, unit_id, name, service_type, contact_person, phone, bank_account, address, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, unit_id, name, service_type, contact_person, phone, bank_account, address, notes);

  res.status(201).json({ id, message: 'Vendor berhasil didaftarkan' });
});

// -------------------------------------------------------------
// FINANCIAL REPORTS & TRANSPARENCY
// -------------------------------------------------------------
app.get('/api/reports/cashbook', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const accountId = req.query.account_id as string;
  const period = (req.query.period as string) || '2026-10';

  let query = `
    SELECT t.*, c.name as category_name, ca.name as account_name, to_ca.name as to_account_name
    FROM financial_transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN cash_accounts ca ON t.cash_account_id = ca.id
    LEFT JOIN cash_accounts to_ca ON t.to_cash_account_id = to_ca.id
    WHERE t.unit_id = ? AND t.status = 'paid' AND t.transaction_date LIKE ?
  `;
  const params: any[] = [unitId, `${period}%`];

  if (accountId && accountId !== 'all') {
    query += ' AND (t.cash_account_id = ? OR t.to_cash_account_id = ?)';
    params.push(accountId, accountId);
  }

  query += ' ORDER BY t.transaction_date ASC, t.created_at ASC';
  const transactions = db.prepare(query).all(...params);

  res.json({
    period,
    generatedAt: new Date().toISOString(),
    transactions
  });
});

app.get('/api/reports/transparency', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const period = (req.query.period as string) || '2026-10';

  // Aggregate community data (NO private phone numbers or individual resident names!)
  const totalBalance = (db.prepare('SELECT SUM(current_balance) as tot FROM cash_accounts WHERE unit_id = ?').get(unitId) as any).tot;

  const incomeTot = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as tot 
    FROM financial_transactions 
    WHERE unit_id = ? AND type = 'income' AND status IN ('approved', 'paid') AND transaction_date LIKE ?
  `).get(unitId, `${period}%`) as any).tot;

  const expenseTot = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as tot 
    FROM financial_transactions 
    WHERE unit_id = ? AND type = 'expense' AND status = 'paid' AND transaction_date LIKE ?
  `).get(unitId, `${period}%`) as any).tot;

  const categoryBreakdown = db.prepare(`
    SELECT c.name, COALESCE(SUM(t.amount), 0) as total
    FROM categories c
    JOIN financial_transactions t ON t.category_id = c.id AND t.status = 'paid' AND t.transaction_date LIKE ?
    WHERE c.unit_id = ?
    GROUP BY c.id
    ORDER BY total DESC
  `).all(`${period}%`, unitId);

  const unit = db.prepare('SELECT * FROM organizational_units WHERE id = ?').get(unitId);

  res.json({
    unit,
    period,
    totalBalance,
    totalIncome: incomeTot,
    totalExpense: expenseTot,
    netSurplus: incomeTot - expenseTot,
    categoryBreakdown,
    publishedAt: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// AUDIT LOGS, NOTIFICATIONS & USERS
// -------------------------------------------------------------
app.get('/api/audit-logs', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const logs = db.prepare('SELECT * FROM audit_logs WHERE unit_id = ? ORDER BY created_at DESC LIMIT 100').all(unitId);
  res.json(logs);
});

app.get('/api/notifications', (req: Request, res: Response) => {
  const notifs = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20').all();
  res.json(notifs);
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = db.prepare('SELECT id, email, name, role, phone, unit_id, household_id, is_active, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

app.get('/api/settings', (req: Request, res: Response) => {
  const unitId = (req.query.unit_id as string) || 'unit-rt004';
  const settings = db.prepare('SELECT setting_key, setting_value FROM app_settings WHERE unit_id = ?').all(unitId);
  const map: Record<string, string> = {};
  for (const s of settings as any[]) {
    map[s.setting_key] = s.setting_value;
  }
  res.json(map);
});

app.post('/api/settings', requireAdmin, (req: Request, res: Response) => {
  const unitId = req.body.unit_id || 'unit-rt004';
  const settings = req.body.settings || {};

  for (const [key, val] of Object.entries(settings)) {
    db.prepare(`
      INSERT INTO app_settings (id, unit_id, setting_key, setting_value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(unit_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(`set-${key}`, unitId, key, String(val));
  }

  res.json({ message: 'Pengaturan berhasil disimpan' });
});

// -------------------------------------------------------------
// AUTOMATED TEST SUITE API
// -------------------------------------------------------------
app.post('/api/tests/run', (req: Request, res: Response) => {
  const report = runAutomatedTests();
  res.json(report);
});

// -------------------------------------------------------------
// VITE CLIENT MOUNTING (DEV / PROD)
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KAS WARGA] Backend & Frontend Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
