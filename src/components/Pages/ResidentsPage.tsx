import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Download, UserPlus } from 'lucide-react';
import { Resident, Household } from '../../types';
import { api } from '../../services/api';
import { exportToCSV } from '../../utils/format';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const ResidentsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form
  const [householdId, setHouseholdId] = useState('');
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Anak');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resData, hhData] = await Promise.all([
        api.getResidents(),
        api.getHouseholds()
      ]);
      setResidents(resData);
      setHouseholds(hhData);
      if (hhData.length > 0 && !householdId) {
        setHouseholdId(hhData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.nik && r.nik.includes(search)) ||
    (r.block_number && r.block_number.toLowerCase().includes(search.toLowerCase())) ||
    (r.occupation && r.occupation.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setNik(`367403${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setName('');
    setRelation('Anak');
    setGender('L');
    setPhone('');
    setOccupation('');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !name || !relation) {
      setErrorMsg('Pilih kartu keluarga, nama, dan hubungan dalam keluarga');
      return;
    }
    try {
      await api.createResident({
        household_id: householdId,
        nik,
        name,
        relation_to_head: relation,
        gender,
        phone,
        occupation
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan');
    }
  };

  const handleExportCSV = () => {
    const headers = ['NIK', 'Nama Lengkap', 'Hubungan Keluarga', 'Jenis Kelamin', 'Blok Rumah', 'Pekerjaan', 'Kontak'];
    const rows = filteredResidents.map(r => [
      r.nik || '-',
      r.name,
      r.relation_to_head,
      r.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
      r.block_number || '-',
      r.occupation || '-',
      r.phone || '-'
    ]);
    exportToCSV(`data_warga_rt004_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Data Kependudukan Warga RT
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sensus seluruh warga dan anggota keluarga penghuni RT 004/RW 012
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Data Warga
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Anggota Warga
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama warga, NIK, pekerjaan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-600">
          Total Terdata: <span className="font-bold text-slate-900 font-mono-numbers">{filteredResidents.length} Jiwa</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">NIK</th>
                <th className="py-3 px-4 font-semibold">Nama Lengkap</th>
                <th className="py-3 px-4 font-semibold">Hubungan Keluarga</th>
                <th className="py-3 px-4 font-semibold">L/P</th>
                <th className="py-3 px-4 font-semibold">Blok / Rumah</th>
                <th className="py-3 px-4 font-semibold">Pekerjaan</th>
                <th className="py-3 px-4 font-semibold">Kontak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data kependudukan...
                  </td>
                </tr>
              ) : filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data warga ditemukan.
                  </td>
                </tr>
              ) : (
                filteredResidents.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers text-slate-600">{r.nik || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        r.relation_to_head === 'Kepala Keluarga' 
                          ? 'bg-slate-100 text-slate-800 font-semibold' 
                          : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {r.relation_to_head}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{r.gender}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{r.block_number}</td>
                    <td className="py-3 px-4 text-slate-600">{r.occupation || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{r.phone || '-'}</td>
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
        title="Tambah Anggota Warga"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pilih Kartu Keluarga / Rumah Tangga</label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {households.map(h => (
                <option key={h.id} value={h.id}>
                  {h.block_number} - {h.head_name} (KK: {h.family_card_no})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama sesuai KTP/Akta"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIK (16 Digit)</label>
              <input
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hubungan Keluarga</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Orang Tua">Orang Tua / Mertua</option>
                <option value="Famili Lain">Famili Lain</option>
                <option value="Kepala Keluarga">Kepala Keluarga</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="L">Laki-Laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pekerjaan</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Contoh: Karyawan Swasta, Pelajar"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Kontak (Opsional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
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
              Simpan Data Warga
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
