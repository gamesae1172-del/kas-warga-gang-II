import React from 'react';
import {
  LayoutDashboard,
  Users,
  Home,
  Receipt,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  CheckSquare,
  Wallet,
  PieChart,
  FileText,
  Eye,
  UserCheck,
  ShieldAlert,
  Settings,
  Truck,
  Sliders,
  PlayCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  pendingApprovalsCount = 0
}) => {
  const { user, can } = useAuth();

  const navSections = [
    {
      title: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
        { id: 'portal', label: 'Portal Transparansi', icon: Eye, show: true },
        { id: 'tests', label: 'Uji Otomatis (15 Test)', icon: PlayCircle, show: true }
      ]
    },
    {
      title: 'KAS & TRANSAKSI',
      items: [
        { id: 'payments', label: 'Loket Pembayaran', icon: CreditCard, show: true },
        { id: 'invoices', label: 'Tagihan Iuran', icon: Receipt, show: true },
        { id: 'income', label: 'Pemasukan Kas', icon: ArrowDownLeft, show: true },
        { id: 'expenses', label: 'Pengeluaran Kas', icon: ArrowUpRight, show: true },
        {
          id: 'approvals',
          label: 'Persetujuan Belanja',
          icon: CheckSquare,
          show: true,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
        },
        { id: 'accounts', label: 'Buku Kas & Bank', icon: Wallet, show: true },
        { id: 'budgets', label: 'Kategori & Anggaran', icon: PieChart, show: true }
      ]
    },
    {
      title: 'KEPENDUDUKAN & MITRA',
      items: [
        { id: 'households', label: 'Kartu Keluarga (KK)', icon: Home, show: true },
        { id: 'residents', label: 'Data Penduduk Warga', icon: Users, show: true },
        { id: 'fee_types', label: 'Master Tarif Iuran', icon: Sliders, show: true },
        { id: 'vendors', label: 'Mitra & Vendor RT', icon: Truck, show: true }
      ]
    },
    {
      title: 'LAPORAN & SISTEM',
      items: [
        { id: 'reports', label: 'Laporan Keuangan', icon: FileText, show: true },
        { id: 'users', label: 'Hak Akses Pengguna', icon: UserCheck, show: true },
        { id: 'audit', label: 'Jejak Audit Sistem', icon: ShieldAlert, show: true },
        { id: 'settings', label: 'Pengaturan RT/RW', icon: Settings, show: true }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden no-print"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 no-print ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/images/kas_warga_logo_1792832012131.jpg"
              alt="KAS WARGA"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
              onError={(e) => {
                // Fallback SVG if image not ready
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                KAS WARGA
              </h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                RT 004 / RW 012 Graha Asri
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((sec, idx) => {
            const visibleItems = sec.items.filter(item => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {sec.title}
                </div>
                <div className="space-y-0.5 mt-1">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 font-mono-numbers">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 shrink-0 text-slate-400 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Kas Komunitas RT/RW</span>
            <span className="text-emerald-400 font-mono-numbers">v1.0-prod</span>
          </div>
        </div>
      </aside>
    </>
  );
};
