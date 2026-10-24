import React, { useRef, useState } from 'react';
import { Printer, X, CheckCircle, FileText, Image as ImageIcon, ZoomIn, Building2, Calendar, UserCheck } from 'lucide-react';
import { FinancialTransaction } from '../../types';
import { formatRupiah, formatDateIndo, terbilang } from '../../utils/format';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: (FinancialTransaction & {
    unit_name?: string;
    rt_number?: string;
    rw_number?: string;
    category_name?: string;
    account_name?: string;
    vendor_name?: string;
    vendor_service?: string;
    vendor_bank?: string;
    bank_name?: string;
    account_number?: string;
  }) | null;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIncome = transaction.type === 'income';
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';

  const docTitle = isIncome
    ? 'BUKTI KAS MASUK (BKM)'
    : isExpense
    ? 'BUKTI KAS KELUAR (BKK)'
    : 'BUKTI MUTASI KAS INTERNAL';

  const docTheme = isIncome
    ? {
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        text: 'text-emerald-800',
        subtext: 'Penerimaan Kas & Iuran Warga'
      }
    : isExpense
    ? {
        badge: 'bg-red-100 text-red-800 border-red-300',
        text: 'text-red-800',
        subtext: 'Pengeluaran & Belanja Operasional'
      }
    : {
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
        text: 'text-blue-800',
        subtext: 'Transfer Antar Rekening'
      };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity no-print"
            onClick={onClose}
          />

          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl my-8 border border-slate-200">
            {/* Action Bar (Hidden when printed) */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50 no-print">
              <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
                <FileText className={`w-4 h-4 ${docTheme.text}`} />
                <span>Kwitansi Resmi {docTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Bukti Transaksi
                </button>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div ref={receiptRef} className="p-8 bg-white print:p-0 text-slate-900 font-sans">
              {/* Kop Surat / Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center bg-slate-100 text-slate-900 font-bold text-xs text-center p-1 leading-tight">
                    RT.{transaction.rt_number || '004'}<br />RW.{transaction.rw_number || '012'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                      PENGURUS {transaction.unit_name || 'RUKUN TETANGGA 004 / RW 012'}
                    </h2>
                    <p className="text-xs text-slate-600">
                      Kelurahan Pondok Jagung, Kecamatan Serpong Utara, Tangerang Selatan
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Sistem Kas Digital Terverifikasi (KAS WARGA)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">No. Registrasi Kas:</span>
                  <span className="font-mono-numbers font-bold text-xs text-slate-900 block bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {transaction.transaction_number}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Tanggal: {formatDateIndo(transaction.transaction_date)}
                  </span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="text-center my-4">
                <span className={`inline-block px-3 py-0.5 text-xs font-bold rounded border uppercase tracking-wider mb-1 ${docTheme.badge}`}>
                  {docTitle}
                </span>
                <p className="text-xs text-slate-500 italic">{docTheme.subtext}</p>
              </div>

              {/* Transaction Content Table / Grid */}
              <div className="space-y-3 text-sm my-5 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">
                    {isIncome ? 'Diterima Dari' : isExpense ? 'Dibayarkan Kepada' : 'Transfer Dari Akun'}
                  </div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className="col-span-7 font-semibold text-slate-900">
                    {isTransfer
                      ? `${transaction.account_name || 'Kas Tunai'} ➔ ${transaction.to_account_name || 'Rekening Bank'}`
                      : transaction.payer_payee || transaction.vendor_name || 'Warga / Rekanan RT'}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">Jumlah Uang</div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className={`col-span-7 font-mono-numbers font-bold text-base ${docTheme.text}`}>
                    {formatRupiah(transaction.amount)}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">Terbilang</div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className="col-span-7 italic text-slate-800 bg-amber-50/70 p-2 rounded border border-amber-200/60 text-xs font-medium">
                    "{terbilang(transaction.amount)}"
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">Pos / Kategori</div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className="col-span-7 text-slate-800 font-medium">
                    {transaction.category_name || (isTransfer ? 'Mutasi Rekening' : 'Kas Umum')}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">Akun Kas & Metode</div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className="col-span-7 text-slate-700 capitalize">
                    {transaction.account_name || 'Kas Tunai'}
                    {transaction.bank_name ? ` (${transaction.bank_name} - ${transaction.account_number || ''})` : ''}
                    {' • '}
                    <span className="font-medium">
                      {transaction.payment_method === 'bank_transfer'
                        ? 'Transfer Bank'
                        : transaction.payment_method === 'cash'
                        ? 'Tunai (Cash)'
                        : transaction.payment_method}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 text-slate-600">Untuk Keperluan / Uraian</div>
                  <div className="col-span-1 text-slate-400">:</div>
                  <div className="col-span-7 text-slate-800 font-medium whitespace-pre-wrap">
                    {transaction.description}
                  </div>
                </div>

                {transaction.vendor_name && (
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4 text-slate-600">Rekanan / Vendor</div>
                    <div className="col-span-1 text-slate-400">:</div>
                    <div className="col-span-7 text-slate-700 text-xs">
                      {transaction.vendor_name} {transaction.vendor_service ? `(${transaction.vendor_service})` : ''}
                      {transaction.vendor_bank ? ` - Rek: ${transaction.vendor_bank}` : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Photo / Receipt Attachment Section */}
              {transaction.receipt_attachment ? (
                <div className="my-5 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      Foto Bukti / Struk / Nota Transaksi:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFullImage(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium no-print"
                    >
                      <ZoomIn className="w-3 h-3" />
                      Perbesar Foto
                    </button>
                  </div>
                  <div className="flex justify-center items-center bg-white p-2 rounded border border-slate-200">
                    <img
                      src={transaction.receipt_attachment}
                      alt="Bukti Kwitansi Transaksi"
                      className="max-h-56 max-w-full rounded object-contain cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setShowFullImage(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="my-4 p-3 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                  Tidak ada lampiran foto struk fisik untuk transaksi ini.
                </div>
              )}

              {/* Signatures Block */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-4 text-center text-xs border-t border-slate-200">
                <div>
                  <p className="text-slate-500 mb-14">
                    {isIncome ? 'Penyetor Uang,' : isExpense ? 'Penerima Pembayaran,' : 'Menyerahkan,'}
                  </p>
                  <p className="font-semibold text-slate-900 underline">
                    {transaction.payer_payee || transaction.vendor_name || 'Warga / Rekanan'}
                  </p>
                  <p className="text-[11px] text-slate-400">Pihak Terkait</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">
                    {isIncome ? 'Bendahara Penerima,' : 'Bendahara Pengeluaran,'}
                  </p>
                  <p className="font-semibold text-slate-900 underline">Siti Rahmawati, S.E.</p>
                  <p className="text-[11px] text-slate-400">Bendahara RT 004</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">
                    Mengetahui & Menyetujui,
                  </p>
                  <p className="font-semibold text-slate-900 underline">Ir. H. Budi Santoso</p>
                  <p className="text-[11px] text-slate-400">Ketua RT 004/012</p>
                </div>
              </div>

              {/* Security & Audit Footer */}
              <div className="mt-8 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Dokumen sah terarsip digital pada Kas Warga</span>
                <span>Audit Ref: {transaction.id} • Status: {transaction.status?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {showFullImage && transaction.receipt_attachment && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-lg p-2 overflow-auto">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 text-white bg-black/60 p-1.5 rounded-full hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={transaction.receipt_attachment}
              alt="Bukti Foto Transaksi Kas"
              className="max-h-[85vh] max-w-full object-contain mx-auto rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};
