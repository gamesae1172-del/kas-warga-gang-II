import React, { useState, useEffect } from 'react';
import { Plus, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { FeeType } from '../../types';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/format';
import { Modal } from '../Common/Modal';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const FeeTypesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(150000);
  const [frequency, setFrequency] = useState<'monthly' | 'one_time' | 'voluntary'>('monthly');
  const [isMandatory, setIsMandatory] = useState(true);
  const [dueDay, setDueDay] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadFeeTypes();
  }, []);

  const loadFeeTypes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFeeTypes();
      setFeeTypes(data);
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
    setCode(`IUR-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setDescription('');
    setAmount(100000);
    setFrequency('monthly');
    setIsMandatory(true);
    setDueDay(10);
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || amount <= 0) {
      setErrorMsg('Kode, nama iuran, dan nominal wajib diisi');
      return;
    }
    try {
      await api.createFeeType({
        code,
        name,
        description,
        amount: Number(amount),
        frequency,
        is_mandatory: isMandatory ? 1 : 0,
        due_day_of_month: Number(dueDay)
      });
      setIsAddModalOpen(false);
      loadFeeTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Master Tarif & Jenis Iuran
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi iuran bulanan wajib, dana sosial, kebersihan, dan kontribusi kegiatan RT
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Jenis Iuran
        </button>
      </div>

      {/* Fee Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-slate-400">
            Memuat daftar iuran...
          </div>
        ) : (
          feeTypes.map((ft) => (
            <div
              key={ft.id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {ft.code}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      ft.is_mandatory
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ft.is_mandatory ? 'Wajib' : 'Sukarela'}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                  {ft.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {ft.description || 'Tidak ada keterangan tambahan.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block">Besaran Tarif:</span>
                  <span className="text-xl font-bold font-mono-numbers text-slate-900">
                    {formatRupiah(ft.amount)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">
                    / {ft.frequency === 'monthly' ? 'bulan' : 'kegiatan'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Jatuh Tempo: Tgl {ft.due_day_of_month}</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Konfigurasi Jenis Iuran Baru"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Iuran</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: IPL-BLN"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Frekuensi Penagihan</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="monthly">Bulanan (Recurring)</option>
                <option value="one_time">Sekali Bayar (Insidental / Event)</option>
                <option value="voluntary">Sukarela (Donasi Bebas)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Iuran / Retribusi</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Iuran Pengelolaan Lingkungan Terpadu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nominal Tarif (Rp)</label>
              <input
                type="number"
                required
                min="0"
                step="5000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo Bulanan</label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi & Peruntukan</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian alokasi biaya..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isMandatory"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isMandatory" className="font-semibold text-slate-700 cursor-pointer">
              Iuran ini bersifat Wajib bagi seluruh rumah tangga aktif
            </label>
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
              Simpan Konfigurasi
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
