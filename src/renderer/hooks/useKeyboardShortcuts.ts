import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave: () => void;
  onNavigateDay: (offset: number) => void;
  onNewTask: () => void;
  onToggleCommandPalette: () => void;
  onFocusSection: (section: 'log' | 'tasks' | 'plan') => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 's') { e.preventDefault(); handlers.onSave(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); handlers.onNavigateDay(-1); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); handlers.onNavigateDay(1); }
      if (e.altKey && e.key === 'k') { e.preventDefault(); handlers.onToggleCommandPalette(); }
      if (e.altKey && e.key === 't') { e.preventDefault(); handlers.onNewTask(); }
      if (e.altKey && e.key === '1') { e.preventDefault(); handlers.onFocusSection('log'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); handlers.onFocusSection('tasks'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); handlers.onFocusSection('plan'); }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlers]);
}
