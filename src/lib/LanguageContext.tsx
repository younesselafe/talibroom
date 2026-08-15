import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import i18n, { type Lang } from './i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, unknown>) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key as string,
  isRTL: false,
})

// Apply direction + lang attributes to <html> so:
//   • CSS logical properties (margin-inline-start, etc.) flip automatically
//   • Tailwind's rtl: variant activates
//   • The browser bidi algorithm uses per-element direction — ASCII punctuation
//     in translated Arabic strings stays at the correct edge instead of migrating
//     to the wrong side of the line.
function applyDocumentDir(lang: Lang) {
  const isRTL = lang === 'ar'
  const html = document.documentElement
  html.lang = lang
  html.dir = isRTL ? 'rtl' : 'ltr'
  // Override any stale text-align so punctuation doesn't migrate in bidi runs.
  html.style.textAlign = isRTL ? 'right' : 'left'
}

// Run once at module-load so the very first paint already has the right direction
// (avoids a flash of LTR layout on Arabic users).
applyDocumentDir(i18n.language as Lang)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(i18n.language as Lang)
  const isRTL = lang === 'ar'

  const setLang = (l: Lang) => {
    // Update i18next first — it notifies all useTranslation() subscribers.
    i18n.changeLanguage(l)
    localStorage.setItem('talibroom_lang', l)
    setLangState(l)
    applyDocumentDir(l)
  }

  // Keep document direction in sync if the lang ever changes outside setLang.
  useEffect(() => {
    applyDocumentDir(lang)
  }, [lang])

  const t = (key: string, vars?: Record<string, unknown>): string =>
    i18n.t(key, vars) as string

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
