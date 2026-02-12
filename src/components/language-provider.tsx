'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { AppLanguage, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '@/lib/i18n-config';
import { FR_TRANSLATIONS } from '@/lib/translations';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'fr' ? 'fr' : DEFAULT_LANGUAGE;
  });

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string, fallback?: string) => {
        if (language === 'fr') {
          return FR_TRANSLATIONS[key] || fallback || key;
        }
        return fallback || key;
      },
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
