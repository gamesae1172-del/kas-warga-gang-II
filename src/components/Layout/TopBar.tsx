import React, { useState, useEffect } from 'react';
import { Bell, Menu, Shield, User as UserIcon, CheckCircle2, AlertCircle, Building2, LogIn, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationItem } from '../../types';
import { api } from '../../services/api';
import { LoginModal } from '../Common/LoginModal';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  currentPageTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileSidebar, currentPageTitle }) => {
  const { user, unit, isAdmin, logoutAdmin } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 lg:px-6 py-2.5 backdrop-blur-xs no-print">
        {/* Zone 1: Mobile toggle & Breadcrumb Trail */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 truncate">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 shrink-0">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{unit?.name || 'RT 004 / RW 012'}</span>
            </div>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900 truncate">{currentPageTitle}</span>
          </div>
        </div>

        {/* Zone 2: Mode Badge & Admin Auth & Notification */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Indicator: Admin vs Hanya Lihat */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                <span>Admin Kas RT (Akses Penuh)</span>
              </span>
              <button
                onClick={logoutAdmin}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                title="Keluar dari akun admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Mode Hanya-Lihat</span>
              </span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            </div>
          )}

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Pemberitahuan"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-xl ring-1 ring-black/5 z-50 border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-900">Pemberitahuan Kas RT</span>
                  <span className="text-[11px] text-slate-500 font-mono-numbers">{unreadCount} baru</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${n.type === 'urgent' ? 'text-rose-600' : 'text-amber-600'}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};
