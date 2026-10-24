import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Building2, ShieldAlert, LogIn } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/format';
import { LoginModal } from '../Common/LoginModal';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.saveSettings(settings);
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Pengaturan Organisasi & Kebijakan Kas RT/RW
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Identitas organisasi, susunan kepengurusan, jatuh tempo penagihan, dan ambang batas otorisasi
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pengaturan organisasi berhasil disimpan ke database.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Identity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Identitas Lembaga Komunitas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Organisasi Rukun Tetangga</label>
              <input
                type="text"
                value={settings.rt_name || 'RT 004 / RW 012 Taman Graha Asri'}
                onChange={(e) => handleChange('rt_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Kontak Pengurus / Hotline</label>
              <input
                type="text"
                value={settings.contact_phone || '0812-3456-7890'}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Board Members */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Susunan Pengurus Inti RT (Penandatangan Dokumen & Kwitansi Sah)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Ketua RT</label>
              <input
                type="text"
                value={settings.rt_head_name || 'Ir. H. Budi Santoso'}
                onChange={(e) => handleChange('rt_head_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Bendahara RT</label>
              <input
                type="text"
                value={settings.treasurer_name || 'Siti Rahmawati, S.E.'}
                onChange={(e) => handleChange('treasurer_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Sekretaris RT</label>
              <input
                type="text"
                value={settings.secretary_name || 'Ahmad Fauzi, M.Kom.'}
                onChange={(e) => handleChange('secretary_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Policy & Rules */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Kebijakan Penagihan & Ambang Batas Otorisasi Belanja
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Default Jatuh Tempo Iuran Bulanan
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={settings.default_due_day || '10'}
                onChange={(e) => handleChange('default_due_day', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Contoh: tanggal 10 setiap bulan kalender
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambang Batas Otorisasi Belanja Ketua RT (Rp)
              </label>
              <input
                type="number"
                min="100000"
                step="100000"
                value={settings.approval_threshold_idr || '500000'}
                onChange={(e) => handleChange('approval_threshold_idr', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pengeluaran di atas nominal ini wajib disetujui Ketua RT sebelum saldo kas terpotong
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          {isAdmin ? (
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogIn className="w-4 h-4 text-slate-600" />
              Login Admin untuk Simpan Pengaturan
            </button>
          )}
        </div>
      </form>

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
