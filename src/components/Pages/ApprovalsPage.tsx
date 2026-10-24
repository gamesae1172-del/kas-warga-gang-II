import React, { useState, useEffect } from 'react';
import { CheckSquare, XCircle, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FinancialTransaction } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const ApprovalsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [pendingTxs, setPendingTxs] = useState<FinancialTransaction[]>([]);
  const [historyTxs, setHistoryTxs] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Reject modal
  const [rejectingTx, setRejectingTx] = useState<FinancialTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const [allPending, allTx] = await Promise.all([
        api.getTransactions({ status: 'submitted' }),
        api.getTransactions()
      ]);
      setPendingTxs(allPending);
      const dec = allTx.filter(t => t.status === 'paid' || t.status === 'rejected');
      setHistoryTxs(dec.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (tx: FinancialTransaction) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.approveTransaction(tx.id);
      setSuccessMsg(`Transaksi ${tx.transaction_number} senilai ${formatRupiah(tx.amount)} berhasil disetujui dan saldo kas telah dibayarkan.`);
      loadApprovals();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyetujui transaksi');
    }
  };

  const handleOpenReject = (tx: FinancialTransaction) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setRejectingTx(tx);
    setRejectionReason('');
    setErrorMsg('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx || !rejectionReason.trim()) {
      setErrorMsg('Alasan penolakan wajib dicantumkan secara jelas.');
      return;
    }
    try {
      await api.rejectTransaction(rejectingTx.id, rejectionReason.trim());
      setSuccessMsg(`Pengajuan ${rejectingTx.transaction_number} telah ditolak dengan alasan: "${rejectionReason}"`);
      setRejectingTx(null);
      loadApprovals();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menolak transaksi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Meja Persetujuan Pengeluaran Kas (Ketua RT)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Validasi akuntabilitas belanja komunitas, penegakan prinsip pemisahan wewenang (Separation of Duties)
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pending Items Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Antrean Pengeluaran Menunggu Persetujuan
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-mono-numbers">
            {pendingTxs.length} Pengajuan
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat daftar persetujuan...
          </div>
        ) : pendingTxs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Semua pengajuan telah diproses.</p>
            <p className="text-slate-400 mt-0.5">Tidak ada belanja yang tertunda atau memerlukan otorisasi saat ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingTxs.map((tx) => (
              <div key={tx.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono-numbers font-semibold text-slate-900">{tx.transaction_number}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{formatDateIndo(tx.transaction_date)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {tx.category_name}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {tx.description}
                    </h4>

                    <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Penerima / Vendor: <strong>{tx.payer_payee || '-'}</strong></span>
                      <span>Rekening Asal: <strong>{tx.account_name}</strong></span>
                      <span>Pemohon: <span className="font-mono text-slate-500">{tx.requested_by}</span></span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                    <div className="font-mono-numbers text-xl font-bold text-rose-700">
                      {formatRupiah(tx.amount)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReject(tx)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </button>
                      <button
                        onClick={() => handleApprove(tx)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Setujui & Bayar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History of Recent Decisions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Keputusan Otorisasi Terkini
          </h3>
          <p className="text-xs text-slate-500">Pencatatan keputusan Ketua RT dan berita acara penolakan</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">No. Transaksi</th>
                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                <th className="py-2.5 px-4 font-semibold">Keperluan</th>
                <th className="py-2.5 px-4 font-semibold">Vendor / Penerima</th>
                <th className="py-2.5 px-4 font-semibold text-right">Nominal</th>
                <th className="py-2.5 px-4 font-semibold text-center">Keputusan</th>
                <th className="py-2.5 px-4 font-semibold">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{tx.transaction_number}</td>
                  <td className="py-2.5 px-4 text-slate-600">{formatDateIndo(tx.transaction_date)}</td>
                  <td className="py-2.5 px-4 text-slate-800 font-medium max-w-xs truncate">{tx.description}</td>
                  <td className="py-2.5 px-4 text-slate-700">{tx.payer_payee || '-'}</td>
                  <td className="py-2.5 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                    {formatRupiah(tx.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      tx.status === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                    }`}>
                      {tx.status === 'paid' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 italic max-w-xs truncate">
                    {tx.rejection_reason || 'Disetujui sesuai RAPB'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={!!rejectingTx}
        onClose={() => setRejectingTx(null)}
        title="Penolakan Pengajuan Belanja Kas"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          {rejectingTx && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-500 block text-[11px]">Rincian Transaksi:</span>
              <p className="font-bold text-slate-900">{rejectingTx.description}</p>
              <div className="flex items-center justify-between text-xs font-mono-numbers pt-1">
                <span className="text-slate-600">{rejectingTx.transaction_number}</span>
                <span className="font-bold text-rose-700">{formatRupiah(rejectingTx.amount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Berita Acara / Alasan Penolakan (Wajib Diisi)
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Melebihi plafon anggaran atau permohonan nota belum dilengkapi lampiran..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Transaksi yang ditolak akan tetap tersimpan dalam jejak audit permanen dan saldo kas tidak akan dipotong.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRejectingTx(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
            >
              Konfirmasi Penolakan
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
