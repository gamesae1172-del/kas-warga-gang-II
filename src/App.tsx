import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';

import { DashboardPage } from './components/Pages/DashboardPage';
import { HouseholdsPage } from './components/Pages/HouseholdsPage';
import { ResidentsPage } from './components/Pages/ResidentsPage';
import { FeeTypesPage } from './components/Pages/FeeTypesPage';
import { InvoicesPage } from './components/Pages/InvoicesPage';
import { PaymentsPage } from './components/Pages/PaymentsPage';
import { IncomePage } from './components/Pages/IncomePage';
import { ExpensesPage } from './components/Pages/ExpensesPage';
import { ApprovalsPage } from './components/Pages/ApprovalsPage';
import { CashAccountsPage } from './components/Pages/CashAccountsPage';
import { BudgetsPage } from './components/Pages/BudgetsPage';
import { VendorsPage } from './components/Pages/VendorsPage';
import { ReportsPage } from './components/Pages/ReportsPage';
import { ResidentPortalPage } from './components/Pages/ResidentPortalPage';
import { UsersPage } from './components/Pages/UsersPage';
import { AuditLogsPage } from './components/Pages/AuditLogsPage';
import { SettingsPage } from './components/Pages/SettingsPage';
import { AutomatedTestsPage } from './components/Pages/AutomatedTestsPage';

import { api } from './services/api';

function MainApp() {
  const { user, can } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [selectedHouseholdForPay, setSelectedHouseholdForPay] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check pending approvals count for badge
    api.getTransactions({ status: 'submitted' })
      .then(txs => setPendingApprovalsCount(txs.length))
      .catch(() => {});
  }, [currentTab]);

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard Keuangan',
    households: 'Kartu Keluarga (KK)',
    residents: 'Data Penduduk Warga',
    fee_types: 'Master Tarif Iuran',
    invoices: 'Tagihan Iuran Warga',
    payments: 'Loket Pembayaran Kas',
    income: 'Pemasukan Kas',
    expenses: 'Pengeluaran Kas',
    approvals: 'Persetujuan Belanja Ketua RT',
    accounts: 'Buku Kas & Rekening Bank',
    budgets: 'Kategori & Anggaran Belanja',
    vendors: 'Mitra Kerja & Multi-Vendor',
    reports: 'Laporan Keuangan Resmi',
    portal: 'Portal Transparansi Warga',
    users: 'Hak Akses Pengguna',
    audit: 'Jejak Audit Aktivitas',
    settings: 'Pengaturan RT/RW',
    tests: 'Uji Otomatis Sistem'
  };

  const handlePayInvoice = (householdId: string) => {
    setSelectedHouseholdForPay(householdId);
    setCurrentTab('payments');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Content Area (offset by 256px sidebar on desktop) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentPageTitle={pageTitles[currentTab] || 'Kas Warga'}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'households' && <HouseholdsPage />}
          {currentTab === 'residents' && <ResidentsPage />}
          {currentTab === 'fee_types' && <FeeTypesPage />}
          {currentTab === 'invoices' && <InvoicesPage onPayInvoice={handlePayInvoice} />}
          {currentTab === 'payments' && <PaymentsPage initialHouseholdId={selectedHouseholdForPay} />}
          {currentTab === 'income' && <IncomePage />}
          {currentTab === 'expenses' && <ExpensesPage />}
          {currentTab === 'approvals' && <ApprovalsPage />}
          {currentTab === 'accounts' && <CashAccountsPage />}
          {currentTab === 'budgets' && <BudgetsPage />}
          {currentTab === 'vendors' && <VendorsPage />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'portal' && <ResidentPortalPage />}
          {currentTab === 'users' && <UsersPage />}
          {currentTab === 'audit' && <AuditLogsPage />}
          {currentTab === 'settings' && <SettingsPage />}
          {currentTab === 'tests' && <AutomatedTestsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
