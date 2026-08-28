import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity logout
const STORAGE_KEY_SHOW_DASHBOARD = 'csc_admin_dashboard_active';
const STORAGE_KEY_LAST_ACTIVITY = 'csc_admin_last_activity';

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
  // Synchronous initialization from localStorage with 5-minute inactivity check
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY) || '0', 10);
      const isExpired = !lastActivity || Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
      if (isExpired) return false;
      return localStorage.getItem(STORAGE_KEY_SHOW_DASHBOARD) === 'true';
    } catch {
      return false;
    }
  });

  const [showDashboard, setShowDashboard] = useState<boolean>(() => {
    try {
      const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY) || '0', 10);
      const isExpired = !lastActivity || Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
      if (isExpired) {
        localStorage.removeItem(STORAGE_KEY_SHOW_DASHBOARD);
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
        return false;
      }
      return localStorage.getItem(STORAGE_KEY_SHOW_DASHBOARD) === 'true';
    } catch {
      return false;
    }
  });

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastActivityRef = useRef<number>(Date.now());

  // Record user activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    setIsAdminLoggedIn(false);
    setAdminEmail(null);
    setShowDashboard(false);
    setIsAdminModalOpen(false);

    try {
      localStorage.removeItem(STORAGE_KEY_SHOW_DASHBOARD);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
      sessionStorage.removeItem('csc_show_dashboard');
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Notice signing out of Supabase:', err);
      }
    }
  }, []);

  // 1. Sync showDashboard changes to localStorage
  useEffect(() => {
    try {
      if (showDashboard && isAdminLoggedIn) {
        localStorage.setItem(STORAGE_KEY_SHOW_DASHBOARD, 'true');
        recordActivity();
      } else if (!showDashboard) {
        localStorage.removeItem(STORAGE_KEY_SHOW_DASHBOARD);
      }
    } catch {}
  }, [showDashboard, isAdminLoggedIn, recordActivity]);

  // 2. 5-Minute Inactivity Tracker (listens to mouse, keyboard, touch, scroll, click)
  useEffect(() => {
    if (!isAdminLoggedIn && !showDashboard) return;

    // Track user interaction (throttled to at most once per 2 seconds)
    let lastThrottled = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottled > 2000) {
        lastThrottled = now;
        recordActivity();
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Periodic check every 5 seconds for inactivity timeout
    const inactivityInterval = setInterval(() => {
      const last = lastActivityRef.current;
      if (Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
        console.warn('Admin session expired due to 5 minutes of inactivity.');
        logout();
      }
    }, 5000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(inactivityInterval);
    };
  }, [isAdminLoggedIn, showDashboard, recordActivity, logout]);

  // 3. Initialize and listen to Supabase Auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // Check existing session on startup
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session check notice:', error.message);
        }

        // Check if inactive
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY) || '0', 10);
        const isInactive = !lastActivity || Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;

        if (session?.user && !isInactive) {
          setIsAdminLoggedIn(true);
          setAdminEmail(session.user.email || null);
          const wasActive = localStorage.getItem(STORAGE_KEY_SHOW_DASHBOARD) === 'true';
          if (wasActive) {
            setShowDashboard(true);
          }
          recordActivity();
        } else if (isInactive && session?.user) {
          // Auto logout on startup if inactive for > 5 min
          logout();
        } else {
          setIsAdminLoggedIn(false);
          setAdminEmail(null);
          setShowDashboard(false);
          try {
            localStorage.removeItem(STORAGE_KEY_SHOW_DASHBOARD);
            localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Session retrieval error:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Subscribe to live auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAdminLoggedIn(true);
        setAdminEmail(session.user.email || null);
        if (event === 'SIGNED_IN') {
          setShowDashboard(true);
          try {
            localStorage.setItem(STORAGE_KEY_SHOW_DASHBOARD, 'true');
          } catch {}
          recordActivity();
        }
      } else {
        setIsAdminLoggedIn(false);
        setAdminEmail(null);
        setShowDashboard(false);
        try {
          localStorage.removeItem(STORAGE_KEY_SHOW_DASHBOARD);
          localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
        } catch {}
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [logout, recordActivity]);

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
        recordActivity();
        setIsAdminLoggedIn(true);
        setAdminEmail(data.user.email || cleanEmail);
        setShowDashboard(true);
        setIsAdminModalOpen(false);
        try {
          localStorage.setItem(STORAGE_KEY_SHOW_DASHBOARD, 'true');
        } catch {}
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

  const openAdminModal = () => {
    // Check if inactivity timeout has elapsed
    const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY) || '0', 10);
    const isInactive = !lastActivity || Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;

    if (isInactive && isAdminLoggedIn) {
      logout();
      setIsAdminModalOpen(true);
      return;
    }

    if (isAdminLoggedIn) {
      recordActivity();
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
