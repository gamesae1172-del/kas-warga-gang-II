import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'kas_warga.sqlite');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizational_units (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      rt_number TEXT NOT NULL,
      rw_number TEXT NOT NULL,
      kelurahan TEXT NOT NULL,
      kecamatan TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'ketua_rt', 'bendahara', 'warga')),
      phone TEXT,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      household_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      family_card_no TEXT NOT NULL,
      head_name TEXT NOT NULL,
      block_number TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'moved_out')),
      notes TEXT,
      registered_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      nik TEXT,
      name TEXT NOT NULL,
      relation_to_head TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
      phone TEXT,
      occupation TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_types (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('monthly', 'one_time', 'voluntary')),
      is_mandatory INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      due_day_of_month INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS household_fee_assignments (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      fee_type_id TEXT NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
      custom_amount INTEGER,
      is_exempt INTEGER DEFAULT 0,
      start_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(household_id, fee_type_id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      invoice_number TEXT UNIQUE NOT NULL,
      household_id TEXT NOT NULL REFERENCES households(id),
      fee_type_id TEXT NOT NULL REFERENCES fee_types(id),
      period TEXT NOT NULL, -- format YYYY-MM
      amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'canceled')),
      due_date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(household_id, fee_type_id, period)
    );

    CREATE TABLE IF NOT EXISTS cash_accounts (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK(account_type IN ('cash', 'bank', 'other')),
      bank_name TEXT,
      account_number TEXT,
      initial_balance INTEGER NOT NULL DEFAULT 0,
      current_balance INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      payment_number TEXT UNIQUE NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      household_id TEXT NOT NULL REFERENCES households(id),
      total_amount INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'qris', 'other')),
      cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
      reference_no TEXT,
      proof_attachment TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'reversed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      amount INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      bank_account TEXT,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      transaction_number TEXT UNIQUE NOT NULL,
      transaction_date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      category_id TEXT REFERENCES categories(id),
      cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
      to_cash_account_id TEXT REFERENCES cash_accounts(id),
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      payer_payee TEXT,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'reversed')),
      rejection_reason TEXT,
      requested_by TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      receipt_attachment TEXT,
      payment_id TEXT REFERENCES payments(id),
      vendor_id TEXT REFERENCES vendors(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      year INTEGER NOT NULL,
      month INTEGER, -- NULL for annual budget, 1-12 for monthly
      budgeted_amount INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(unit_id, category_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      unit_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'urgent')),
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES organizational_units(id),
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(unit_id, setting_key)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period);
    CREATE INDEX IF NOT EXISTS idx_invoices_household ON invoices(household_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_trans_date ON financial_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_trans_status ON financial_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_trans_unit ON financial_transactions(unit_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  const unitCount = (db.prepare('SELECT COUNT(*) as cnt FROM organizational_units').get() as { cnt: number }).cnt;
  if (unitCount > 0) return;

  const unitId = 'unit-rt004';
  db.prepare(`
    INSERT INTO organizational_units (id, code, name, rt_number, rw_number, kelurahan, kecamatan, city, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    unitId,
    'RT004-RW012',
    'Rukun Tetangga 004 / RW 012',
    '004',
    '012',
    'Pondok Jagung',
    'Serpong Utara',
    'Tangerang Selatan',
    'Kompleks Perumahan Taman Graha Asri Blok A-D'
  );

  // Settings
  const settings = [
    { key: 'rt_name', value: 'RT 004 / RW 012 Taman Graha Asri' },
    { key: 'rt_head_name', value: 'Ir. H. Budi Santoso' },
    { key: 'treasurer_name', value: 'Siti Rahmawati, S.E.' },
    { key: 'secretary_name', value: 'Ahmad Fauzi, M.Kom.' },
    { key: 'contact_phone', value: '0812-3456-7890' },
    { key: 'default_due_day', value: '10' },
    { key: 'approval_threshold_idr', value: '500000' }
  ];
  for (const s of settings) {
    db.prepare('INSERT INTO app_settings (id, unit_id, setting_key, setting_value) VALUES (?, ?, ?, ?)').run(
      `set-${s.key}`, unitId, s.key, s.value
    );
  }

  // Cash Accounts
  const accounts = [
    { id: 'acc-cash', code: '101', name: 'Kas Tunai Bendahara', type: 'cash', bank: '', accNo: '', init: 4850000 },
    { id: 'acc-bca', code: '102', name: 'Rekening Bank BCA RT 004', type: 'bank', bank: 'BCA', accNo: '8830129481', init: 32400000 },
    { id: 'acc-social', code: '103', name: 'Kas Sosial & Kematian', type: 'other', bank: 'Bank Mandiri', accNo: '14200889102', init: 8750000 }
  ];
  for (const acc of accounts) {
    db.prepare(`
      INSERT INTO cash_accounts (id, unit_id, code, name, account_type, bank_name, account_number, initial_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(acc.id, unitId, acc.code, acc.name, acc.type, acc.bank, acc.accNo, acc.init, acc.init);
  }

  // Categories
  const categories = [
    { id: 'cat-inc-ipl', type: 'income', code: 'INC-01', name: 'Iuran Pengelolaan Lingkungan (IPL)', desc: 'Iuran bulanan warga terpadu' },
    { id: 'cat-inc-social', type: 'income', code: 'INC-02', name: 'Iuran Dana Sosial & Duka', desc: 'Dana santunan dan sosial kemanusiaan' },
    { id: 'cat-inc-donation', type: 'income', code: 'INC-03', name: 'Donasi & Sumbangan Warga', desc: 'Sumbangan sukarela warga dan donatur' },
    { id: 'cat-inc-rent', type: 'income', code: 'INC-04', name: 'Sewa Fasum & Lapangan', desc: 'Penerimaan sewa balai warga & lapangan olah raga' },

    { id: 'cat-exp-security', type: 'expense', code: 'EXP-01', name: 'Honor & Operasional Keamanan (Satpam)', desc: 'Gaji dan konsumsi satpam 24 jam' },
    { id: 'cat-exp-waste', type: 'expense', code: 'EXP-02', name: 'Pengangkutan Sampah & Kebersihan', desc: 'Vendor truk sampah dan petugas kebersihan' },
    { id: 'cat-exp-facility', type: 'expense', code: 'EXP-03', name: 'Pemeliharaan Fasum & Penerangan Jalan', desc: 'Perbaikan lampu jalan, taman, dan saluran' },
    { id: 'cat-exp-social', type: 'expense', code: 'EXP-04', name: 'Santunan Warga Sakit / Duka Cita', desc: 'Bantuan sosial duka cita warga' },
    { id: 'cat-exp-event', type: 'expense', code: 'EXP-05', name: 'Kegiatan Warga & Peringatan Hari Besar', desc: 'Kerja bakti, 17 Agustusan, dan halal bihalal' },
    { id: 'cat-exp-admin', type: 'expense', code: 'EXP-06', name: 'ATK & Operasional Kesekretariatan', desc: 'Kertas, cetak stempel, dan operasional RT' }
  ];
  for (const cat of categories) {
    db.prepare(`
      INSERT INTO categories (id, unit_id, type, code, name, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cat.id, unitId, cat.type, cat.code, cat.name, cat.desc);
  }

  // Vendors
  const vendors = [
    { id: 'ven-01', name: 'PT Harapan Bersih Lestari', service: 'Pengangkutan Sampah & Pengolahan Limbah', contact: 'Bpk. Subagyo', phone: '0813-8822-1190', bank: 'BRI 0206-01-002938-50-1' },
    { id: 'ven-02', name: 'Paguyuban Garda Swakarsa RT', service: 'Penyedia Jasa Satpam & Keamanan', contact: 'Danru Suparno', phone: '0857-1928-3344', bank: 'BCA 7720918233' },
    { id: 'ven-03', name: 'CV Terang Abadi Elektrik', service: 'Penerangan Jalan Umum & Kelistrikan', contact: 'Ko David', phone: '0812-9988-7711', bank: 'Mandiri 12700091827' },
    { id: 'ven-04', name: 'Toko Material Berkah Mandiri', service: 'Bahan Bangunan, Pasir, Semen, Cat Fasum', contact: 'Haji Mansur', phone: '0818-4455-6677', bank: 'BSI 7149920192' }
  ];
  for (const v of vendors) {
    db.prepare(`
      INSERT INTO vendors (id, unit_id, name, service_type, contact_person, phone, bank_account, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(v.id, unitId, v.name, v.service, v.contact, v.phone, v.bank);
  }

  // Fee Types
  const feeTypes = [
    { id: 'fee-ipl', code: 'IPL-BLN', name: 'Iuran Pengelolaan Lingkungan (IPL)', desc: 'Keamanan, kebersihan sampah, dan penerangan jalan', amount: 150000, freq: 'monthly', mand: 1, dueDay: 10 },
    { id: 'fee-social', code: 'SOSIAL-BLN', name: 'Iuran Dana Sosial & Duka', desc: 'Santunan duka warga dan bantuan sosial warga sakit', amount: 20000, freq: 'monthly', mand: 1, dueDay: 10 },
    { id: 'fee-event', code: 'EVT-17AN', name: 'Iuran Peringatan HUT RI ke-81', desc: 'Pentas seni, perlombaan anak-anak, dan tasyakuran', amount: 100000, freq: 'one_time', mand: 1, dueDay: 15 }
  ];
  for (const f of feeTypes) {
    db.prepare(`
      INSERT INTO fee_types (id, unit_id, code, name, description, amount, frequency, is_mandatory, due_day_of_month)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(f.id, unitId, f.code, f.name, f.desc, f.amount, f.freq, f.mand, f.dueDay);
  }

  // Households
  const households = [
    { id: 'hh-01', kk: '3674030101230001', head: 'Ir. H. Budi Santoso', block: 'Blok A1 No. 12', address: 'Jl. Graha Asri Utama No. 12', phone: '0811-9876-543', reg: '2022-01-15' },
    { id: 'hh-02', kk: '3674030101230002', head: 'Siti Rahmawati, S.E.', block: 'Blok A1 No. 14', address: 'Jl. Graha Asri Utama No. 14', phone: '0812-8877-665', reg: '2022-02-10' },
    { id: 'hh-03', kk: '3674030101230003', head: 'Hendra Wijaya', block: 'Blok B2 No. 08', address: 'Jl. Flamboyan 2 No. 08', phone: '0813-1122-334', reg: '2022-03-01' },
    { id: 'hh-04', kk: '3674030101230004', head: 'dr. Ahmad Fauzi, Sp.A', block: 'Blok B2 No. 10', address: 'Jl. Flamboyan 2 No. 10', phone: '0815-5544-332', reg: '2022-04-12' },
    { id: 'hh-05', kk: '3674030101230005', head: 'Agus Pratama', block: 'Blok C3 No. 04', address: 'Jl. Cempaka 3 No. 04', phone: '0817-6655-443', reg: '2022-05-20' },
    { id: 'hh-06', kk: '3674030101230006', head: 'Hj. Maryam Kusuma', block: 'Blok C3 No. 06', address: 'Jl. Cempaka 3 No. 06', phone: '0818-7788-990', reg: '2022-06-05' },
    { id: 'hh-07', kk: '3674030101230007', head: 'Dedi Kurniawan', block: 'Blok D4 No. 01', address: 'Jl. Dahlia 4 No. 01', phone: '0819-0011-223', reg: '2023-01-10' },
    { id: 'hh-08', kk: '3674030101230008', head: 'Lie Fung / Kelvin', block: 'Blok D4 No. 03', address: 'Jl. Dahlia 4 No. 03', phone: '0812-4433-221', reg: '2023-02-14' }
  ];
  for (const h of households) {
    db.prepare(`
      INSERT INTO households (id, unit_id, family_card_no, head_name, block_number, address, phone, registered_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(h.id, unitId, h.kk, h.head, h.block, h.address, h.phone, h.reg);

    // Default fee assignments
    db.prepare(`
      INSERT INTO household_fee_assignments (id, household_id, fee_type_id, is_exempt, start_date)
      VALUES (?, ?, 'fee-ipl', 0, '2026-01-01')
    `).run(`asg-${h.id}-ipl`, h.id);
    db.prepare(`
      INSERT INTO household_fee_assignments (id, household_id, fee_type_id, is_exempt, start_date)
      VALUES (?, ?, 'fee-social', 0, '2026-01-01')
    `).run(`asg-${h.id}-soc`, h.id);
  }

  // Residents
  const residents = [
    { id: 'res-01', hh: 'hh-01', nik: '3674031505750001', name: 'Ir. H. Budi Santoso', rel: 'Kepala Keluarga', gender: 'L', occ: 'Wiraswasta' },
    { id: 'res-02', hh: 'hh-01', nik: '3674035208780002', name: 'Hj. Ratna Juwita', rel: 'Istri', gender: 'P', occ: 'Guru SMA' },
    { id: 'res-03', hh: 'hh-01', nik: '3674031012050003', name: 'Fikri Santoso', rel: 'Anak', gender: 'L', occ: 'Mahasiswa' },

    { id: 'res-04', hh: 'hh-02', nik: '3674034803820001', name: 'Siti Rahmawati, S.E.', rel: 'Kepala Keluarga', gender: 'P', occ: 'Akuntan / Finance' },
    { id: 'res-05', hh: 'hh-02', nik: '3674031201080002', name: 'Nabila Putri', rel: 'Anak', gender: 'P', occ: 'Pelajar' },

    { id: 'res-06', hh: 'hh-03', nik: '3674032009850001', name: 'Hendra Wijaya', rel: 'Kepala Keluarga', gender: 'L', occ: 'Software Engineer' },
    { id: 'res-07', hh: 'hh-03', nik: '3674036104870002', name: 'Dewi Lestari', rel: 'Istri', gender: 'P', occ: 'Dokter Gigi' },
    { id: 'res-08', hh: 'hh-03', nik: '3674031808160003', name: 'Kenzo Wijaya', rel: 'Anak', gender: 'L', occ: 'Pelajar' },

    { id: 'res-09', hh: 'hh-04', nik: '3674031102800001', name: 'dr. Ahmad Fauzi, Sp.A', rel: 'Kepala Keluarga', gender: 'L', occ: 'Dokter Spesialis' },
    { id: 'res-10', hh: 'hh-05', nik: '3674032506890001', name: 'Agus Pratama', rel: 'Kepala Keluarga', gender: 'L', occ: 'Karyawan Swasta' },
    { id: 'res-11', hh: 'hh-06', nik: '3674036011580001', name: 'Hj. Maryam Kusuma', rel: 'Kepala Keluarga', gender: 'P', occ: 'Pensiunan PNS' },
    { id: 'res-12', hh: 'hh-07', nik: '3674031407920001', name: 'Dedi Kurniawan', rel: 'Kepala Keluarga', gender: 'L', occ: 'Arsitek' },
    { id: 'res-13', hh: 'hh-08', nik: '3674030510880001', name: 'Lie Fung / Kelvin', rel: 'Kepala Keluarga', gender: 'L', occ: 'Pengusaha Restoran' }
  ];
  for (const r of residents) {
    db.prepare(`
      INSERT INTO residents (id, household_id, nik, name, relation_to_head, gender, occupation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(r.id, r.hh, r.nik, r.name, r.rel, r.gender, r.occ);
  }

  // Users
  const users = [
    { id: 'usr-admin', email: 'admin@kaswarga.id', name: 'Bambang Soedjarwo', role: 'super_admin', phone: '0811-0000-001', hh: null },
    { id: 'usr-ketua', email: 'ketua.rt@kaswarga.id', name: 'Ir. H. Budi Santoso', role: 'ketua_rt', phone: '0811-9876-543', hh: 'hh-01' },
    { id: 'usr-bendahara', email: 'bendahara@kaswarga.id', name: 'Siti Rahmawati, S.E.', role: 'bendahara', phone: '0812-8877-665', hh: 'hh-02' },
    { id: 'usr-warga', email: 'warga@kaswarga.id', name: 'Hendra Wijaya', role: 'warga', phone: '0813-1122-334', hh: 'hh-03' }
  ];
  for (const u of users) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, phone, unit_id, household_id)
      VALUES (?, ?, 'demo_hashed_password', ?, ?, ?, ?, ?)
    `).run(u.id, u.email, u.name, u.role, u.phone, unitId, u.hh);
  }

  // Seed Invoices for October 2026 (current) and September 2026 (previous)
  const currentPeriod = '2026-10';
  const prevPeriod = '2026-09';

  // September Invoices: all generated
  households.forEach((h, index) => {
    const invId = `inv-${prevPeriod}-${h.id}-ipl`;
    const invNo = `INV/${prevPeriod.replace('-', '')}/${String(index + 1).padStart(4, '0')}`;
    db.prepare(`
      INSERT INTO invoices (id, unit_id, invoice_number, household_id, fee_type_id, period, amount, paid_amount, status, due_date)
      VALUES (?, ?, ?, ?, 'fee-ipl', ?, 150000, 150000, 'paid', '2026-09-10')
    `).run(invId, unitId, invNo, h.id, prevPeriod);
  });

  // October Invoices: Some paid, some unpaid, some partial
  households.forEach((h, index) => {
    const invId = `inv-${currentPeriod}-${h.id}-ipl`;
    const invNo = `INV/${currentPeriod.replace('-', '')}/${String(index + 1).padStart(4, '0')}`;
    
    let paidAmt = 0;
    let status = 'unpaid';
    if (index === 0 || index === 1) {
      paidAmt = 150000;
      status = 'paid';
    } else if (index === 2) {
      paidAmt = 100000;
      status = 'partially_paid';
    } else if (index >= 5) {
      status = 'overdue';
    }

    db.prepare(`
      INSERT INTO invoices (id, unit_id, invoice_number, household_id, fee_type_id, period, amount, paid_amount, status, due_date)
      VALUES (?, ?, ?, ?, 'fee-ipl', ?, 150000, ?, ?, '2026-10-10')
    `).run(invId, unitId, invNo, h.id, currentPeriod, paidAmt, status);
  });

  // Seed Payments for the paid October ones
  const pay1Id = 'pay-202610-001';
  db.prepare(`
    INSERT INTO payments (id, unit_id, payment_number, receipt_number, household_id, total_amount, payment_date, payment_method, cash_account_id, reference_no, created_by, status)
    VALUES (?, ?, 'PAY-202610-001', 'KW-202610-0001', 'hh-01', 150000, '2026-10-05', 'bank_transfer', 'acc-bca', 'TRF-BCA-981726', 'usr-bendahara', 'completed')
  `).run(pay1Id, unitId);
  db.prepare(`
    INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
    VALUES ('alloc-1', ?, 'inv-2026-10-hh-01-ipl', 150000)
  `).run(pay1Id);

  const pay2Id = 'pay-202610-002';
  db.prepare(`
    INSERT INTO payments (id, unit_id, payment_number, receipt_number, household_id, total_amount, payment_date, payment_method, cash_account_id, reference_no, created_by, status)
    VALUES (?, ?, 'PAY-202610-002', 'KW-202610-0002', 'hh-02', 150000, '2026-10-08', 'cash', 'acc-cash', '', 'usr-bendahara', 'completed')
  `).run(pay2Id, unitId);
  db.prepare(`
    INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
    VALUES ('alloc-2', ?, 'inv-2026-10-hh-02-ipl', 150000)
  `).run(pay2Id);

  const pay3Id = 'pay-202610-003';
  db.prepare(`
    INSERT INTO payments (id, unit_id, payment_number, receipt_number, household_id, total_amount, payment_date, payment_method, cash_account_id, reference_no, created_by, status)
    VALUES (?, ?, 'PAY-202610-003', 'KW-202610-0003', 'hh-03', 100000, '2026-10-09', 'bank_transfer', 'acc-bca', 'TRF-BCA-449102', 'usr-bendahara', 'completed')
  `).run(pay3Id, unitId);
  db.prepare(`
    INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
    VALUES ('alloc-3', ?, 'inv-2026-10-hh-03-ipl', 100000)
  `).run(pay3Id);

  // Financial Transactions (income movements for the payments)
  db.prepare(`
    INSERT INTO financial_transactions (id, unit_id, transaction_number, transaction_date, type, category_id, cash_account_id, amount, description, payer_payee, payment_method, status, requested_by, approved_by, approved_at, payment_id)
    VALUES 
    ('tx-inc-01', ?, 'TRX/202610/001', '2026-10-05', 'income', 'cat-inc-ipl', 'acc-bca', 150000, 'Iuran IPL Oktober 2026 - Ir. H. Budi Santoso', 'Ir. H. Budi Santoso (Blok A1/12)', 'bank_transfer', 'approved', 'usr-bendahara', 'usr-ketua', '2026-10-05 10:00:00', 'pay-202610-001'),
    ('tx-inc-02', ?, 'TRX/202610/002', '2026-10-08', 'income', 'cat-inc-ipl', 'acc-cash', 150000, 'Iuran IPL Oktober 2026 - Siti Rahmawati, S.E.', 'Siti Rahmawati (Blok A1/14)', 'cash', 'approved', 'usr-bendahara', 'usr-ketua', '2026-10-08 14:30:00', 'pay-202610-002'),
    ('tx-inc-03', ?, 'TRX/202610/003', '2026-10-09', 'income', 'cat-inc-ipl', 'acc-bca', 100000, 'Cicilan Iuran IPL Oktober 2026 - Hendra Wijaya', 'Hendra Wijaya (Blok B2/08)', 'bank_transfer', 'approved', 'usr-bendahara', 'usr-ketua', '2026-10-09 09:15:00', 'pay-202610-003'),
    ('tx-inc-04', ?, 'TRX/202610/004', '2026-10-12', 'income', 'cat-inc-rent', 'acc-cash', 500000, 'Sewa Balai Warga untuk Acara Syukuran Khitanan', 'Keluarga Bpk. Santoso', 'cash', 'approved', 'usr-bendahara', 'usr-ketua', '2026-10-12 16:00:00', NULL),
    ('tx-inc-05', ?, 'TRX/202610/005', '2026-10-15', 'income', 'cat-inc-donation', 'acc-bca', 1000000, 'Donasi Warga untuk Perbaikan Kanopi Pos Keamanan', 'Hamba Allah', 'bank_transfer', 'approved', 'usr-bendahara', 'usr-ketua', '2026-10-15 11:20:00', NULL)
  `).run(unitId, unitId, unitId, unitId, unitId);

  // Financial Transactions (expenses)
  db.prepare(`
    INSERT INTO financial_transactions (id, unit_id, transaction_number, transaction_date, type, category_id, cash_account_id, amount, description, payer_payee, payment_method, status, requested_by, approved_by, approved_at, vendor_id)
    VALUES
    ('tx-exp-01', ?, 'TRX/202610/101', '2026-10-01', 'expense', 'cat-exp-security', 'acc-bca', 3500000, 'Honor Jaga 3 Petugas Satpam Periode September 2026', 'Paguyuban Garda Swakarsa RT', 'bank_transfer', 'paid', 'usr-bendahara', 'usr-ketua', '2026-10-01 08:30:00', 'ven-02'),
    ('tx-exp-02', ?, 'TRX/202610/102', '2026-10-04', 'expense', 'cat-exp-waste', 'acc-bca', 1800000, 'Biaya Truk Pengangkutan Sampah Kompleks (Vendor Bulanan)', 'PT Harapan Bersih Lestari', 'bank_transfer', 'paid', 'usr-bendahara', 'usr-ketua', '2026-10-04 13:00:00', 'ven-01'),
    ('tx-exp-03', ?, 'TRX/202610/103', '2026-10-10', 'expense', 'cat-exp-facility', 'acc-cash', 650000, 'Penggantian 5 Lampu LED Penerangan Jalan Blok B dan Saklar Otomatis', 'CV Terang Abadi Elektrik', 'cash', 'paid', 'usr-bendahara', 'usr-ketua', '2026-10-10 17:15:00', 'ven-03'),
    ('tx-exp-04', ?, 'TRX/202610/104', '2026-10-18', 'expense', 'cat-exp-admin', 'acc-cash', 120000, 'Pembelian Kertas HVS A4, Tinta Printer, dan Map Arsip RT', 'Toko ATK Pondok Jagung', 'cash', 'paid', 'usr-bendahara', 'usr-ketua', '2026-10-18 10:00:00', NULL),
    ('tx-exp-05', ?, 'TRX/202610/105', '2026-10-22', 'expense', 'cat-exp-facility', 'acc-bca', 850000, 'Pengadaan Semen & Pasir Tambal Jalan Berlubang Depan Portal', 'Toko Material Berkah Mandiri', 'bank_transfer', 'submitted', 'usr-bendahara', NULL, NULL, 'ven-04')
  `).run(unitId, unitId, unitId, unitId, unitId);

  // Recalculate and update current balances accurately
  updateAccountBalances(unitId);

  // Budgets for 2026
  const budgets = [
    { cat: 'cat-exp-security', amount: 42000000 },
    { cat: 'cat-exp-waste', amount: 22000000 },
    { cat: 'cat-exp-facility', amount: 12000000 },
    { cat: 'cat-exp-social', amount: 6000000 },
    { cat: 'cat-exp-event', amount: 15000000 },
    { cat: 'cat-exp-admin', amount: 3000000 }
  ];
  for (const b of budgets) {
    db.prepare(`
      INSERT INTO budgets (id, unit_id, category_id, year, month, budgeted_amount, notes)
      VALUES (?, ?, ?, 2026, NULL, ?, 'Anggaran Tahunan RAPB-RT 2026')
    `).run(`bdg-2026-${b.cat}`, unitId, b.cat, b.amount);
  }

  // Audit Logs
  db.prepare(`
    INSERT INTO audit_logs (id, unit_id, user_id, user_name, action, entity_type, entity_id, new_values, ip_address)
    VALUES 
    ('aud-01', ?, 'usr-admin', 'Bambang Soedjarwo', 'INITIALIZE_SYSTEM', 'system', 'root', '{"status":"initialized"}', '127.0.0.1'),
    ('aud-02', ?, 'usr-bendahara', 'Siti Rahmawati, S.E.', 'GENERATE_INVOICES', 'invoices', 'period-2026-10', '{"period":"2026-10","count":8}', '192.168.1.10'),
    ('aud-03', ?, 'usr-bendahara', 'Siti Rahmawati, S.E.', 'RECORD_PAYMENT', 'payments', 'pay-202610-001', '{"amount":150000,"receipt":"KW-202610-0001"}', '192.168.1.10'),
    ('aud-04', ?, 'usr-ketua', 'Ir. H. Budi Santoso', 'APPROVE_EXPENSE', 'financial_transactions', 'tx-exp-01', '{"status":"paid","amount":3500000}', '192.168.1.15')
  `).run(unitId, unitId, unitId, unitId);

  // Notifications
  db.prepare(`
    INSERT INTO notifications (id, unit_id, user_id, title, message, type, link)
    VALUES
    ('notif-01', ?, 'usr-ketua', 'Pengajuan Pengeluaran Memerlukan Persetujuan', 'Pengeluaran Rp 850.000 untuk Pembelian Material Perbaikan Jalan menunggu konfirmasi Anda.', 'warning', '/approvals'),
    ('notif-02', ?, 'usr-bendahara', '3 Warga Belum Membayar Tagihan IPL', 'Tagihan IPL Oktober telah melewati tanggal jatuh tempo (10 Oktober).', 'urgent', '/invoices'),
    ('notif-03', ?, NULL, 'Pengumuman Kerja Bakti Bersama', 'Kerja bakti pembersihan saluran lingkungan dijadwalkan Minggu pagi pukul 07.00 WIB.', 'info', '/dashboard')
  `).run(unitId, unitId, unitId);
}

export function updateAccountBalances(unitId: string) {
  const accounts = db.prepare('SELECT id, initial_balance FROM cash_accounts WHERE unit_id = ?').all(unitId) as { id: string, initial_balance: number }[];

  for (const acc of accounts) {
    // Posted Incomes
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_transactions 
      WHERE unit_id = ? AND cash_account_id = ? AND type = 'income' AND status IN ('approved', 'paid')
    `).get(unitId, acc.id) as { total: number };

    // Posted Expenses
    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_transactions 
      WHERE unit_id = ? AND cash_account_id = ? AND type = 'expense' AND status = 'paid'
    `).get(unitId, acc.id) as { total: number };

    // Outgoing Transfers
    const transferOutRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_transactions 
      WHERE unit_id = ? AND cash_account_id = ? AND type = 'transfer' AND status = 'paid'
    `).get(unitId, acc.id) as { total: number };

    // Incoming Transfers
    const transferInRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_transactions 
      WHERE unit_id = ? AND to_cash_account_id = ? AND type = 'transfer' AND status = 'paid'
    `).get(unitId, acc.id) as { total: number };

    const newBalance = acc.initial_balance + incomeRow.total - expenseRow.total - transferOutRow.total + transferInRow.total;

    db.prepare('UPDATE cash_accounts SET current_balance = ? WHERE id = ?').run(newBalance, acc.id);
  }
}
