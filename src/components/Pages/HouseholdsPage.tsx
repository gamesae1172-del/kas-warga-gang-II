import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Upload, Home, Users, Edit2, AlertCircle } from 'lucide-react';
import { Household } from '../../types';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo, exportToCSV } from '../../utils/format';
import { StatusBadge } from '../Common/Badge';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const HouseholdsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editHousehold, setEditHousehold] = useState<Household | null>(null);

  // Form states
  const [familyCardNo, setFamilyCardNo] = useState('');
  const [headName, setHeadName] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadHouseholds();
  }, [search]);

  const loadHouseholds = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHouseholds(search);
      setHouseholds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setFamilyCardNo(`367403010123${Math.floor(1000 + Math.random() * 9000)}`);
    setHeadName('');
    setBlockNumber('');
    setAddress('');
    setPhone('');
    setNotes('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (h: Household) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditHousehold(h);
    setHeadName(h.head_name);
    setBlockNumber(h.block_number);
    setAddress(h.address);
    setPhone(h.phone || '');
    setNotes(h.notes || '');
    setErrorMsg('');
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName || !blockNumber || !familyCardNo) {
      setErrorMsg('Nomor KK, Nama Kepala Keluarga, dan Nomor Blok wajib diisi');
      return;
    }
    try {
      await api.createHousehold({
        family_card_no: familyCardNo,
        head_name: headName,
        block_number: blockNumber,
        address: address || `Jl. Graha Asri Blok ${blockNumber}`,
        phone,
        notes
      });
      setIsAddModalOpen(false);
      loadHouseholds();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHousehold) return;
    try {
      await api.updateHousehold(editHousehold.id, {
        head_name: headName,
        block_number: blockNumber,
        address,
        phone,
        notes
      });
      setEditHousehold(null);
      loadHouseholds();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nomor KK', 'Kepala Keluarga', 'Blok Rumah', 'Alamat', 'No. HP', 'Jumlah Jiwa', 'Total Tunggakan', 'Status'];
    const rows = households.map(h => [
      h.family_card_no,
      h.head_name,
      h.block_number,
      h.address,
      h.phone || '-',
      h.resident_count || 1,
      h.arrears_total || 0,
      h.status
    ]);
    exportToCSV(`data_kartu_keluarga_rt004_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Manajemen Kartu Keluarga (KK)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Basis data unit rumah tangga penanggung tagihan iuran lingkungan RT 004/RW 012
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
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah KK Baru
          </button>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kepala keluarga, blok..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-600">
          <div>
            Total Rumah Tangga: <span className="font-bold text-slate-900 font-mono-numbers">{households.length} KK</span>
          </div>
          <div>
            Menunggak: <span className="font-bold text-rose-600 font-mono-numbers">{households.filter(h => (h.arrears_total || 0) > 0).length} KK</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Nomor KK</th>
                <th className="py-3 px-4 font-semibold">Kepala Keluarga</th>
                <th className="py-3 px-4 font-semibold">Blok / Alamat</th>
                <th className="py-3 px-4 font-semibold">Kontak</th>
                <th className="py-3 px-4 font-semibold text-center">Anggota</th>
                <th className="py-3 px-4 font-semibold text-right">Tunggakan Iuran</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data rumah tangga...
                  </td>
                </tr>
              ) : households.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data rumah tangga.
                  </td>
                </tr>
              ) : (
                households.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers text-slate-600">{h.family_card_no}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{h.head_name}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{h.block_number}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{h.address}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{h.phone || '-'}</td>
                    <td className="py-3 px-4 text-center font-mono-numbers font-medium text-slate-800">
                      {h.resident_count || 1} Jiwa
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-semibold">
                      {(h.arrears_total || 0) > 0 ? (
                        <span className="text-rose-600">{formatRupiah(h.arrears_total)}</span>
                      ) : (
                        <span className="text-emerald-700">Lunas (Rp 0)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(h)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Edit Data KK"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Pendaftaran Kartu Keluarga (KK) Baru"
      >
        <form onSubmit={handleSaveNew} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nomor Kartu Keluarga (16 Digit)</label>
            <input
              type="text"
              required
              value={familyCardNo}
              onChange={(e) => setFamilyCardNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Keluarga</label>
              <input
                type="text"
                required
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                placeholder="Contoh: Ir. H. Budi Santoso"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Blok / Rumah</label>
              <input
                type="text"
                required
                value={blockNumber}
                onChange={(e) => setBlockNumber(e.target.value)}
                placeholder="Contoh: Blok B2 No. 08"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Flamboyan 2 No. 08, Graha Asri"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Kontak / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pemilik rumah tinggal"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-lg text-emerald-800">
            Pendaftaran KK baru akan secara otomatis mengaktifkan pembebanan Iuran Bulanan IPL dan Dana Sosial untuk rumah tangga ini.
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
              Simpan Rumah Tangga
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editHousehold}
        onClose={() => setEditHousehold(null)}
        title="Ubah Data Rumah Tangga"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Keluarga</label>
            <input
              type="text"
              required
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Blok / Rumah</label>
              <input
                type="text"
                required
                value={blockNumber}
                onChange={(e) => setBlockNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor HP</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditHousehold(null)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Simpan Perubahan
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
