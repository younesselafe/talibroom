import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import ar from '../locales/ar.json'

export type Lang = 'en' | 'fr' | 'ar'

// Flat keys (all root-level string keys in the JSON)
type FlatKey = Exclude<keyof typeof en, 'hero' | 'sidebar'>
// Nested key paths
type HeroKey = `hero.${keyof typeof en.hero}`
type SidebarKey = `sidebar.${keyof typeof en.sidebar}`
export type TranslationKey = FlatKey | HeroKey | SidebarKey

const STORAGE_KEY = 'talibroom_lang'

function getSavedLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'fr' || saved === 'ar' ? saved : 'en'
  } catch {
    return 'en'
  }
}

i18n
  .use(initReactI18next)
  .init({
    lng: getSavedLang(),
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
