import { useLanguage } from '@/lib/LanguageContext'
import type { Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const LANGS: { code: Lang; label: string; script: string }[] = [
  { code: 'ar', label: 'العربية', script: 'ع' },
  { code: 'fr', label: 'Français',  script: 'FR' },
  { code: 'en', label: 'English',   script: 'EN' },
]

interface Props {
  variant?: 'row' | 'full'
  className?: string
}

export default function LanguageSelector({ variant = 'row', className }: Props) {
  const { lang, setLang } = useLanguage()

  if (variant === 'full') {
    return (
      <div className={cn('grid grid-cols-3 gap-2', className)}>
        {LANGS.map(({ code, label, script }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            aria-label={label}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-2xl border-2 py-3 transition-colors',
              lang === code
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-sand-200 text-sand-500 hover:border-primary-300 dark:border-[#3A3A36] dark:text-sand-400',
            )}
          >
            <span className="text-lg font-black">{script}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // 'row' variant — compact pill strip (ع | FR | EN)
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border border-sand-200 dark:border-[#2F3B39] p-0.5',
        className,
      )}
      dir="ltr"
    >
      {LANGS.map(({ code, script, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          aria-label={label}
          className={cn(
            'flex h-7 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors',
            lang === code
              ? 'bg-primary-500 text-white'
              : 'text-sand-500 hover:text-sand-700 dark:text-sand-400 dark:hover:text-sand-200',
          )}
        >
          {script}
        </button>
      ))}
    </div>
  )
}
