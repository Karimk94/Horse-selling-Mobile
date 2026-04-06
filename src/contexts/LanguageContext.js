import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import translations from '../i18n/translations';

const LANGUAGE_KEY = '@steedmarket_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'ar') {
          setLanguageState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (lang !== 'en' && lang !== 'ar') return;
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  }, [language, setLanguage]);

  // Translation function — supports plain strings and function-valued entries
  const t = useCallback(
    (key, ...args) => {
      const entry = translations[language]?.[key] ?? translations.en?.[key];
      if (entry === undefined) return key;
      if (typeof entry === 'function') return entry(...args);
      return entry;
    },
    [language]
  );

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
