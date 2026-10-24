import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Terminal, Eye } from 'lucide-react';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { formatDateTimeIndo } from '../../utils/format';
import { Modal } from '../Common/Modal';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePayload, setActivePayload] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    (l.new_values && l.new_values.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Jejak Audit Sistem (Audit Trail)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan mutasi finansial, otorisasi pengeluaran, dan modifikasi data secara permanen & tak dapat diubah
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Segarkan Log
        </button>
      </div>

      {/* Search and Count */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aksi, nama user, payload..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-numbers">
          Tercatat {filteredLogs.length} Peristiwa Audit
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Waktu (WIB)</th>
                <th className="py-3 px-4 font-semibold">Pengguna / Eksekutor</th>
                <th className="py-3 px-4 font-semibold">Tindakan (Action)</th>
                <th className="py-3 px-4 font-semibold">Entitas Target</th>
                <th className="py-3 px-4 font-semibold">Alamat IP</th>
                <th className="py-3 px-4 font-semibold text-center">Payload Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Memuat log audit...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Tidak ditemukan catatan log audit.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {formatDateTimeIndo(log.created_at)}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                      {log.user_name}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      {log.new_values ? (
                        <button
                          onClick={() => setActivePayload(log.new_values || null)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Detail
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      <Modal
        isOpen={!!activePayload}
        onClose={() => setActivePayload(null)}
        title="Detail Payload Audit Log"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 text-[11px]">
            Data struktur JSON yang dikirimkan saat mutasi dicatat:
          </p>
          <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto font-mono text-xs leading-relaxed max-h-80">
            {activePayload ? JSON.stringify(JSON.parse(activePayload), null, 2) : ''}
          </pre>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setActivePayload(null)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
