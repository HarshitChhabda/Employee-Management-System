import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
}

const shortcuts: Shortcut[] = [
  { key: 'd', ctrlKey: true, action: () => window.location.hash = '#/', description: 'Dashboard' },
  { key: 'e', ctrlKey: true, action: () => window.location.hash = '#/employees', description: 'Employees' },
  { key: 'a', ctrlKey: true, action: () => window.location.hash = '#/attendance-excel', description: 'Attendance' },
  { key: 'l', ctrlKey: true, action: () => window.location.hash = '#/letters', description: 'Letters' },
  { key: 's', ctrlKey: true, action: () => window.location.hash = '#/settings', description: 'Settings' },
  { key: 'p', ctrlKey: true, action: () => window.location.hash = '#/pl-management', description: 'PL Management' },
  { key: 'r', ctrlKey: true, action: () => window.location.hash = '#/attendance-report', description: 'Reports' },
  { key: 'k', ctrlKey: true, action: () => {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
    searchInput?.focus();
  }, description: 'Focus Search' },
  { key: 'Escape', action: () => {
    const activeModal = document.querySelector('[role="dialog"]');
    if (activeModal) {
      const closeBtn = activeModal.querySelector('button[aria-label="Close"], button.close') as HTMLButtonElement;
      closeBtn?.click();
    }
  }, description: 'Close Modal' },
];

export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    for (const shortcut of shortcuts) {
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!event.ctrlKey === !!shortcut.ctrlKey &&
        !!event.shiftKey === !!shortcut.shiftKey &&
        !!event.altKey === !!shortcut.altKey
      ) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export { shortcuts };
