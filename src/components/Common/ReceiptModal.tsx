import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle } from 'lucide-react';
import { Payment } from '../../types';
import { formatRupiah, formatDateIndo, terbilang } from '../../utils/format';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  unitName?: string;
  rtNumber?: string;
  rwNumber?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  unitName = 'RUKUN TETANGGA 004 / RW 012',
  rtNumber = '004',
  rwNumber = '012'
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
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
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Kwitansi Pembayaran Sah RT/RW</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Kwitansi
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
            {/* Kop Kwitansi */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-emerald-800 flex items-center justify-center bg-emerald-50 text-emerald-900 font-bold text-xs text-center p-1 leading-tight">
                  RT.{rtNumber}<br />RW.{rwNumber}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                    PENGURUS {unitName}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Kelurahan Pondok Jagung, Kec. Serpong Utara, Kota Tangerang Selatan
                  </p>
                  <p className="text-xs text-slate-500">
                    Sistem Tata Kelola Kas Komunitas Terpadu (KAS WARGA)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Nomor Kwitansi:</span>
                <span className="font-mono-numbers font-bold text-sm text-slate-900 block bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {payment.receipt_number}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Tgl: {formatDateIndo(payment.payment_date)}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-4">
              <h1 className="text-lg font-bold text-slate-900 tracking-wider underline uppercase">
                KWITANSI TANDA PEMBAYARAN
              </h1>
            </div>

            {/* Receipt Details Grid */}
            <div className="space-y-3 text-sm my-6 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 text-slate-600">Telah Diterima Dari</div>
                <div className="col-span-1 text-slate-400">:</div>
                <div className="col-span-7 font-semibold text-slate-900">
                  {payment.head_name || 'Warga'} ({payment.block_number})
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 text-slate-600">Sejumlah Uang</div>
                <div className="col-span-1 text-slate-400">:</div>
                <div className="col-span-7 font-mono-numbers font-bold text-base text-emerald-800">
                  {formatRupiah(payment.total_amount)}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 text-slate-600">Terbilang</div>
                <div className="col-span-1 text-slate-400">:</div>
                <div className="col-span-7 italic text-slate-800 bg-amber-50/60 p-2 rounded border border-amber-200/50 text-xs font-medium">
                  "{terbilang(payment.total_amount)}"
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 text-slate-600">Metode & Rekening</div>
                <div className="col-span-1 text-slate-400">:</div>
                <div className="col-span-7 text-slate-700 capitalize">
                  {payment.payment_method === 'bank_transfer' ? 'Transfer Bank' : payment.payment_method}
                  {payment.reference_no ? ` (Ref: ${payment.reference_no})` : ''} - {payment.account_name || 'Kas RT'}
                </div>
              </div>
            </div>

            {/* Breakdown Allocations Table */}
            {payment.allocations && payment.allocations.length > 0 && (
              <div className="my-5">
                <p className="text-xs font-semibold text-slate-700 mb-2">Rincian Alokasi Tagihan Iuran:</p>
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">No. Tagihan</th>
                      <th className="py-2 px-3">Jenis Iuran</th>
                      <th className="py-2 px-3">Periode</th>
                      <th className="py-2 px-3 text-right">Nominal Alokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {payment.allocations.map((alloc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono-numbers text-slate-600">{alloc.invoice_number || alloc.invoice_id}</td>
                        <td className="py-2 px-3 text-slate-800 font-medium">{alloc.fee_name || 'Iuran Bulanan'}</td>
                        <td className="py-2 px-3 text-slate-600">{alloc.period || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                          {formatRupiah(alloc.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-300">
                      <td colSpan={3} className="py-2 px-3 text-right">Total Disetor:</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-emerald-800">
                        {formatRupiah(payment.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Photo Attachment if available */}
            {payment.proof_attachment && (
              <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span>📸 Lampiran Bukti Foto Pembayaran / Struk:</span>
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={payment.proof_attachment}
                    alt="Bukti Pembayaran"
                    className="max-h-48 max-w-full rounded border border-slate-300 object-contain shadow-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-4 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-16">Penyetor / Warga,</p>
                <p className="font-semibold text-slate-900 underline">{payment.head_name || 'Warga'}</p>
                <p className="text-slate-500">{payment.block_number}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-16">
                  Tangerang Selatan, {formatDateIndo(payment.payment_date)}<br />
                  <span className="font-medium text-slate-700">Bendahara Penerima Kas RT,</span>
                </p>
                <p className="font-semibold text-slate-900 underline">Siti Rahmawati, S.E.</p>
                <p className="text-slate-500">NIP/Pengurus RT. 004/012</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400 text-center">
              Dokumen ini merupakan bukti pembayaran sah yang dihasilkan secara otomatis oleh Sistem KAS WARGA RT 004/RW 012. Harap disimpan sebagai arsip keluarga.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
