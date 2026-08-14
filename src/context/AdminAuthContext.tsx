import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminEmail: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  isAdminModalOpen: boolean;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const getInitialAdminLoggedIn = (): boolean => {
  return (
    localStorage.getItem('csc_admin_logged_in') === 'true' ||
    sessionStorage.getItem('csc_admin_logged_in') === 'true'
  );
};

const getInitialAdminEmail = (): string | null => {
  return (
    localStorage.getItem('csc_admin_email') ||
    sessionStorage.getItem('csc_admin_email') ||
    null
  );
};

const getInitialShowDashboard = (): boolean => {
  const saved = localStorage.getItem('csc_show_dashboard') || sessionStorage.getItem('csc_show_dashboard');
  if (saved !== null) {
    return saved === 'true';
  }
  return getInitialAdminLoggedIn();
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(getInitialAdminLoggedIn);
  const [adminEmail, setAdminEmail] = useState<string | null>(getInitialAdminEmail);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState<boolean>(getInitialShowDashboard);

  useEffect(() => {
    if (isAdminLoggedIn) {
      localStorage.setItem('csc_admin_logged_in', 'true');
      sessionStorage.setItem('csc_admin_logged_in', 'true');
      if (adminEmail) {
        localStorage.setItem('csc_admin_email', adminEmail);
        sessionStorage.setItem('csc_admin_email', adminEmail);
      }
    } else {
      localStorage.removeItem('csc_admin_logged_in');
      sessionStorage.removeItem('csc_admin_logged_in');
      localStorage.removeItem('csc_admin_email');
      sessionStorage.removeItem('csc_admin_email');
      localStorage.removeItem('csc_show_dashboard');
      sessionStorage.removeItem('csc_show_dashboard');
      setShowDashboard(false);
    }
  }, [isAdminLoggedIn, adminEmail]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      localStorage.setItem('csc_show_dashboard', showDashboard ? 'true' : 'false');
      sessionStorage.setItem('csc_show_dashboard', showDashboard ? 'true' : 'false');
    }
  }, [showDashboard, isAdminLoggedIn]);

  const login = async (emailInput: string, passwordInput: string): Promise<boolean> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

        if (!error && data.user) {
          setIsAdminLoggedIn(true);
          setAdminEmail(data.user.email || cleanEmail);
          setShowDashboard(true);
          setIsAdminModalOpen(false);
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          return true;
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, testing admin fallback rules:', err);
      }
    }

    // 2. Official Central Admin Credentials & Rules:
    const isValidAdminId = 
      cleanEmail === 'cloudstack@cuchd.in' || 
      cleanEmail === 'admin' || 
      cleanEmail === 'utkrishtutpal1@gmail.com' ||
      cleanEmail.endsWith('@cuchd.in');

    const isValidPassword = 
      cleanPass === 'admin' || 
      cleanPass === 'cloudstack2026' || 
      cleanPass === 'admin123' ||
      cleanPass === 'cloudstack';

    if (isValidAdminId && isValidPassword) {
      const activeEmail = cleanEmail.includes('@') ? cleanEmail : 'cloudstack@cuchd.in';
      setIsAdminLoggedIn(true);
      setAdminEmail(activeEmail);
      setShowDashboard(true);
      setIsAdminModalOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAdminLoggedIn(false);
    setAdminEmail(null);
    setShowDashboard(false);
    localStorage.removeItem('csc_admin_logged_in');
    sessionStorage.removeItem('csc_admin_logged_in');
    localStorage.removeItem('csc_admin_email');
    sessionStorage.removeItem('csc_admin_email');
    localStorage.removeItem('csc_show_dashboard');
    sessionStorage.removeItem('csc_show_dashboard');
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const openAdminModal = () => {
    if (isAdminLoggedIn) {
      setShowDashboard(true);
      setIsAdminModalOpen(false);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const closeAdminModal = () => setIsAdminModalOpen(false);

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminLoggedIn,
        adminEmail,
        login,
        logout,
        openAdminModal,
        closeAdminModal,
        isAdminModalOpen,
        showDashboard,
        setShowDashboard,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
