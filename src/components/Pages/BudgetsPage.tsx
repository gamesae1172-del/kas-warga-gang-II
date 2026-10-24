import React, { useState, useEffect } from 'react';
import { PieChart, AlertTriangle, Edit2, CheckCircle2, TrendingUp } from 'lucide-react';
import { Budget } from '../../types';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/format';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const BudgetsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Edit budget modal
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadBudgets();
  }, [selectedYear]);

  const loadBudgets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBudgets(selectedYear);
      setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (b: Budget) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditBudget(b);
    setBudgetAmount(b.budgeted_amount || 0);
    setNotes(b.notes || '');
    setErrorMsg('');
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBudget) return;
    try {
      await api.saveBudget({
        category_id: editBudget.category_id,
        year: selectedYear,
        budgeted_amount: Number(budgetAmount),
        notes
      });
      setEditBudget(null);
      loadBudgets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan anggaran');
    }
  };

  const totalBudgeted = budgets.reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.actual_spent || 0), 0);
  const remainingBudget = totalBudgeted - totalSpent;
  const overallUtilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rencana Anggaran Pendapatan & Belanja RT (RAPB)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring batas pagu anggaran, realisasi serapan belanja, dan evaluasi defisit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
          >
            <option value={2026}>Tahun Anggaran 2026</option>
            <option value={2025}>Tahun Anggaran 2025</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Total Plafon Anggaran Belanja (RAPB)</span>
          <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1">
            {formatRupiah(totalBudgeted)}
          </div>
          <span className="text-[11px] text-slate-400">Telah disetujui musyawarah warga</span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Realisasi Belanja Berjalan</span>
          <div className="text-2xl font-bold font-mono-numbers text-rose-700 mt-1">
            {formatRupiah(totalSpent)}
          </div>
          <span className="text-[11px] text-slate-500">
            Serapan: <strong>{overallUtilization}%</strong> dari pagu tahunan
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-500">Sisa Plafon Anggaran Tersedia</span>
          <div className={`text-2xl font-bold font-mono-numbers mt-1 ${remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatRupiah(remainingBudget)}
          </div>
          <span className="text-[11px] text-slate-400">
            {remainingBudget >= 0 ? 'Kondisi fiskal surplus/aman' : 'Peringatan defisit anggaran!'}
          </span>
        </div>
      </div>

      {/* Budget Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Realisasi Anggaran per Kategori Belanja Operasional
          </h3>
          <p className="text-xs text-slate-500">Perbandingan batas pagu anggaran terhadap transaksi belanja yang sah</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Kode</th>
                <th className="py-3 px-4 font-semibold">Kategori Pengeluaran</th>
                <th className="py-3 px-4 font-semibold text-right">Plafon Anggaran (RAPB)</th>
                <th className="py-3 px-4 font-semibold text-right">Realisasi Belanja</th>
                <th className="py-3 px-4 font-semibold text-right">Sisa Anggaran</th>
                <th className="py-3 px-4 font-semibold">Serapan (%)</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data anggaran...
                  </td>
                </tr>
              ) : (
                budgets.map((b) => {
                  const budgeted = b.budgeted_amount || 0;
                  const spent = b.actual_spent || 0;
                  const remaining = budgeted - spent;
                  const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
                  const isOverBudget = spent > budgeted && budgeted > 0;

                  return (
                    <tr key={b.category_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 font-semibold">{b.category_code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.category_name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{b.notes || 'RAPB disetujui'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                        {formatRupiah(budgeted)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-rose-700">
                        {formatRupiah(spent)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold">
                        {remaining >= 0 ? (
                          <span className="text-emerald-700">{formatRupiah(remaining)}</span>
                        ) : (
                          <span className="text-rose-600 flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> -{formatRupiah(Math.abs(remaining))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOverBudget ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono-numbers text-[11px] text-slate-600 font-medium">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title="Ubah Anggaran"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={!!editBudget}
        onClose={() => setEditBudget(null)}
        title="Ubah Pagu Anggaran Belanja (RAPB)"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          {editBudget && (
            <div>
              <span className="text-slate-500 block text-[11px]">Kategori Belanja:</span>
              <p className="font-bold text-slate-900 text-sm">{editBudget.category_name} ({editBudget.category_code})</p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Plafon Anggaran Tahunan {selectedYear} (Rp)
            </label>
            <input
              type="number"
              required
              min="0"
              step="500000"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dasar Perhitungan / Catatan Musyawarah
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kesepakatan rapat pleno RT tanggal..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditBudget(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Simpan Pagu Anggaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
