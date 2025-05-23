
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Locale } from '@/lib/translations';
import { getTranslation } from '@/lib/translations';

interface LanguageContextType {
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Locale>('en');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('appLanguage') as Locale | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'es')) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (lang: Locale) => {
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
