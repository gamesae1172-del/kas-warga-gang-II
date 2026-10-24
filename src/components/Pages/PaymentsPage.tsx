import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Search, Printer, CheckCircle, AlertCircle, FileText, ArrowRight, Upload, X, Image as ImageIcon, ShieldAlert, LogIn } from 'lucide-react';
import { Household, Invoice, CashAccount, Payment } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { ReceiptModal } from '../Common/ReceiptModal';
import { StatusBadge } from '../Common/Badge';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

interface PaymentsPageProps {
  initialHouseholdId?: string;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ initialHouseholdId }) => {
  const { isAdmin } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(initialHouseholdId || '');
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<Payment[]>([]);

  // Allocation selections: map of invoiceId -> allocatedAmount
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'qris'>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active receipt modal
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedHouseholdId) {
      loadHouseholdInvoices(selectedHouseholdId);
      loadHouseholdPayments(selectedHouseholdId);
    } else {
      setUnpaidInvoices([]);
      setAllocations({});
    }
  }, [selectedHouseholdId]);

  const loadInitialData = async () => {
    try {
      const [hhData, accData, payData] = await Promise.all([
        api.getHouseholds(),
        api.getCashAccounts(),
        api.getPayments()
      ]);
      setHouseholds(hhData);
      setCashAccounts(accData);
      setPaymentsHistory(payData);

      if (accData.length > 0) {
        setSelectedAccountId(accData[0].id);
      }
      if (initialHouseholdId) {
        setSelectedHouseholdId(initialHouseholdId);
      } else if (hhData.length > 0) {
        // Auto select first household with unpaid invoices if any
        const withArrears = hhData.find(h => (h.arrears_total || 0) > 0);
        setSelectedHouseholdId(withArrears ? withArrears.id : hhData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadHouseholdInvoices = async (hhId: string) => {
    try {
      const invs = await api.getInvoices({ household_id: hhId });
      const pending = invs.filter(i => i.status !== 'paid' && i.status !== 'canceled');
      setUnpaidInvoices(pending);

      // By default pre-check all unpaid invoices for convenience
      const initialMap: Record<string, number> = {};
      pending.forEach(inv => {
        initialMap[inv.id] = inv.amount - inv.paid_amount;
      });
      setAllocations(initialMap);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHouseholdPayments = async (hhId: string) => {
    try {
      const pays = await api.getPayments(hhId);
      setPaymentsHistory(pays);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleInvoice = (inv: Invoice) => {
    const remaining = inv.amount - inv.paid_amount;
    setAllocations(prev => {
      const next = { ...prev };
      if (next[inv.id] !== undefined) {
        delete next[inv.id];
      } else {
        next[inv.id] = remaining;
      }
      return next;
    });
  };

  const handleAmountChange = (invoiceId: string, value: number, maxAmount: number) => {
    const cleanVal = Math.max(0, Math.min(value, maxAmount));
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: cleanVal
    }));
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
      setProofPhoto(uploadEvent.target?.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProofPhoto(null);
    setPhotoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPaymentAmount = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    setErrorMsg('');

    const activeAllocations = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoice_id, amount]) => ({ invoice_id, amount }));

    if (activeAllocations.length === 0) {
      setErrorMsg('Pilih minimal satu tagihan untuk dialokasikan pembayaran.');
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg('Pilih rekening kas penerima.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.createPayment({
        household_id: selectedHouseholdId,
        allocations: activeAllocations,
        payment_method: paymentMethod,
        cash_account_id: selectedAccountId,
        reference_no: referenceNo,
        notes,
        proof_attachment: proofPhoto || undefined
      } as any);

      // Fetch the full newly created payment detail with allocations for Kwitansi modal
      const detail = await api.getPaymentDetail(response.paymentId);
      setActiveReceiptPayment(detail);

      // Reset & refresh
      setReferenceNo('');
      setNotes('');
      setProofPhoto(null);
      setPhotoFileName('');
      loadHouseholdInvoices(selectedHouseholdId);
      loadHouseholdPayments(selectedHouseholdId);
      // Also reload global payments
      api.getPayments().then(setPaymentsHistory);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const detail = await api.getPaymentDetail(paymentId);
      setActiveReceiptPayment(detail);
    } catch (err) {
      console.error('Failed to load receipt:', err);
    }
  };

  const selectedHousehold = households.find(h => h.id === selectedHouseholdId);

  return (
    <div className="space-y-6">
      {/* Read-Only Notice for Non-Admin */}
      {!isAdmin && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Mode Hanya-Lihat Aktif:</strong> Anda dapat memeriksa seluruh riwayat kwitansi iuran, rincian tunggakan, dan bukti pembayaran. Form pencatatan penerimaan iuran hanya dapat diproses oleh Admin RT.
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
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Loket Penerimaan Pembayaran Iuran Warga
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Pencatatan setoran iuran tunai & transfer, upload bukti foto slip transfer, alokasi tagihan, dan penerbitan kwitansi sah
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Payment Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Form Pembayaran Iuran
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Kwitansi Resmi Otomatis (KW-YYYYMM-XXXX)
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
            {/* Household Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pilih Rumah Tangga / Warga Pembayar
              </label>
              <select
                value={selectedHouseholdId}
                onChange={(e) => setSelectedHouseholdId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              >
                {households.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.block_number} — {h.head_name} (Tunggakan: {formatRupiah(h.arrears_total || 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Unpaid Invoices Checklist & Allocation */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-700">
                  Tagihan Belum Lunas ({unpaidInvoices.length} Faktur)
                </label>
                <span className="text-[11px] text-slate-400">Centang & atur nominal bayar:</span>
              </div>

              {unpaidInvoices.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200/70 rounded-lg text-emerald-800 text-center">
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  Seluruh tagihan untuk warga ini telah <strong>LUNAS</strong>. Tidak ada tunggakan berjalan.
                </div>
              ) : (
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/60 max-h-64 overflow-y-auto">
                  {unpaidInvoices.map(inv => {
                    const remaining = inv.amount - inv.paid_amount;
                    const isSelected = allocations[inv.id] !== undefined;
                    const allocatedAmt = allocations[inv.id] || 0;

                    return (
                      <div
                        key={inv.id}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-white border-emerald-300 shadow-2xs ring-1 ring-emerald-500/10'
                            : 'bg-white/60 border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isAdmin}
                            onChange={() => handleToggleInvoice(inv)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {inv.fee_name} ({inv.period})
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono-numbers">
                              Faktur: {inv.invoice_number} · Sisa: {formatRupiah(remaining)}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-slate-500 text-[11px]">Nominal (Rp):</span>
                            <input
                              type="number"
                              disabled={!isAdmin}
                              min="1000"
                              max={remaining}
                              step="5000"
                              value={allocatedAmt}
                              onChange={(e) => handleAmountChange(inv.id, Number(e.target.value), remaining)}
                              className="w-28 px-2 py-1 border border-slate-300 rounded font-mono-numbers font-semibold text-right text-emerald-800 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total and Account Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Rekening Kas Penerima
                </label>
                <select
                  value={selectedAccountId}
                  disabled={!isAdmin}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  disabled={!isAdmin}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white capitalize"
                >
                  <option value="cash">Tunai (Cash ke Bendahara)</option>
                  <option value="bank_transfer">Transfer Bank (BCA / Mandiri / BRI)</option>
                  <option value="qris">QRIS Standar RT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. Referensi / Bukti Transfer (Opsional)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Contoh: TRF-BCA-981027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Transaksi
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titip ke satpam / ditransfer Ibu Siti"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="block font-semibold text-slate-700">
                📸 Upload Foto Bukti Pembayaran / Struk Transfer (Opsional)
              </label>
              <p className="text-[11px] text-slate-500">
                Lampiran foto bukti transfer akan otomatis tertera di kwitansi pembayaran sah warga.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                disabled={!isAdmin}
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!proofPhoto ? (
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg bg-white text-slate-600 hover:text-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Pilih Foto Bukti Transfer (Kamera / Galeri)</span>
                </button>
              ) : (
                <div className="relative bg-white p-2 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={proofPhoto}
                      alt="Preview Bukti"
                      className="w-14 h-14 object-cover rounded border border-slate-200"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block text-xs truncate max-w-[200px]">
                        {photoFileName || 'Foto Bukti Transfer'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">✓ Bukti siap dicetak di kwitansi</span>
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

            {/* Total Display & Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] block">Total Pembayaran Diterima:</span>
                <span className="text-xl font-bold font-mono-numbers text-emerald-800">
                  {formatRupiah(totalPaymentAmount)}
                </span>
              </div>

              {isAdmin ? (
                <button
                  type="submit"
                  disabled={isSubmitting || totalPaymentAmount <= 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {isSubmitting ? 'Memproses...' : 'Simpan & Terbitkan Kwitansi'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-slate-600" />
                  Login Admin untuk Rekam Bayar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Household Info & Payment History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Household Summary Card */}
          {selectedHousehold && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Profil Rumah Tangga Pembayar
              </span>
              <h4 className="text-sm font-bold text-slate-900">{selectedHousehold.head_name}</h4>
              <p className="text-xs text-slate-600">{selectedHousehold.block_number} — {selectedHousehold.address}</p>
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">No. Kartu Keluarga:</span>
                  <span className="font-mono-numbers text-slate-800">{selectedHousehold.family_card_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Tunggakan:</span>
                  <span className="font-mono-numbers font-bold text-rose-600">
                    {formatRupiah(selectedHousehold.arrears_total || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* History of Payments Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" /> Riwayat Kwitansi Pembayaran
              </h3>
              <span className="text-[11px] text-slate-500 font-mono-numbers">
                {paymentsHistory.length} Transaksi
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {paymentsHistory.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada pembayaran dicatat.
                </div>
              ) : (
                paymentsHistory.map(pay => (
                  <div key={pay.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-semibold text-xs text-slate-900">
                          {pay.receipt_number}
                        </span>
                        <StatusBadge status={pay.status} />
                        {pay.proof_attachment && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                            📸 Ada Bukti Foto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">
                        {pay.head_name} ({pay.block_number})
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {formatDateIndo(pay.payment_date)} · {pay.payment_method}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-mono-numbers font-bold text-xs text-emerald-800">
                        {formatRupiah(pay.total_amount)}
                      </div>
                      <button
                        onClick={() => handleViewReceipt(pay.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                      >
                        <Printer className="w-3 h-3" /> Kwitansi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kwitansi Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptPayment}
        onClose={() => setActiveReceiptPayment(null)}
        payment={activeReceiptPayment}
      />

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
