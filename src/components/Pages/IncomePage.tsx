import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, ArrowDownLeft, Download, FileText, Image as ImageIcon, X, Upload, ShieldAlert, LogIn } from 'lucide-react';
import { FinancialTransaction, Category, CashAccount } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo, exportToCSV } from '../../utils/format';
import { StatusBadge } from '../Common/Badge';
import { Modal } from '../Common/Modal';
import { TransactionReceiptModal } from '../Common/TransactionReceiptModal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const IncomePage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form states
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState(500000);
  const [description, setDescription] = useState('');
  const [payer, setPayer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active receipt voucher for view/print
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txData, catData, accData] = await Promise.all([
        api.getTransactions({ type: 'income' }),
        api.getCategories(),
        api.getCashAccounts()
      ]);
      setTransactions(txData);
      const incCats = catData.filter(c => c.type === 'income');
      setCategories(incCats);
      setAccounts(accData);

      if (incCats.length > 0 && !categoryId) setCategoryId(incCats[0].id);
      if (accData.length > 0 && !accountId) setAccountId(accData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = transactions.filter(t =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.payer_payee && t.payer_payee.toLowerCase().includes(search.toLowerCase())) ||
    t.transaction_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setDescription('');
    setPayer('');
    setAmount(250000);
    setTxDate(new Date().toISOString().slice(0, 10));
    setReceiptPhoto(null);
    setPhotoFileName('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPG, PNG, atau WEBP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 8 MB');
      return;
    }

    setPhotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setReceiptPhoto(uploadEvent.target?.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setReceiptPhoto(null);
    setPhotoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0 || !accountId) {
      setErrorMsg('Lengkapi keterangan, nominal, dan rekening penerima');
      return;
    }

    setIsSaving(true);
    try {
      const result = await api.createTransaction({
        type: 'income',
        category_id: categoryId,
        cash_account_id: accountId,
        amount: Number(amount),
        description,
        payer_payee: payer,
        payment_method: paymentMethod,
        transaction_date: txDate,
        receipt_attachment: receiptPhoto || undefined
      });

      setIsAddModalOpen(false);
      await loadData();

      // Open receipt immediately upon recording
      const fullDetail = await api.getTransactionDetail(result.id);
      setSelectedTxForReceipt(fullDetail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan transaksi pemasukan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewReceipt = async (txId: string) => {
    try {
      const fullDetail = await api.getTransactionDetail(txId);
      setSelectedTxForReceipt(fullDetail);
    } catch (err) {
      console.error('Failed to load transaction receipt:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No. Transaksi', 'Tanggal', 'Kategori', 'Sumber / Pembayar', 'Keterangan', 'Rekening Kas', 'Nominal', 'Status'];
    const rows = filtered.map(t => [
      t.transaction_number,
      t.transaction_date,
      t.category_name || '-',
      t.payer_payee || '-',
      t.description,
      t.account_name || '-',
      t.amount,
      t.status
    ]);
    exportToCSV(`rekap_pemasukan_rt004_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const totalIncome = filtered.reduce((sum, t) => sum + (t.status === 'approved' || t.status === 'paid' ? t.amount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Read-Only Notice for Non-Admin */}
      {!isAdmin && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Mode Hanya-Lihat Aktif:</strong> Anda dapat melihat seluruh arsip pemasukan kas, mengunduh bukti kwitansi, dan melihat foto struk. Penambahan pemasukan kas hanya dapat dilakukan oleh Admin.
            </span>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Login Admin
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            Pemasukan Kas Komunitas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Buku catatan penerimaan kas, sumbangan donatur, sewa aset, dan kwitansi tanda terima resmi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Pemasukan
          </button>

          {isAdmin ? (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Catat Pemasukan Baru
            </button>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-600" />
              Login Admin untuk Catat
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi, pembayar, keterangan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-600">
          Total Pemasukan: <span className="text-base font-bold text-emerald-700 font-mono-numbers">{formatRupiah(totalIncome)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">No. Transaksi</th>
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold">Penyetor / Sumber</th>
                <th className="py-3 px-4 font-semibold">Keterangan</th>
                <th className="py-3 px-4 font-semibold">Rekening Kas</th>
                <th className="py-3 px-4 font-semibold text-right">Nominal (Rp)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Kwitansi & Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data pemasukan...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada data pemasukan.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers text-slate-600">{tx.transaction_number}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateIndo(tx.transaction_date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{tx.category_name}</td>
                    <td className="py-3 px-4 text-slate-700">{tx.payer_payee || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{tx.description}</td>
                    <td className="py-3 px-4 text-slate-600">{tx.account_name}</td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                      +{formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewReceipt(tx.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        title="Lihat Kwitansi Sah & Lampiran Foto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Kwitansi</span>
                        {tx.receipt_attachment && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" title="Ada Lampiran Foto" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal with Photo Upload */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Catat Pemasukan Kas & Terbitkan Kwitansi"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Pemasukan</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nominal Penerimaan (Rp)</label>
              <input
                type="number"
                required
                min="1000"
                step="5000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Penyetor / Sumber Dana</label>
              <input
                type="text"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder="Contoh: Keluarga Bpk. Agus / Donatur Warga"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rekening Kas Penerima</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Metode Penerimaan</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Keterangan / Uraian Transaksi</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Sumbangan sukarela untuk pembelian kanopi balai warga"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Photo Upload Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="block font-semibold text-slate-700">
              📸 Upload Foto Kwitansi / Struk / Bukti Transfer (Opsional)
            </label>
            <p className="text-[11px] text-slate-500">
              Foto bukti akan terarsip permanen dan tercantum pada kwitansi resmi transaksi.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {!receiptPhoto ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg bg-white text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Pilih Foto Bukti (Kamera / Galeri)</span>
              </button>
            ) : (
              <div className="relative bg-white p-2 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={receiptPhoto}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border border-slate-200"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs truncate max-w-[200px]">
                      {photoFileName || 'Foto Bukti Transaksi'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Foto siap disimpan</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Hapus foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan & Terbitkan Kwitansi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Kwitansi Bukti Kas Masuk Modal */}
      <TransactionReceiptModal
        isOpen={!!selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
        transaction={selectedTxForReceipt}
      />

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsLoginModalOpen(false);
          setIsAddModalOpen(true);
        }}
      />
    </div>
  );
};
