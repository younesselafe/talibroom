import { motion, useReducedMotion } from 'framer-motion'
import { Search, Sparkles, Users, MapPin, Zap, type LucideIcon } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface DiscoverHeroProps {
  search: string
  onSearchChange: (value: string) => void
  totalStudents: number | null
  cityCount: number | null
  onlineCount: number | null
}

function HeroStat({
  icon: Icon, value, label,
}: { icon: LucideIcon; value: number | null; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm ring-1 ring-white/10 backdrop-blur-sm">
      <Icon size={15} className="text-gold-400" aria-hidden />
      <span className="font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-white/65">{label}</span>
    </div>
  )
}

export default function DiscoverHero({
  search, onSearchChange, totalStudents, cityCount, onlineCount,
}: DiscoverHeroProps) {
  const reduceMotion = useReducedMotion()
  const { t, isRTL } = useLanguage()

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-hero-gradient text-white shadow-card-lg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Atmosphere */}
      <div aria-hidden className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-mint-400/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-28 right-4 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div aria-hidden className="absolute inset-0 bg-dot-grid text-white/[0.07]" />

      <div className="relative px-6 py-9 sm:px-10 sm:py-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-400 ring-1 ring-gold-400/30 backdrop-blur-sm">
          <Sparkles size={13} className="text-gold-400" aria-hidden />
          {t('hero.badge')}
        </span>

        {/* Title — each line wrapped independently so bidi doesn't displace
            punctuation when Arabic strings flow RTL and Latin stays LTR. */}
        <h1 className="mt-4 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          <span className="block">{t('hero.titleLine1')}</span>
          <span className="block text-white/70">{t('hero.titleLine2')}</span>
        </h1>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
          {t('hero.subtitle')}
        </p>

        {/* Search */}
        <div className="relative mt-6 max-w-md">
          <Search
            size={18}
            aria-hidden
            className={isRTL ? 'absolute right-4 top-1/2 -translate-y-1/2 text-white/60' : 'absolute left-4 top-1/2 -translate-y-1/2 text-white/60'}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('hero.searchPlaceholder')}
            aria-label={t('hero.searchPlaceholder')}
            className={isRTL
              ? 'h-12 w-full rounded-xl border border-white/15 bg-white/10 pr-11 pl-4 text-sm text-white placeholder:text-white/55 backdrop-blur-md transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/40'
              : 'h-12 w-full rounded-xl border border-white/15 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/55 backdrop-blur-md transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/40'
            }
          />
        </div>

        {/* Stats */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <HeroStat icon={Users} value={totalStudents} label={t('hero.studentsCount')} />
          <HeroStat icon={MapPin} value={cityCount}    label={t('hero.citiesCount')} />
          <HeroStat icon={Zap}   value={onlineCount}  label={t('hero.onlineCount')} />
        </div>
      </div>
    </motion.section>
  )
}
