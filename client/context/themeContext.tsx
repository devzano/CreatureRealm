import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'theme';
type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  isDarkMode: boolean;
  mode: ThemeMode;
  toggleTheme: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved);
        }
      } catch {
        // Silently ignore storage errors
      }
    })();
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // optional: revert state or report error
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    await setMode(next);
  }, [mode, setMode]);

  const value: ThemeContextValue = {
    isDarkMode: mode === 'dark',
    mode,
    toggleTheme,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
