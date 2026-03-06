import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    window.api.getSetting('theme').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeState(val);
      }
    }).catch(console.error);
    window.api.getSystemTheme().then(setSystemDark).catch(console.error);
    const cleanup = window.api.onThemeChanged(setSystemDark);
    return cleanup;
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    window.api.setSetting({ key: 'theme', value: mode });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
