import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'cloud_stack_theme_preference';

/**
 * Resolves the initial theme:
 * 1. Checks localStorage for previously loaded/chosen theme ('dark' | 'light').
 * 2. If none exists, falls back to the user's OS/system theme preference (prefers-color-scheme).
 * 3. Defaults to 'light' if media queries are unsupported.
 */
const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    console.warn('Could not read stored theme preference:', err);
  }
  return 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const userChoseRef = useRef(false);

  // Apply classes to documentElement and persist theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    try {
      // Store loaded/chosen theme preference
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.warn('Could not save theme preference:', err);
    }
  }, [theme]);

  // Dynamically respond to OS/system theme changes if user hasn't explicitly set a preference in this session
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // If user hasn't explicitly chosen a theme during this session and no stored preference exists
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored && !userChoseRef.current) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    userChoseRef.current = true;
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    userChoseRef.current = true;
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

