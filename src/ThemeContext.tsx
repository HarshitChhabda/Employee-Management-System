import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, ThemeColors, themes } from './theme.config';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    
    // Sync with html class list
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Map theme colors to CSS variables for tailwind / global css usage
    const colors = themes[mode];
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--bg-card', colors.bgCard);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border-primary', colors.borderPrimary);
    root.style.setProperty('--border-secondary', colors.borderSecondary);
    
    // Bridge to standard design tokens (--background, --foreground, --card, --border)
    root.style.setProperty('--background', colors.bgPrimary);
    root.style.setProperty('--foreground', colors.textPrimary);
    root.style.setProperty('--card', colors.bgCard);
    root.style.setProperty('--card-foreground', colors.textPrimary);
    root.style.setProperty('--border', colors.borderPrimary);
    root.style.setProperty('--text-muted', colors.textSecondary);
    root.style.setProperty('--bg-hover', colors.bgHover);
    root.style.setProperty('--surface', colors.bgSecondary);
    root.style.setProperty('--surface-2', colors.bgTertiary);

    // Dynamic Pro Max Accent Bindings
    root.style.setProperty('--accent-blue', colors.accentBlue);
    root.style.setProperty('--accent-green', colors.accentGreen);
    root.style.setProperty('--accent-red', colors.accentRed);
    root.style.setProperty('--accent-purple', colors.accentPurple);
    root.style.setProperty('--accent-orange', colors.accentOrange);
    root.style.setProperty('--gradient-primary', colors.gradientPrimary);
    root.style.setProperty('--gradient-secondary', colors.gradientSecondary);
    root.style.setProperty('--glass-effect', colors.glassEffect);
    root.style.setProperty('--shadow-glow', colors.shadowGlow);
  }, [mode]);

  const value = {
    mode,
    toggleTheme,
    colors: themes[mode],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};