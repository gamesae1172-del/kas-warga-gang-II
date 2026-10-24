import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Filter, CreditCard, CheckCircle2, Download, AlertCircle } from 'lucide-react';
import { Invoice } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo, exportToCSV } from '../../utils/format';
import { StatusBadge } from '../Common/Badge';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

interface InvoicesPageProps {
  onPayInvoice?: (householdId: string) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onPayInvoice }) => {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('2026-10');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Batch Generator modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [targetPeriod, setTargetPeriod] = useState('2026-11');
  const [batchResult, setBatchResult] = useState<{ message: string; createdCount: number; skippedCount: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [period, statusFilter]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInvoices({
        period: period !== 'all' ? period : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    (inv.head_name && inv.head_name.toLowerCase().includes(search.toLowerCase())) ||
    (inv.block_number && inv.block_number.toLowerCase().includes(search.toLowerCase())) ||
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerateBatch = async () => {
    setIsGenerating(true);
    setBatchResult(null);
    try {
      const result = await api.generateRecurringInvoices(targetPeriod);
      setBatchResult(result);
      if (targetPeriod === period) {
        loadInvoices();
      }
    } catch (err: any) {
      setBatchResult({ message: `Error: ${err.message}`, createdCount: 0, skippedCount: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No. Tagihan', 'Kepala Keluarga', 'Blok Rumah', 'Jenis Iuran', 'Periode', 'Total Tagihan', 'Terbayar', 'Sisa Tagihan', 'Jatuh Tempo', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      inv.head_name || '-',
      inv.block_number || '-',
      inv.fee_name || '-',
      inv.period,
      inv.amount,
      inv.paid_amount,
      inv.amount - inv.paid_amount,
      inv.due_date,
      inv.status
    ]);
    exportToCSV(`rekap_tagihan_${period}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const totalDue = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = filteredInvoices.reduce((s, i) => s + i.paid_amount, 0);
  const totalRemaining = totalDue - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Daftar Tagihan Iuran Warga
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penetapan, monitoring status pelunasan, dan generator tagihan otomatis per KK
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Tagihan
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                setIsLoginModalOpen(true);
                return;
              }
              setBatchResult(null);
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Generate Tagihan Bulanan (Batch)
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Total Nilai Tagihan Terbit</span>
          <p className="text-xl font-bold font-mono-numbers text-slate-900 mt-1">
            {formatRupiah(totalDue)}
          </p>
          <span className="text-[11px] text-slate-400 font-mono-numbers">{filteredInvoices.length} Faktur</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Iuran Berhasil Diterima</span>
          <p className="text-xl font-bold font-mono-numbers text-emerald-700 mt-1">
            {formatRupiah(totalPaid)}
          </p>
          <span className="text-[11px] text-emerald-600">
            {totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}% Terbayar
          </span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Sisa Piutang / Belum Lunas</span>
          <p className="text-xl font-bold font-mono-numbers text-rose-700 mt-1">
            {formatRupiah(totalRemaining)}
          </p>
          <span className="text-[11px] text-rose-600">
            {filteredInvoices.filter(i => i.status !== 'paid' && i.status !== 'canceled').length} Faktur menunggak
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari warga, nomor blok, faktur..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Periode:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="all">Semua Periode</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="partially_paid">Sebagian</option>
              <option value="overdue">Jatuh Tempo</option>
              <option value="paid">Lunas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">No. Tagihan</th>
                <th className="py-3 px-4 font-semibold">Rumah Tangga</th>
                <th className="py-3 px-4 font-semibold">Jenis Iuran</th>
                <th className="py-3 px-4 font-semibold">Periode</th>
                <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                <th className="py-3 px-4 font-semibold text-right">Terbayar</th>
                <th className="py-3 px-4 font-semibold text-right">Sisa Tagihan</th>
                <th className="py-3 px-4 font-semibold">Jatuh Tempo</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat daftar tagihan...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada tagihan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const remaining = inv.amount - inv.paid_amount;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono-numbers text-slate-600">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.head_name}</div>
                        <div className="text-[11px] text-slate-500">{inv.block_number}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{inv.fee_name}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono-numbers">{inv.period}</td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                        {formatRupiah(inv.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-emerald-700 font-medium">
                        {formatRupiah(inv.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold">
                        {remaining > 0 ? (
                          <span className="text-rose-600">{formatRupiah(remaining)}</span>
                        ) : (
                          <span className="text-emerald-700">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDateIndo(inv.due_date)}</td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {remaining > 0 && onPayInvoice ? (
                          <button
                            onClick={() => onPayInvoice(inv.household_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                          >
                            <CreditCard className="w-3 h-3" /> Bayar
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Generator Modal (Idempotent Demonstration) */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Proses Batch Tagihan Berkala (Idempoten)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Fitur ini secara otomatis menerbitkan tagihan Iuran Bulanan (IPL & Dana Sosial) untuk seluruh rumah tangga aktif yang terdaftar di RT 004.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block font-semibold text-slate-700 mb-1">Jaminan Keamanan & Idempotensi:</span>
            <p className="text-slate-600 text-[11px]">
              Sistem dilindungi oleh constraint database <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">UNIQUE(household_id, fee_type_id, period)</code>. Jika proses ini dijalankan ulang untuk periode yang sama, sistem <strong>tidak akan pernah menduplikasi tagihan</strong> warga.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Periode Tagihan</label>
            <input
              type="month"
              value={targetPeriod}
              onChange={(e) => setTargetPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers bg-white"
            />
          </div>

          {batchResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hasil Batch Generator:
              </div>
              <p className="text-[11px]">{batchResult.message}</p>
              <div className="flex items-center gap-4 text-[11px] font-mono-numbers pt-1">
                <span>Tagihan Baru Dibuat: <strong>{batchResult.createdCount}</strong></span>
                <span>Tagihan Sudah Ada (Dilewati): <strong>{batchResult.skippedCount}</strong></span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateBatch}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isGenerating ? 'Memproses...' : 'Jalankan Batch Sekarang'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
