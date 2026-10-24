import React from 'react';

interface BadgeProps {
  status: string;
  type?: 'invoice' | 'transaction' | 'household' | 'general';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, type = 'general' }) => {
  let label = status;
  let textClass = 'text-slate-600 bg-slate-100';

  // Invoice statuses
  if (status === 'paid') {
    label = 'Lunas';
    textClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200/60';
  } else if (status === 'unpaid') {
    label = 'Belum Lunas';
    textClass = 'text-amber-700 bg-amber-50 border border-amber-200/60';
  } else if (status === 'partially_paid') {
    label = 'Sebagian';
    textClass = 'text-sky-700 bg-sky-50 border border-sky-200/60';
  } else if (status === 'overdue') {
    label = 'Jatuh Tempo';
    textClass = 'text-rose-700 bg-rose-50 border border-rose-200/60';
  } else if (status === 'canceled') {
    label = 'Dibatalkan';
    textClass = 'text-slate-500 bg-slate-100 border border-slate-200/60';
  }

  // Transaction statuses
  else if (status === 'submitted') {
    label = 'Menunggu Persetujuan';
    textClass = 'text-amber-700 bg-amber-50 border border-amber-200/60';
  } else if (status === 'approved') {
    label = 'Disetujui';
    textClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200/60';
  } else if (status === 'rejected') {
    label = 'Ditolak';
    textClass = 'text-rose-700 bg-rose-50 border border-rose-200/60';
  } else if (status === 'reversed') {
    label = 'Dibalikkan (Reversed)';
    textClass = 'text-purple-700 bg-purple-50 border border-purple-200/60';
  } else if (status === 'active') {
    label = 'Aktif';
    textClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200/60';
  } else if (status === 'inactive' || status === 'moved_out') {
    label = status === 'moved_out' ? 'Pindah' : 'Non-Aktif';
    textClass = 'text-slate-500 bg-slate-100 border border-slate-200/60';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textClass}`}>
      {label}
    </span>
  );
};
