import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileCheck2,
  Receipt,
  CreditCard,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { DashboardStats } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { StatusBadge } from '../Common/Badge';
import { TransactionReceiptModal } from '../Common/TransactionReceiptModal';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('2026-10');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardStats(period);
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxCategoryAmount = Math.max(...stats.categoryExpenses.map(c => c.amount), 1);
  const maxFlow = Math.max(...stats.monthlyFlow.flatMap(m => [m.income, m.expense]), 1);

  return (
    <div className="space-y-6">
      {/* Page Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Ringkasan Keuangan Komunitas
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Perumahan Taman Graha Asri</span>
            <span aria-hidden="true">·</span>
            <span>RT 004 / RW 012</span>
            <span aria-hidden="true">·</span>
            <span>Zona Waktu Asia/Jakarta (WIB)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-xs text-xs">
            <span className="text-slate-500 px-2 font-medium">Periode:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 pr-3 py-1 outline-hidden cursor-pointer"
            >
              <option value="2026-10">Oktober 2026 (Bulan Berjalan)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
            </select>
          </div>

          <button
            onClick={() => onNavigate('payments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span className="whitespace-nowrap">Buka Loket Iuran</span>
          </button>
        </div>
      </div>

      {/* Pending Approvals Alert Banner */}
      {stats.pendingApprovals.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Persetujuan Pengeluaran Tertunda ({stats.pendingApprovals.length} Transaksi)
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Pengeluaran di atas batas Rp 500.000 memerlukan persetujuan Ketua RT sebelum saldo kas terpotong.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Review Sekarang <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Balance */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Saldo Kas RT</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-numbers text-slate-900">
            {formatRupiah(stats.totalCashBalance)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Tersebar di {stats.accounts.length} rekening</span>
            <span className="font-semibold text-emerald-600">Konsolidasi</span>
          </div>
        </div>

        {/* Current Period Income */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pemasukan ({period})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-numbers text-emerald-700">
            {formatRupiah(stats.incomeCurrentPeriod)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Iuran warga, donasi & sewa fasum
          </div>
        </div>

        {/* Current Period Expenses */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pengeluaran Disetujui ({period})</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-numbers text-rose-700">
            {formatRupiah(stats.expenseCurrentPeriod)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Arus Kas Bersih:</span>
            <span className={`font-mono-numbers font-semibold ${stats.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatRupiah(stats.netCashFlow)}
            </span>
          </div>
        </div>

        {/* Outstanding Arrears & Collection */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tunggakan Iuran Warga</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-numbers text-amber-700">
            {formatRupiah(stats.outstandingFees)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{stats.unpaidHouseholdsCount} KK belum lunas</span>
            <span className="font-mono-numbers font-semibold text-slate-700">
              Kolektibilitas {stats.collectionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Rekening & Buku Kas Komunitas
          </h3>
          <button
            onClick={() => onNavigate('accounts')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Mutasi & Transfer Antar Kas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.accounts.map(acc => (
            <div key={acc.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 truncate">{acc.name}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">
                  {acc.account_type}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold font-mono-numbers text-slate-900">
                {formatRupiah(acc.current_balance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {acc.bank_name ? `${acc.bank_name} No. ${acc.account_number}` : 'Dipegang oleh Bendahara'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Charts Grid: Cashflow History & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 6-Month Cash Flow Histogram */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tren Pemasukan vs Pengeluaran (6 Bulan)</h3>
              <p className="text-xs text-slate-500">Perbandingan pergerakan kas aktual</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                <span className="text-slate-600">Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-rose-400 inline-block" />
                <span className="text-slate-600">Pengeluaran</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {stats.monthlyFlow.map((flow) => {
              const incPct = Math.round((flow.income / maxFlow) * 100);
              const expPct = Math.round((flow.expense / maxFlow) * 100);
              return (
                <div key={flow.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 w-12">{flow.label}</span>
                    <div className="flex items-center gap-4 font-mono-numbers text-[11px]">
                      <span className="text-emerald-700">{formatRupiah(flow.income)}</span>
                      <span className="text-rose-600">{formatRupiah(flow.expense)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${incPct}%` }}
                    />
                    <div
                      className="bg-rose-400 h-full rounded-full transition-all"
                      style={{ width: `${expPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Expense Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribusi Pengeluaran ({period})</h3>
              <p className="text-xs text-slate-500">Realisasi belanja operasional</p>
            </div>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Cek RAPB
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {stats.categoryExpenses.map((cat, idx) => {
              const pct = maxCategoryAmount > 0 ? Math.round((cat.amount / maxCategoryAmount) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[190px]">{cat.name}</span>
                    <span className="font-mono-numbers font-semibold text-slate-900">{formatRupiah(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-700 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent 5 Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mutasi Kas Terkini</h3>
            <p className="text-xs text-slate-500">Transaksi posted dan terverifikasi</p>
          </div>
          <button
            onClick={() => onNavigate('income')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Lihat Semua Transaksi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">No. Transaksi</th>
                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                <th className="py-2.5 px-4 font-semibold">Kategori / Akun</th>
                <th className="py-2.5 px-4 font-semibold">Keterangan</th>
                <th className="py-2.5 px-4 font-semibold text-right">Nominal</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold text-center">Kwitansi & Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{tx.transaction_number}</td>
                  <td className="py-2.5 px-4 text-slate-600">{formatDateIndo(tx.transaction_date)}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-900">{tx.category_name || 'Transfer Kas'}</div>
                    <div className="text-[11px] text-slate-500">{tx.account_name}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate">{tx.description}</td>
                  <td className={`py-2.5 px-4 text-right font-mono-numbers font-semibold ${
                    tx.type === 'income' ? 'text-emerald-700' : tx.type === 'expense' ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={async () => {
                        try {
                          const detail = await api.getTransactionDetail(tx.id);
                          setSelectedTxForReceipt(detail);
                        } catch (err) {
                          console.error('Failed to load transaction receipt:', err);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded border border-slate-200 hover:border-emerald-200 transition-colors"
                      title="Lihat Kwitansi Sah & Lampiran Foto"
                    >
                      <Receipt className="w-3 h-3 text-emerald-600" />
                      <span>Kwitansi</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kwitansi Modal */}
      <TransactionReceiptModal
        isOpen={!!selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
        transaction={selectedTxForReceipt}
      />
    </div>
  );
};
