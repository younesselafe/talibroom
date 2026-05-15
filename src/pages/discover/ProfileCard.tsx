import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Sparkles, MapPin, GraduationCap, Wallet, Heart, Check, ArrowUpRight,
} from 'lucide-react'
import type { Profile } from '@/types'
import Avatar from '@/components/shared/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatPrice, formatRelativeTime, LIFESTYLE_LABELS } from '@/lib/utils'
import { staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

const ONLINE_WINDOW_MS = 1000 * 60 * 15

/** A profile counts as "online" if it was last seen within the last 15 minutes. */
export function isProfileOnline(p: Profile): boolean {
  if (!p.last_seen) return false
  return Date.now() - new Date(p.last_seen).getTime() < ONLINE_WINDOW_MS
}

function lifestyleTags(p: Profile): string[] {
  const v = p.lifestyle_vec
  if (!v) return []
  const out: string[] = []
  for (const key of [v.sleep_time, v.study_style, v.cleanliness, v.diet]) {
    const label = key ? LIFESTYLE_LABELS[key] : undefined
    if (label) out.push(label)
  }
  return out
}

interface ProfileCardProps {
  profile: Profile
  onView: () => void
}

export default function ProfileCard({ profile, onView }: ProfileCardProps) {
  const [linked, setLinked] = useState(false)
  const reduceMotion = useReducedMotion()
  const tags = lifestyleTags(profile)
  const online = isProfileOnline(profile)
  const firstName = profile.full_name.split(' ')[0]

  const handleLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (linked) return
    setLinked(true)
    toast.success(`Link Up request sent to ${firstName} 🤝`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView()
    }
  }

  return (
    <motion.article
      variants={staggerItem}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onView}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`View ${profile.full_name}'s profile`}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl',
        'border border-sand-100 bg-white dark:border-[#2A2A26] dark:bg-[#1C1C1A]',
        'shadow-card transition-shadow duration-300 hover:shadow-card-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg]',
      )}
    >
      {/* Cover */}
      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600">
        <div aria-hidden className="absolute -right-7 -top-10 h-28 w-28 rounded-full bg-mint-400/45 blur-2xl" />
        <div aria-hidden className="absolute inset-0 bg-dot-grid text-white/25" />
        {profile.is_premium && (
          <Badge variant="gold" className="absolute right-3 top-3 bg-white/95 shadow-sm">
            <Sparkles size={11} /> Premium
          </Badge>
        )}
        <span
          aria-hidden
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
        >
          <ArrowUpRight size={15} />
        </span>
      </div>

      <div className="-mt-9 px-5 pb-5">
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name}
          size="lg"
          isOnline={online}
          className="ring-4 ring-white dark:ring-[#1C1C1A]"
        />

        <div className="mt-3">
          <h3 className="font-bold leading-tight text-sand-900 dark:text-white">
            {profile.full_name}
          </h3>
          <p
            className={cn(
              'mt-0.5 text-xs font-medium',
              online ? 'text-mint-600 dark:text-mint-400' : 'text-sand-400',
            )}
          >
            {online
              ? '● Active now'
              : profile.last_seen
                ? `Seen ${formatRelativeTime(profile.last_seen)}`
                : 'Student'}
          </p>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-sand-600 dark:text-sand-300">
          {profile.university && (
            <p className="flex items-center gap-2">
              <GraduationCap size={14} className="flex-shrink-0 text-primary-400" />
              <span className="truncate">{profile.university}</span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <MapPin size={14} className="flex-shrink-0 text-primary-400" />
            {profile.city ?? 'Morocco'}
          </p>
          {profile.budget && (
            <p className="flex items-center gap-2">
              <Wallet size={14} className="flex-shrink-0 text-primary-400" />
              ~{formatPrice(profile.budget)}
              <span className="text-sand-400">/ month</span>
            </p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="neutral">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <motion.div whileTap={reduceMotion ? undefined : { scale: 0.97 }} className="mt-4">
          <Button
            onClick={handleLink}
            disabled={linked}
            variant={linked ? 'secondary' : 'default'}
            aria-label={
              linked
                ? `Link Up request already sent to ${firstName}`
                : `Send a Link Up request to ${firstName}`
            }
            className={cn(
              'w-full',
              linked &&
                'bg-mint-100 text-mint-700 hover:bg-mint-100 disabled:opacity-100 dark:bg-mint-500/15 dark:text-mint-300',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {linked ? (
                <motion.span
                  key="done"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check size={16} /> Request sent
                </motion.span>
              ) : (
                <motion.span
                  key="link"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <Heart size={16} /> Link Up
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>
    </motion.article>
  )
}
