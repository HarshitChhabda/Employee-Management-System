import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    const saved = localStorage.getItem('theme-preference');
    return (saved === 'light' || saved === 'dark' || saved === 'auto') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme-preference', theme);
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      document.documentElement.classList.toggle('light', !prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.classList.toggle('light', theme === 'light');
    }
  }, [theme]);

  const themes = [
    { id: 'light' as const, icon: Sun, label: 'Light' },
    { id: 'dark' as const, icon: Moon, label: 'Dark' },
    { id: 'auto' as const, icon: Monitor, label: 'Auto' },
  ];

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl", className)}>
      {themes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300",
            theme === id
              ? "bg-[var(--accent-blue)] text-white shadow-md"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          )}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
