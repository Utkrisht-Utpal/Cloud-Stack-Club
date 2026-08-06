import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'cloud_stack_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Only restore from localStorage if the user has explicitly made a choice before.
    // On first visit (nothing stored), always start in dark mode.
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'dark'; // First-time default → always dark
  });

  // Apply the class to <html> and persist ONLY if this is a user-initiated change.
  // The `userChose` ref tracks whether we should write to localStorage.
  const userChoseRef = React.useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Persist only after the user has explicitly toggled
    if (userChoseRef.current) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

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
