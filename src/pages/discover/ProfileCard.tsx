import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, GraduationCap, MapPin, Wallet, Heart, Star } from 'lucide-react'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import ImageCarousel from '@/components/shared/ImageCarousel'
import CharacterAvatar from '@/components/shared/CharacterAvatar'
import {
  cn, formatBudgetShort, formatRelativeTime, shortUniversity, LIFESTYLE_LABELS,
} from '@/lib/utils'
import { compatibilityScore, compatibilityTone } from '@/lib/compat'
import { staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

const ONLINE_WINDOW_MS = 1000 * 60 * 15

/** A profile counts as "online" if it was last seen within the last 15 minutes. */
export function isProfileOnline(p: Profile): boolean {
  return !!p.last_seen && Date.now() - new Date(p.last_seen).getTime() < ONLINE_WINDOW_MS
}

/** Up to four human-readable lifestyle tags from a profile's lifestyle vector. */
function lifestyleTags(p: Profile): string[] {
  const v = p.lifestyle_json
  if (!v) return []
  const out: string[] = []
  for (const key of [v.sleep_time, v.study_style, v.cleanliness, v.diet]) {
    const label = key ? LIFESTYLE_LABELS[key] : undefined
    if (label) out.push(label)
  }
  return out
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** One cell of the 3-column key-facts grid. */
function Stat({ icon: Icon, label, value, title }: {
  icon: typeof Wallet
  label: string
  value: string
  title?: string
}) {
  return (
    <div className="rounded-lg bg-sand-50 px-2 py-2 text-center dark:bg-[#222D2B]">
      <Icon size={14} className="mx-auto text-primary-400" aria-hidden />
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-sand-400">
        {label}
      </p>
      <p
        title={title ?? value}
        className="truncate text-sm font-bold text-sand-900 dark:text-white"
      >
        {value}
      </p>
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: Profile
  /** The signed-in user — used to compute the compatibility score. */
  viewer?: Profile | null
  /** Persisted shortlist state — lives in the favorites table, not local state. */
  saved: boolean
  onToggleSave: () => void
  onView: () => void
}

export default function ProfileCard({ profile, viewer, saved, onToggleSave, onView }: ProfileCardProps) {
  const { t } = useLanguage()
  const reduceMotion = useReducedMotion()

  const online = isProfileOnline(profile)
  const tags = lifestyleTags(profile)
  const match = compatibilityScore(viewer, profile)
  const tone = compatibilityTone(match)
  const firstName = profile.full_name.split(' ')[0]

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    toast.success(
      !saved ? `${t('disc.card.saved_toast')} ${firstName}` : `${t('disc.card.unsaved_toast')} ${firstName}`,
    )
    onToggleSave()
  }

  // Overlay layered on the photo: lifestyle tags (top-left), match score (top-right).
  const overlay = (
    <>
      <div className="absolute left-3 top-3 flex max-w-[62%] flex-wrap gap-1.5">
        {profile.is_premium && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-[#4d3a00] shadow-sm">
            <Sparkles size={11} aria-hidden /> {t('disc.card.premium')}
          </span>
        )}
        {tags.slice(0, profile.is_premium ? 1 : 2).map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-sand-700 backdrop-blur-sm dark:bg-[#16201E]/80 dark:text-sand-100"
          >
            {t}
          </span>
        ))}
      </div>

      <div
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-xs font-bold text-sand-800 shadow-sm backdrop-blur-sm dark:bg-[#16201E]/88 dark:text-sand-100"
        aria-label={`${match} percent compatibility`}
      >
        <Star
          size={13}
          aria-hidden
          className={cn(
            tone === 'high' ? 'text-gold-500' : 'text-primary-500',
          )}
          fill="currentColor"
        />
        {match}{t('disc.card.match')}
      </div>
    </>
  )

  return (
    <motion.article
      variants={staggerItem}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl',
        'border border-sand-100 bg-white dark:border-[#27302E] dark:bg-[#16201E]',
        'shadow-card transition-shadow duration-300 hover:shadow-card-md',
      )}
    >
      {profile.avatar_url ? (
        <ImageCarousel
          images={[profile.avatar_url]}
          alt={profile.full_name}
          className="h-56"
          overlay={overlay}
        />
      ) : (
        <div className="relative h-56 overflow-hidden">
          <CharacterAvatar gender={profile.gender} lifestyle={profile.lifestyle_json} className="h-full w-full" />
          {overlay}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {/* Identity */}
        <h3 className="truncate font-bold leading-tight text-sand-900 dark:text-white">
          {profile.full_name}
        </h3>
        <p
          className={cn(
            'mt-0.5 text-xs font-medium',
            online ? 'text-mint-600 dark:text-mint-400' : 'text-sand-400',
          )}
        >
          {online
            ? t('disc.card.active_now')
            : profile.last_seen
              ? `${t('disc.card.seen')} ${formatRelativeTime(profile.last_seen)}`
              : t('student')}
        </p>

        {/* Key facts */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat
            icon={Wallet}
            label={t('disc.card.budget')}
            value={profile.budget ? `${formatBudgetShort(profile.budget)} MAD` : '—'}
            title={profile.budget ? `${profile.budget} MAD / month` : undefined}
          />
          <Stat
            icon={GraduationCap}
            label={t('disc.card.school')}
            value={profile.university ? shortUniversity(profile.university) : '—'}
            title={profile.university ?? undefined}
          />
          <Stat
            icon={MapPin}
            label={t('disc.card.city')}
            value={profile.city ?? t('disc.card.morocco')}
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button onClick={onView} className="flex-1">
            {t('disc.card.view')}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${firstName} from shortlist` : `Save ${firstName} to shortlist`}
            className={cn(
              'h-11 w-11 flex-shrink-0 px-0',
              saved &&
                'border-gold-400 bg-gold-400/20 text-gold-600 hover:bg-gold-400/30 dark:text-gold-400',
            )}
          >
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Heart size={18} className={cn(saved && 'fill-current')} aria-hidden />
            </motion.span>
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
