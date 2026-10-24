import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Phone, Building2, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { Vendor, FinancialTransaction } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const VendorsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [venData, txData] = await Promise.all([
        api.getVendors(),
        api.getTransactions()
      ]);
      setVendors(venData);
      setTransactions(txData.filter(t => t.vendor_id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.service_type.toLowerCase().includes(search.toLowerCase()) ||
    (v.contact_person && v.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setName('');
    setServiceType('');
    setContactPerson('');
    setPhone('');
    setBankAccount('');
    setAddress('');
    setNotes('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serviceType) {
      setErrorMsg('Nama vendor dan bidang layanan wajib diisi');
      return;
    }
    try {
      await api.createVendor({
        name,
        service_type: serviceType,
        contact_person: contactPerson,
        phone,
        bank_account: bankAccount,
        address,
        notes
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan vendor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Manajemen Mitra Kerja & Multi-Vendor RT
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan rekanan pihak ketiga (pengangkut sampah, satpam swakarsa, teknisi kelistrikan & material)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Vendor Baru
        </button>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-slate-400">
            Memuat daftar rekanan...
          </div>
        ) : (
          filteredVendors.map((v) => (
            <div
              key={v.id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {v.service_type}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Rekanan Aktif
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {v.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">PIC / Kontak:</span>
                    <span className="font-medium text-slate-800">{v.contact_person || '-'} ({v.phone || '-'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Rekening Bank:</span>
                    <span className="font-mono-numbers text-slate-800">{v.bank_account || 'Tunai / Non-bank'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Realisasi Pembayaran:</span>
                  <span className="font-mono-numbers font-bold text-sm text-slate-900">
                    {formatRupiah(v.total_disbursed || 0)}
                  </span>
                </div>
                <span className="text-slate-500 font-mono-numbers text-[11px]">
                  {v.transaction_count || 0} Transaksi Pembayaran
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Real-time Multi-Vendor Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Transaksi Pembayaran Mitra & Vendor (Real-Time Ledger)
          </h3>
          <p className="text-xs text-slate-500">Pencatatan real-time pengeluaran kas RT yang dialokasikan ke masing-masing pihak ketiga</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">No. Transaksi</th>
                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                <th className="py-2.5 px-4 font-semibold">Nama Vendor / Mitra</th>
                <th className="py-2.5 px-4 font-semibold">Kategori Pekerjaan</th>
                <th className="py-2.5 px-4 font-semibold">Uraian Pekerjaan / Tagihan</th>
                <th className="py-2.5 px-4 font-semibold text-right">Nominal Dibayarkan</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada transaksi vendor tercatat.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-mono-numbers text-slate-600">{tx.transaction_number}</td>
                    <td className="py-2.5 px-4 text-slate-600">{formatDateIndo(tx.transaction_date)}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{tx.vendor_name || tx.payer_payee}</td>
                    <td className="py-2.5 px-4 text-slate-700">{tx.category_name}</td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">{tx.description}</td>
                    <td className="py-2.5 px-4 text-right font-mono-numbers font-bold text-rose-700">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                        {tx.status === 'paid' ? 'Lunas Dibayarkan' : 'Menunggu Approval'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Daftarkan Rekanan / Vendor Baru"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan / Kelompok Vendor</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: PT Harapan Bersih Lestari / Tukang Kebersihan"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bidang Layanan / Jasa</label>
              <input
                type="text"
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="Contoh: Jasa Sampah, Keamanan, Kelistrikan"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Penanggung Jawab (PIC)</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contoh: Bpk. Subagyo"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0813-xxxx-xxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening Bank Vendor</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Contoh: BRI 0206-01-xxxxxx-50-1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Kantor / Domisili</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap vendor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Simpan Vendor
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
