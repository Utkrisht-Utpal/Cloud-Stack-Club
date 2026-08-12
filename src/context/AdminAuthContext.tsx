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

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('csc_admin_logged_in') === 'true';
  });
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('csc_admin_email') || null;
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (isAdminLoggedIn) {
      sessionStorage.setItem('csc_admin_logged_in', 'true');
      if (adminEmail) sessionStorage.setItem('csc_admin_email', adminEmail);
    } else {
      sessionStorage.removeItem('csc_admin_logged_in');
      sessionStorage.removeItem('csc_admin_email');
    }
  }, [isAdminLoggedIn, adminEmail]);

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
          return true;
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, testing admin fallback rules:', err);
      }
    }

    // 2. Official Central Admin Credentials & Rules:
    // Admin Email format: cloudstack@cuchd.in or any @cuchd.in admin or user ID "admin"
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
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAdminLoggedIn(false);
    setAdminEmail(null);
    setShowDashboard(false);
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const openAdminModal = () => setIsAdminModalOpen(true);
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
