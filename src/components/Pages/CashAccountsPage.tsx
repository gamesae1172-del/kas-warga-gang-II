import React, { useState, useEffect } from 'react';
import { Wallet, ArrowLeftRight, Building2, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { CashAccount, FinancialTransaction } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { Modal } from '../Common/Modal';

export const CashAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transfers, setTransfers] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState(500000);
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accData, allTx] = await Promise.all([
        api.getCashAccounts(),
        api.getTransactions({ type: 'transfer' })
      ]);
      setAccounts(accData);
      setTransfers(allTx);

      if (accData.length >= 2) {
        if (!fromAccountId) setFromAccountId(accData[1].id); // e.g. BCA
        if (!toAccountId) setToAccountId(accData[0].id); // e.g. Cash
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransfer = () => {
    setDescription('Penarikan Tunai dari Bank BCA untuk Kas Operasional RT');
    setAmount(1000000);
    setTxDate(new Date().toISOString().slice(0, 10));
    setErrorMsg('');
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (fromAccountId === toAccountId) {
      setErrorMsg('Rekening asal dan rekening tujuan harus berbeda.');
      return;
    }

    const sourceAcc = accounts.find(a => a.id === fromAccountId);
    if (!sourceAcc || sourceAcc.current_balance < amount) {
      setErrorMsg(`Saldo pada ${sourceAcc?.name || 'rekening asal'} tidak mencukupi untuk transfer ini.`);
      return;
    }

    try {
      await api.transferCash({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: Number(amount),
        description,
        transaction_date: txDate
      });
      setSuccessMsg(`Transfer internal ${formatRupiah(amount)} berhasil dibukukan tanpa mengubah saldo kas konsolidasi.`);
      setIsTransferModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses transfer');
    }
  };

  const totalConsolidatedBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Rekening Kas & Integritas Saldo
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan buku kas fisik, rekening giro perbankan, dan mutasi transfer internal
          </p>
        </div>

        <button
          onClick={handleOpenTransfer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Transfer Antar Rekening Kas
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invariant Statement Box */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs text-slate-500 font-medium">Total Kas Konsolidasi RT 004:</span>
          <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-0.5">
            {formatRupiah(totalConsolidatedBalance)}
          </div>
        </div>
        <div className="text-xs text-slate-600 max-w-md">
          <span className="font-semibold text-slate-800 block">Invarian Akuntansi:</span>
          Transfer antar rekening kas internal tidak pernah mengubah total kas konsolidasi komunitas. Setiap mutasi keluar selalu diimbangi mutasi masuk secara atomik.
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-slate-400">
            Memuat rekening...
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {acc.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">
                        {acc.account_type === 'cash' ? 'Kas Fisik Tunai' : `Bank ${acc.bank_name || ''}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <span className="text-[11px] text-slate-400 block">Saldo Riil Saat Ini:</span>
                  <div className="text-xl font-bold font-mono-numbers text-slate-900 mt-0.5">
                    {formatRupiah(acc.current_balance)}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Nomor Rekening:</span>
                  <span className="font-mono-numbers text-slate-800 font-medium">
                    {acc.account_number || 'Di Bendahara'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Awal Tahun:</span>
                  <span className="font-mono-numbers text-slate-600">
                    {formatRupiah(acc.initial_balance)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Internal Transfers History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Mutasi & Transfer Internal Antar Rekening
          </h3>
          <p className="text-xs text-slate-500">Mutasi debit/kredit internal tanpa mempengaruhi surplus/defisit komunitas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">No. Transaksi</th>
                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                <th className="py-2.5 px-4 font-semibold">Rekening Asal (Kredit)</th>
                <th className="py-2.5 px-4 font-semibold">Rekening Tujuan (Debit)</th>
                <th className="py-2.5 px-4 font-semibold">Keterangan</th>
                <th className="py-2.5 px-4 font-semibold text-right">Nominal Transfer</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada riwayat transfer internal dicatat.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{t.transaction_number}</td>
                    <td className="py-2.5 px-4 text-slate-600">{formatDateIndo(t.transaction_date)}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{t.account_name}</td>
                    <td className="py-2.5 px-4 font-medium text-emerald-800">{t.to_account_name || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">{t.description}</td>
                    <td className="py-2.5 px-4 text-right font-mono-numbers font-bold text-slate-900">
                      {formatRupiah(t.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                        Selesai
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Internal Antar Rekening Kas RT"
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dari Rekening (Asal)</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Tersedia: {formatRupiah(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ke Rekening (Tujuan)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nominal Transfer (Rp)</label>
              <input
                type="number"
                required
                min="10000"
                step="50000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Transfer</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tujuan / Berita Acara Transfer</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Tarik tunai kas operasional mingguan"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px]">
            Mutasi ini akan secara simultan mengurangi saldo rekening asal dan menambah rekening tujuan. Tidak akan dilaporkan sebagai biaya operasional warga.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
            >
              Eksekusi Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
