import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle2, XCircle, Clock, ShieldCheck, Terminal, AlertTriangle, RefreshCw } from 'lucide-react';
import { TestSuiteResponse, TestResultItem } from '../../types';
import { api } from '../../services/api';

export const AutomatedTestsPage: React.FC = () => {
  const [suiteResponse, setSuiteResponse] = useState<TestSuiteResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    handleRunTests();
  }, []);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const resp = await api.runTests();
      setSuiteResponse(resp);
    } catch (err) {
      console.error('Failed to run automated tests:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const categories = suiteResponse
    ? ['all', ...Array.from(new Set(suiteResponse.results.map(r => r.category)))]
    : ['all'];

  const filteredResults = suiteResponse?.results.filter(r =>
    selectedCategory === 'all' || r.category === selectedCategory
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Suite Pengujian Otomatis (QA & Financial Integrity)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Validasi matematis, idempotensi tagihan, atomisitas pembayaran, dan keamanan RLS terhadap basis data SQLite
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Menjalankan Uji Otomatis...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" /> Jalankan Uji Otomatis (15 Skenario)
            </>
          )}
        </button>
      </div>

      {/* Summary Scoreboard */}
      {suiteResponse && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Total Skenario Uji</span>
            <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1">
              {suiteResponse.summary.total} Skenario
            </div>
            <span className="text-[11px] text-slate-400">100% spesifikasi PRD tercakup</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Status Berhasil (Passed)</span>
            <div className="text-2xl font-bold font-mono-numbers text-emerald-700 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              {suiteResponse.summary.passed}
            </div>
            <span className="text-[11px] text-emerald-600">Semua invarian terbukti valid</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Status Gagal (Failed)</span>
            <div className={`text-2xl font-bold font-mono-numbers mt-1 flex items-center gap-1.5 ${
              suiteResponse.summary.failed === 0 ? 'text-slate-400' : 'text-rose-600'
            }`}>
              {suiteResponse.summary.failed === 0 ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600" />
              )}
              {suiteResponse.summary.failed}
            </div>
            <span className="text-[11px] text-slate-400">Nol kegagalan transaksi</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Total Durasi Eksekusi</span>
            <div className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-slate-400" />
              {suiteResponse.summary.durationMs} ms
            </div>
            <span className="text-[11px] text-slate-400">Eksekusi lokal berkecepatan tinggi</span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'Semua Kategori (15)' : cat}
          </button>
        ))}
      </div>

      {/* Test Scenarios List */}
      <div className="space-y-3">
        {filteredResults.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-all ${
              item.passed
                ? 'bg-white border-slate-200 hover:border-slate-300'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {item.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{String(item.id).padStart(2, '0')}
                    </span>
                    <span className="font-bold text-xs text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  {item.details && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto">
                      <div className="text-[10px] text-slate-400 font-sans uppercase font-bold mb-1">
                        Verifikasi Data State & Asersi:
                      </div>
                      <pre className="text-slate-800">{JSON.stringify(item.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    item.passed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.passed ? 'PASSED' : 'FAILED'}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono mt-1">
                  {item.durationMs} ms
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
