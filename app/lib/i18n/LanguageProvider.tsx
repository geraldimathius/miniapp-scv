'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Dictionary } from './index';

type LanguageContextType = {
  locale: string;
  dictionary: Dictionary;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  locale,
  dictionary,
}: {
  children: ReactNode;
  locale: string;
  dictionary: Dictionary;
}) {
  return (
    <LanguageContext.Provider value={{ locale, dictionary }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const t = (namespace: keyof Dictionary, key: string, params?: Record<string, string | number>) => {
    const dictNamespace = context.dictionary[namespace] as Record<string, string> | undefined;
    let translation = dictNamespace?.[key];
    
    if (!translation) return `${namespace}.${key}`;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translation = translation?.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    
    return translation;
  };

  return {
    t,
    locale: context.locale,
    dictionary: context.dictionary,
  };
}
