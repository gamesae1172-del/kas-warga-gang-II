import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('gph1172');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin(username.trim(), password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal login sebagai admin. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('gph1172');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-3 backdrop-blur-xs border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <h3 className="text-lg font-bold">Login Khusus Administrator</h3>
            <p className="text-xs text-emerald-100/90 mt-1">
              Hak akses pengeditan, penambahan kas, dan penerbitan kwitansi hanya untuk Administrator.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick credentials hint */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Kredensial Resmi Admin:
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] underline font-medium text-emerald-700 hover:text-emerald-900"
                >
                  Isi Otomatis
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                Username: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-bold">admin</code>
                {'  '}•{'  '}
                Password: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-bold">gph1172</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              * Pengunjung atau warga yang tidak login tetap dapat memantau transparansi kas, tagihan, dan mengunduh kwitansi dalam mode Hanya-Lihat.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {loading ? 'Memverifikasi...' : 'Masuk Sebagai Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
