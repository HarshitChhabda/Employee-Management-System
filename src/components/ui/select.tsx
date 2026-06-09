// components/ui/Select.tsx
import React from 'react';
import { useTheme } from '../../ThemeContext';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ 
  children, 
  ...props 
}) => {
  const { colors } = useTheme();
  
  return (
    <select
      className="px-3 py-2 rounded-lg border outline-none transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg hover:border-[var(--border-secondary)] cursor-pointer"
      style={{
        backgroundColor: colors.bgTertiary,
        borderColor: colors.borderSecondary,
        color: colors.textPrimary
      }}
      {...props}
    >
      {children}
    </select>
  );
};
