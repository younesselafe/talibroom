import { motion, useReducedMotion } from 'framer-motion'
import { MOROCCAN_CITIES } from '@/types'
import type { GenderEnum } from '@/types'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

export type SortKey = 'active' | 'premium' | 'newest'

const POPULAR_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir']

interface DiscoverFiltersProps {
  city: string
  gender: GenderEnum | 'all'
  sort: SortKey
  onCityChange: (value: string) => void
  onSortChange: (value: SortKey) => void
}

/**
 * The Discover filter bar — city, gender and sort controls plus quick city
 * chips. Search lives in DiscoverHero; this card carries everything else.
 */
export default function DiscoverFilters({
  city, gender, sort, onCityChange, onSortChange,
}: DiscoverFiltersProps) {
  const { t } = useLanguage()
  const reduceMotion = useReducedMotion()

  const SORT_LABELS: Record<SortKey, string> = {
    active:  t('disc.filters.sort_recent'),
    premium: t('disc.filters.sort_premium'),
    newest:  t('disc.filters.sort_newest'),
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="card space-y-4 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* City */}
        <div className="min-w-[150px] flex-1">
          <Select value={city} onValueChange={onCityChange}>
            <SelectTrigger aria-label={t('disc.filters.aria_city')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('disc.filters.all_cities')}</SelectItem>
              {MOROCCAN_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gender — locked to the signed-in user's own gender */}
        <div
          aria-label={t('disc.filters.aria_gender')}
          className="flex items-center gap-1.5 rounded-xl bg-sand-100 px-3 py-2 dark:bg-[#222D2B]"
        >
          <Lock size={13} className="text-sand-400 dark:text-sand-500" />
          <span className="text-sm font-semibold capitalize text-sand-700 dark:text-sand-300">
            {gender === 'all' ? t('disc.filters.everyone') : gender === 'male' ? t('groups.men') : t('groups.women')}
          </span>
        </div>

        {/* Sort */}
        <div className="min-w-[150px] flex-1 sm:max-w-[200px]">
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger aria-label={t('disc.filters.aria_sort')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick city chips */}
      <div className="hide-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1">
        <span className="flex-shrink-0 text-xs font-semibold text-sand-400">{t('disc.filters.popular')}</span>
        {POPULAR_CITIES.map((c) => {
          const selected = city === c
          return (
            <button
              key={c}
              type="button"
              aria-pressed={selected}
              onClick={() => onCityChange(selected ? 'all' : c)}
              className={cn(
                'flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50',
                selected
                  ? 'border-gold-400 bg-gold-400 text-gold-700'
                  : 'border-sand-200 text-sand-600 hover:border-gold-400 hover:text-gold-600 dark:border-[#2F3B39] dark:text-sand-300 dark:hover:text-gold-400',
              )}
            >
              {c}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
