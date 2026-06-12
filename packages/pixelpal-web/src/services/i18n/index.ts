import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../locales/en.json';
import zh from '../../locales/zh.json';

// Get saved language from localStorage (matches store key)
const getSavedLanguage = (): string => {
  try {
    const stored = localStorage.getItem('pixelpal-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.language || 'zh';
    }
  } catch {
    // ignore
  }
  return 'zh';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

/**
 * Change the app language and persist to store
 */
export const changeLanguage = async (lang: 'en' | 'zh'): Promise<void> => {
  await i18n.changeLanguage(lang);
  // Also persist to zustand store
  try {
    const stored = localStorage.getItem('pixelpal-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.state = parsed.state || {};
      parsed.state.language = lang;
      parsed.version = 0; // Ensure version is set for zustand persist
      localStorage.setItem('pixelpal-storage', JSON.stringify(parsed));
    }
  } catch {
    // ignore persistence errors
  }
};
