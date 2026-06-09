// components/ui/Card.tsx
import React from 'react';
import { useTheme } from '../../ThemeContext';

export const Card: React.FC<{ children: React.ReactNode; className?: string; hoverable?: boolean }> = ({ 
  children, 
  className = '',
  hoverable = false
}) => {
  const { colors } = useTheme();
  
  return (
    <div 
      className={`rounded-xl border p-4 transition-all duration-300 ${hoverable ? 'hover:shadow-2xl hover:border-[var(--border-secondary)] hover:-translate-y-1 cursor-pointer' : ''} ${className}`}
      style={{ 
        backgroundColor: colors.bgCard,
        borderColor: colors.borderPrimary,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {children}
    </div>
  );
};
