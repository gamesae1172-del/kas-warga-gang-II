import React, { useState, useEffect } from 'react';
import { Eye, ShieldCheck, Receipt, Download, Printer, CheckCircle2, AlertCircle, Building2, User } from 'lucide-react';
import { Invoice, Payment, OrganizationalUnit } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../Common/Badge';
import { ReceiptModal } from '../Common/ReceiptModal';

export const ResidentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'transparency' | 'my_billing'>('transparency');
  const [transparencyData, setTransparencyData] = useState<{
    unit: OrganizationalUnit;
    period: string;
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    netSurplus: number;
    categoryBreakdown: { name: string; total: number }[];
    publishedAt: string;
  } | null>(null);

  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [myPayments, setMyPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [user?.household_id]);

  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const trans = await api.getTransparencyReport('2026-10');
      setTransparencyData(trans);

      // If user has household_id, load their private invoices and receipts
      const targetHouseholdId = user?.household_id || 'hh-03'; // Hendra Wijaya Blok B2/08
      const [invData, payData] = await Promise.all([
        api.getInvoices({ household_id: targetHouseholdId }),
        api.getPayments(targetHouseholdId)
      ]);
      setMyInvoices(invData);
      setMyPayments(payData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      const detail = await api.getPaymentDetail(paymentId);
      setActiveReceipt(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const myOutstandingTotal = myInvoices.reduce((sum, inv) => {
    return inv.status !== 'paid' && inv.status !== 'canceled'
      ? sum + (inv.amount - inv.paid_amount)
      : sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Transparansi Terbuka Kas RT
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Portal Transparansi Keuangan Komunitas & Warga
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Mewujudkan keterbukaan publik pengelolaan kas lingkungan RT 004 / RW 012. Setiap rupiah iuran warga dicatat, diaudit, dan dilaporkan secara transparan.
          </p>
        </div>
      </div>

      {/* Navigation Segmented Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('transparency')}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'transparency'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transparansi Kas Lingkungan (Publik)
        </button>
        <button
          onClick={() => setActiveTab('my_billing')}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'my_billing'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tagihan & Kwitansi Rumah Tangga Saya
        </button>
      </div>

      {/* Tab 1: Transparency View */}
      {activeTab === 'transparency' && transparencyData && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Saldo Kas RT Saat Ini</span>
              <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1">
                {formatRupiah(transparencyData.totalBalance)}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Tersimpan aman di kas RT</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Pemasukan Bulan Ini</span>
              <div className="text-2xl font-bold font-mono-numbers text-emerald-700 mt-1">
                {formatRupiah(transparencyData.totalIncome)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Iuran warga & penerimaan sah</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Pengeluaran Bulan Ini</span>
              <div className="text-2xl font-bold font-mono-numbers text-rose-700 mt-1">
                {formatRupiah(transparencyData.totalExpense)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Belanja operasional terverifikasi</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Surplus Arus Kas</span>
              <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1">
                {formatRupiah(transparencyData.netSurplus)}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Penerimaan melebihi beban</span>
            </div>
          </div>

          {/* Category Expenditure Breakdown for Citizen Inspection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Alokasi Belanja Komunitas ({transparencyData.period})
                </h3>
                <p className="text-xs text-slate-500">
                  Data publik teragregasi untuk warga (tanpa mengekspos data pribadi/privasi antar warga)
                </p>
              </div>
              <span className="text-[11px] text-slate-400">
                Data diperbarui realtime
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {transparencyData.categoryBreakdown.map((cat, idx) => {
                const pct = transparencyData.totalExpense > 0
                  ? Math.round((cat.total / transparencyData.totalExpense) * 100)
                  : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <div className="flex items-center gap-2 font-mono-numbers">
                        <span className="font-bold text-slate-900">{formatRupiah(cat.total)}</span>
                        <span className="text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Household Billing & Receipts (Privacy Protected) */}
      {activeTab === 'my_billing' && (
        <div className="space-y-6">
          {/* Household Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Akun Terverifikasi Warga:</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Hendra Wijaya (Blok B2 No. 08)
              </h3>
              <p className="text-xs text-slate-500">
                Jl. Flamboyan 2 No. 08, RT 004/RW 012 Graha Asri
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Sisa Tagihan Tertunggak:</span>
              <span className={`text-xl font-bold font-mono-numbers ${myOutstandingTotal > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {myOutstandingTotal > 0 ? formatRupiah(myOutstandingTotal) : 'Lunas (Rp 0)'}
              </span>
            </div>
          </div>

          {/* Invoices List for My Household */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Tagihan Iuran Rumah Tangga
              </h3>
              <p className="text-xs text-slate-500">Hanya Anda dan Pengurus RT yang dapat melihat riwayat penagihan ini</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">No. Tagihan</th>
                    <th className="py-2.5 px-4 font-semibold">Jenis Iuran</th>
                    <th className="py-2.5 px-4 font-semibold">Periode</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Nilai Tagihan</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Sudah Dibayar</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Sisa Tagihan</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{inv.invoice_number}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{inv.fee_name}</td>
                      <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{inv.period}</td>
                      <td className="py-2.5 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                        {formatRupiah(inv.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-numbers text-emerald-700">
                        {formatRupiah(inv.paid_amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-numbers font-bold">
                        {inv.amount - inv.paid_amount > 0 ? (
                          <span className="text-rose-600">{formatRupiah(inv.amount - inv.paid_amount)}</span>
                        ) : (
                          <span className="text-emerald-700">Rp 0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Downloadable Receipts List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Kwitansi Pembayaran Resmi & Sah
              </h3>
              <p className="text-xs text-slate-500">Unduh atau cetak bukti pembayaran sah dari Bendahara RT</p>
            </div>

            <div className="divide-y divide-slate-100">
              {myPayments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada riwayat pembayaran tercatat untuk KK ini.
                </div>
              ) : (
                myPayments.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-bold text-xs text-slate-900">
                          {p.receipt_number}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 font-semibold">
                          Sah / Terverifikasi
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Dibayarkan pada {formatDateIndo(p.payment_date)} melalui {p.payment_method}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono-numbers font-bold text-sm text-emerald-800">
                        {formatRupiah(p.total_amount)}
                      </span>
                      <button
                        onClick={() => handlePrintReceipt(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Cetak Kwitansi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kwitansi Modal */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        payment={activeReceipt}
      />
    </div>
  );
};
