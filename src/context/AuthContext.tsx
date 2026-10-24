import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, OrganizationalUnit, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  unit: OrganizationalUnit | null;
  isLoading: boolean;
  isAdmin: boolean;
  loginAdmin: (username: string, password: string) => Promise<void>;
  logoutAdmin: () => void;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  can: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [unit, setUnit] = useState<OrganizationalUnit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('kas_warga_is_admin') === 'true';
  });

  const initAuth = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMe();
      setUser(data.user);
      setUnit(data.unit);
      const isActuallyAdmin = data.user.role === 'super_admin' || (data.user as any).isAdmin === true;
      setIsAdmin(isActuallyAdmin);
      if (isActuallyAdmin) {
        localStorage.setItem('kas_warga_is_admin', 'true');
        localStorage.setItem('kas_warga_user_id', data.user.id);
      }
    } catch (e) {
      console.error('Failed to init auth:', e);
      // Fallback guest viewer
      setUser({
        id: 'usr-guest',
        email: 'warga@kaswarga.id',
        name: 'Warga / Pengunjung',
        role: 'warga',
        phone: '-',
        unit_id: 'unit-rt004',
        household_id: 'hh-03',
        is_active: 1
      });
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const loginAdmin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem('kas_warga_is_admin', 'true');
      localStorage.setItem('kas_warga_user_id', data.user.id);
      setUser({ ...data.user, isAdmin: true } as any);
      setUnit(data.unit);
      setIsAdmin(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('kas_warga_is_admin');
    localStorage.removeItem('kas_warga_user_id');
    setIsAdmin(false);
    setUser({
      id: 'usr-guest',
      email: 'warga@kaswarga.id',
      name: 'Warga / Pengunjung (Mode Lihat)',
      role: 'warga',
      phone: '-',
      unit_id: 'unit-rt004',
      household_id: 'hh-03',
      is_active: 1
    });
  };

  const login = async (username: string, password?: string) => {
    return loginAdmin(username, password || '');
  };

  const logout = () => {
    logoutAdmin();
  };

  // Rule: Only Admin has write permissions (add, edit, delete, approve, transfer)
  // Non-admin can only view
  const can = (action: string): boolean => {
    if (isAdmin || user?.role === 'super_admin') {
      return true;
    }

    // View-only permissions granted to everyone
    if (
      action.startsWith('view_') ||
      action === 'see_dashboard' ||
      action === 'see_reports' ||
      action === 'download_receipt' ||
      action === 'see_receipt'
    ) {
      return true;
    }

    // All modification / write operations are strictly admin-only
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        unit,
        isLoading,
        isAdmin,
        loginAdmin,
        logoutAdmin,
        login,
        logout,
        can
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
