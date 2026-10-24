import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, Filter, Building2 } from 'lucide-react';
import { FinancialTransaction, CashAccount, Invoice, Household } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo, exportToCSV } from '../../utils/format';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'cashbook' | 'income_expense' | 'arrears'>('cashbook');
  const [period, setPeriod] = useState('2026-10');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [period, selectedAccountId, reportType]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [accData, txData, invData] = await Promise.all([
        api.getCashAccounts(),
        api.getTransactions({ period }),
        api.getInvoices({ period: reportType === 'arrears' ? undefined : period })
      ]);
      setAccounts(accData);
      setInvoices(invData);

      let filteredTxs = txData;
      if (selectedAccountId !== 'all') {
        filteredTxs = txData.filter(t => t.cash_account_id === selectedAccountId || t.to_cash_account_id === selectedAccountId);
      }
      setTransactions(filteredTxs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations for Buku Kas Umum (Running balance)
  let runningBalance = accounts.reduce((s, a) => s + (a.initial_balance || 0), 0);
  const cashbookRows = transactions.filter(t => t.status === 'paid' || t.status === 'approved').map(tx => {
    let debit = 0;
    let credit = 0;
    if (tx.type === 'income') {
      debit = tx.amount;
      runningBalance += tx.amount;
    } else if (tx.type === 'expense') {
      credit = tx.amount;
      runningBalance -= tx.amount;
    }
    return { ...tx, debit, credit, balanceAfter: runningBalance };
  });

  const totalDebit = cashbookRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = cashbookRows.reduce((s, r) => s + r.credit, 0);
  const netSurplus = totalDebit - totalCredit;

  const handleExportCSV = () => {
    if (reportType === 'cashbook') {
      const headers = ['No. Transaksi', 'Tanggal', 'Uraian Transaksi', 'Rekening', 'Penerimaan (Debit)', 'Pengeluaran (Kredit)', 'Saldo Berjalan'];
      const rows = cashbookRows.map(r => [
        r.transaction_number,
        r.transaction_date,
        r.description,
        r.account_name || '-',
        r.debit,
        r.credit,
        r.balanceAfter
      ]);
      exportToCSV(`buku_kas_umum_${period}`, headers, rows);
    } else if (reportType === 'arrears') {
      const headers = ['No. Tagihan', 'Warga / KK', 'Blok Rumah', 'Jenis Iuran', 'Periode', 'Tagihan', 'Terbayar', 'Sisa Tunggakan', 'Status'];
      const rows = invoices.filter(i => i.status !== 'paid' && i.status !== 'canceled').map(inv => [
        inv.invoice_number,
        inv.head_name || '-',
        inv.block_number || '-',
        inv.fee_name || '-',
        inv.period,
        inv.amount,
        inv.paid_amount,
        inv.amount - inv.paid_amount,
        inv.status
      ]);
      exportToCSV(`rekap_tunggakan_warga_${period}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (No print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Laporan Keuangan & Akuntabilitas Kas RT
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Buku Kas Umum, neraca surplus-defisit, dan rekapitulasi tunggakan iuran warga
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Excel/CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan Resmi (PDF)
          </button>
        </div>
      </div>

      {/* Control Tabs & Filters (No print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        {/* Report Type Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setReportType('cashbook')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              reportType === 'cashbook' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buku Kas Umum (BKU)
          </button>
          <button
            onClick={() => setReportType('income_expense')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              reportType === 'income_expense' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laporan Laba / Rugi (Surplus)
          </button>
          <button
            onClick={() => setReportType('arrears')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              reportType === 'arrears' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap Tunggakan Iuran
          </button>
        </div>

        {/* Date and Account filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Periode:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Rekening Kas:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="all">Konsolidasi (Semua Kas)</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Official Printable Report Canvas */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none">
        {/* Kop Laporan Resmi */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-emerald-800 flex items-center justify-center bg-emerald-50 text-emerald-900 font-bold text-xs text-center p-1 leading-tight">
              RT.004<br />RW.012
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                RUKUN TETANGGA 004 / RW 012 TAMAN GRAHA ASRI
              </h2>
              <p className="text-xs text-slate-600">
                Kelurahan Pondok Jagung, Kecamatan Serpong Utara, Kota Tangerang Selatan
              </p>
              <p className="text-xs text-slate-500">
                Sistem Akuntabilitas Keuangan Lingkungan Warga (KAS WARGA)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Laporan Keuangan Resmi</span>
            <span className="font-bold text-sm text-slate-900 block uppercase">
              Periode: {period}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Dicetak: {new Date().toLocaleDateString('id-ID')} WIB
            </span>
          </div>
        </div>

        {/* Report Title */}
        <div className="text-center my-4">
          <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide underline">
            {reportType === 'cashbook' && 'BUKU KAS UMUM (BKU) PENERIMAAN & PENGELUARAN'}
            {reportType === 'income_expense' && 'LAPORAN REALISASI ARUS KAS & SURPLUS/DEFISIT'}
            {reportType === 'arrears' && 'REKAPITULASI PIUTANG & TUNGGAKAN IURAN WARGA'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mata Uang: Indonesian Rupiah (IDR) · Basis: Transaksi Sah (Posted Transactions)
          </p>
        </div>

        {/* Report Content based on selected type */}
        {reportType === 'cashbook' && (
          <div className="mt-6">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Transaksi</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Uraian Transaksi</th>
                  <th className="py-2.5 px-3">Rekening</th>
                  <th className="py-2.5 px-3 text-right">Debit (Masuk)</th>
                  <th className="py-2.5 px-3 text-right">Kredit (Keluar)</th>
                  <th className="py-2.5 px-3 text-right">Saldo Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cashbookRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Tidak ada mutasi transaksi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  cashbookRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono-numbers text-slate-600">{r.transaction_number}</td>
                      <td className="py-2 px-3 text-slate-600">{formatDateIndo(r.transaction_date)}</td>
                      <td className="py-2 px-3 text-slate-900 font-medium max-w-xs">{r.description}</td>
                      <td className="py-2 px-3 text-slate-600">{r.account_name}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-semibold text-emerald-800">
                        {r.debit > 0 ? formatRupiah(r.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-semibold text-rose-700">
                        {r.credit > 0 ? formatRupiah(r.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        {formatRupiah(r.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right">TOTAL MUTASI PERIODE:</td>
                  <td className="py-2.5 px-3 text-right font-mono-numbers text-emerald-800">{formatRupiah(totalDebit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono-numbers text-rose-700">{formatRupiah(totalCredit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-900">
                    Net: {formatRupiah(netSurplus)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'income_expense' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-xs text-emerald-800 font-semibold block">Total Penerimaan Kas</span>
                <span className="text-2xl font-bold font-mono-numbers text-emerald-900">{formatRupiah(totalDebit)}</span>
              </div>
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg">
                <span className="text-xs text-rose-800 font-semibold block">Total Pengeluaran Kas</span>
                <span className="text-2xl font-bold font-mono-numbers text-rose-900">{formatRupiah(totalCredit)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Surplus / (Defisit) Bersih Periode Berjalan:</span>
              <span className={`text-xl font-bold font-mono-numbers ${netSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatRupiah(netSurplus)}
              </span>
            </div>
          </div>
        )}

        {reportType === 'arrears' && (
          <div className="mt-6">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Tagihan</th>
                  <th className="py-2.5 px-3">Kepala Keluarga</th>
                  <th className="py-2.5 px-3">Blok Rumah</th>
                  <th className="py-2.5 px-3">Jenis Iuran</th>
                  <th className="py-2.5 px-3">Periode</th>
                  <th className="py-2.5 px-3 text-right">Nilai Tagihan</th>
                  <th className="py-2.5 px-3 text-right">Terbayar</th>
                  <th className="py-2.5 px-3 text-right">Sisa Tunggakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.filter(i => i.status !== 'paid' && i.status !== 'canceled').map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono-numbers text-slate-600">{inv.invoice_number}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{inv.head_name}</td>
                    <td className="py-2 px-3 text-slate-700">{inv.block_number}</td>
                    <td className="py-2 px-3 text-slate-700">{inv.fee_name}</td>
                    <td className="py-2 px-3 text-slate-600 font-mono-numbers">{inv.period}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{formatRupiah(inv.amount)}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-emerald-700">{formatRupiah(inv.paid_amount)}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers font-bold text-rose-700">
                      {formatRupiah(inv.amount - inv.paid_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures Area for official document */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-6 text-center text-xs print-break-inside-avoid">
          <div>
            <p className="text-slate-500 mb-16">
              Mengetahui,<br />
              <span className="font-semibold text-slate-800">Ketua RT 004 / RW 012</span>
            </p>
            <p className="font-bold text-slate-900 underline">Ir. H. Budi Santoso</p>
            <p className="text-slate-500">Ketua RT</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">
              Tangerang Selatan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
              <span className="font-semibold text-slate-800">Bendahara Pengelola Kas RT</span>
            </p>
            <p className="font-bold text-slate-900 underline">Siti Rahmawati, S.E.</p>
            <p className="text-slate-500">Bendahara</p>
          </div>
        </div>
      </div>
    </div>
  );
};
