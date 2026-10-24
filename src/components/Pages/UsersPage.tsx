import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, CheckCircle2, Lock, LogIn, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoginModal } from '../Common/LoginModal';

export const UsersPage: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const roleDescriptions: Record<UserRole, { title: string; color: string; desc: string }> = {
    super_admin: {
      title: 'Administrator RT',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      desc: 'Hak akses penuh: kelola kas, transaksi, hapus/edit data, terbitkan kwitansi'
    },
    ketua_rt: {
      title: 'Ketua RT / RW',
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      desc: 'Otorisasi belanja kas, monitoring laporan, dan pengawasan kas'
    },
    bendahara: {
      title: 'Bendahara Kas',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      desc: 'Pencatatan kas dan alokasi pembayaran iuran warga'
    },
    warga: {
      title: 'Warga / Pengunjung',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      desc: 'Mode Hanya-Lihat: transparansi kas, tagihan, dan unduh kwitansi'
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-950">Kebijakan Hak Akses & Keamanan Sistem</h4>
            <p className="text-emerald-800 mt-0.5">
              Fitur login dikhususkan hanya untuk <strong>Administrator RT</strong> (username: <code className="bg-white px-1 py-0.5 rounded border border-emerald-300 font-bold">admin</code>, password: <code className="bg-white px-1 py-0.5 rounded border border-emerald-300 font-bold">gph1172</code>). Pengguna lain berada dalam mode Hanya-Lihat tanpa izin menambah, mengedit, atau menghapus data.
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="shrink-0 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            Login Admin Sekarang
          </button>
        ) : (
          <span className="shrink-0 px-3 py-1.5 bg-emerald-200/80 text-emerald-900 font-bold rounded-lg text-xs border border-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            Admin Aktif
          </span>
        )}
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Daftar Pengguna & Struktur Wewenang
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Daftar akun pengurus dan warga terdaftar dalam database Rukun Tetangga 004/RW 012
        </p>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(roleDescriptions) as [UserRole, any][]).map(([r, info]) => (
          <div key={r} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${info.color}`}>
              {info.title}
            </span>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{info.desc}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Nama Pengguna</th>
                <th className="py-3 px-4 font-semibold">Email / Username</th>
                <th className="py-3 px-4 font-semibold">Tingkat Peran</th>
                <th className="py-3 px-4 font-semibold">Nomor Telepon</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Akses Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const info = roleDescriptions[u.role] || { title: u.role, color: 'bg-slate-100 text-slate-800' };
                  const isCurrent = currentUser?.id === u.id;
                  const isAdminUser = u.role === 'super_admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.name}
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              Sesi Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {u.id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {isAdminUser ? 'admin (admin@kaswarga.id)' : u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${info.color}`}>
                          {info.title}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.phone || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAdminUser ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Diizinkan (gph1172)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Hanya Lihat (Tanpa Login)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Login Admin Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
