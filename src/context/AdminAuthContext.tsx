import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminEmail: string | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  isAdminModalOpen: boolean;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and listen to Supabase Auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // 1. Check existing session on startup
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error fetching Supabase auth session:', error);
        }
        if (session?.user) {
          setIsAdminLoggedIn(true);
          setAdminEmail(session.user.email || null);
          const savedDashboardPref = sessionStorage.getItem('csc_show_dashboard');
          if (savedDashboardPref === 'true') {
            setShowDashboard(true);
          }
        } else {
          setIsAdminLoggedIn(false);
          setAdminEmail(null);
          setShowDashboard(false);
        }
      })
      .catch((err) => {
        console.warn('Session retrieval error:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Subscribe to live auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAdminLoggedIn(true);
        setAdminEmail(session.user.email || null);
        if (event === 'SIGNED_IN') {
          setShowDashboard(true);
          sessionStorage.setItem('csc_show_dashboard', 'true');
        }
      } else {
        setIsAdminLoggedIn(false);
        setAdminEmail(null);
        setShowDashboard(false);
        sessionStorage.removeItem('csc_show_dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync showDashboard to session storage
  useEffect(() => {
    if (isAdminLoggedIn) {
      sessionStorage.setItem('csc_show_dashboard', showDashboard ? 'true' : 'false');
    } else {
      sessionStorage.removeItem('csc_show_dashboard');
    }
  }, [showDashboard, isAdminLoggedIn]);

  // Secure Supabase Auth Login
  const login = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured. Please check your environment variables.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Invalid email or password. Access denied.',
        };
      }

      if (data?.user) {
        setIsAdminLoggedIn(true);
        setAdminEmail(data.user.email || cleanEmail);
        setShowDashboard(true);
        setIsAdminModalOpen(false);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return { success: true };
      }

      return { success: false, error: 'Authentication failed. Please try again.' };
    } catch (err: unknown) {
      console.error('Supabase authentication error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred during authentication.';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    setIsAdminLoggedIn(false);
    setAdminEmail(null);
    setShowDashboard(false);
    sessionStorage.removeItem('csc_show_dashboard');
    localStorage.removeItem('csc_admin_logged_in');
    localStorage.removeItem('csc_admin_email');
    localStorage.removeItem('csc_show_dashboard');

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out of Supabase:', err);
      }
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
        isLoading,
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
