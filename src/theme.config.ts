// theme.config.ts
export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  borderPrimary: string;
  borderSecondary: string;
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  accentPurple: string;
  accentOrange: string;
  gradientPrimary: string;
  gradientSecondary: string;
  glassEffect: string;
  shadowGlow: string;
}

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: {
    bgPrimary: '#030712',
    bgSecondary: '#0B1120',
    bgTertiary: '#151F32',
    bgCard: 'rgba(11, 17, 32, 0.7)',
    bgHover: 'rgba(21, 31, 50, 0.85)',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    borderPrimary: 'rgba(148, 163, 184, 0.1)',
    borderSecondary: 'rgba(148, 163, 184, 0.2)',
    accentBlue: '#60A5FA',
    accentGreen: '#34D399',
    accentRed: '#F87171',
    accentPurple: '#C084FC',
    accentOrange: '#FB923C',
    gradientPrimary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)',
    gradientSecondary: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    glassEffect: 'rgba(11, 17, 32, 0.7) backdrop-blur-2xl',
    shadowGlow: '0 0 60px rgba(59, 130, 246, 0.12), 0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  light: {
    bgPrimary: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    bgCard: 'rgba(255, 255, 255, 0.75)',
    bgHover: 'rgba(241, 245, 249, 0.9)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    borderPrimary: 'rgba(15, 23, 42, 0.08)',
    borderSecondary: 'rgba(15, 23, 42, 0.15)',
    accentBlue: '#2563eb',
    accentGreen: '#16a34a',
    accentRed: '#dc2626',
    accentPurple: '#9333ea',
    accentOrange: '#ea580c',
    gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradientSecondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glassEffect: 'rgba(255, 255, 255, 0.75) backdrop-blur-xl',
    shadowGlow: '0 0 40px rgba(37, 99, 235, 0.1)',
  }
};