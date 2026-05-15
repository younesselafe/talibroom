import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, MapPin, GraduationCap, Wallet, Heart, Check, SlidersHorizontal, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES } from '@/types'
import type { Profile, GenderEnum } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatPrice, formatRelativeTime, LIFESTYLE_LABELS } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

function lifestyleTags(p: Profile): string[] {
  const v = p.lifestyle_vec
  if (!v) return []
  const out: string[] = []
  if (v.sleep_time)  out.push(LIFESTYLE_LABELS[v.sleep_time])
  if (v.study_style) out.push(LIFESTYLE_LABELS[v.study_style])
  if (v.cleanliness) out.push(LIFESTYLE_LABELS[v.cleanliness])
  if (v.diet)        out.push(LIFESTYLE_LABELS[v.diet])
  return out.filter(Boolean)
}

function isOnline(p: Profile): boolean {
  if (!p.last_seen) return false
  return Date.now() - new Date(p.last_seen).getTime() < 1000 * 60 * 15
}

// ─── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ profile, onView }: { profile: Profile; onView: () => void }) {
  const [linked, setLinked] = useState(false)
  const tags = lifestyleTags(profile)

  const handleLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLinked(true)
    toast.success(`Link Up request sent to ${profile.full_name.split(' ')[0]} 🤝`)
  }

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6 }}
      onClick={onView}
      className="card cursor-pointer overflow-hidden group"
    >
      {/* Cover gradient */}
      <div className="h-20 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 relative">
        <div className="absolute inset-0 opacity-30"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {profile.is_premium && (
          <Badge variant="gold" className="absolute top-3 right-3 bg-white/90">
            <Sparkles size={11} /> Premium
          </Badge>
        )}
      </div>

      <div className="px-5 pb-5 -mt-9">
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name}
          size="lg"
          isOnline={isOnline(profile)}
          className="ring-4 ring-white dark:ring-[#1C1C1A]"
        />

        <div className="mt-3">
          <h3 className="font-bold text-sand-900 dark:text-white leading-tight">
            {profile.full_name}
          </h3>
          <p className="text-xs text-sand-400 mt-0.5">
            {isOnline(profile) ? 'Active now' : profile.last_seen ? `Seen ${formatRelativeTime(profile.last_seen)}` : 'Student'}
          </p>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-sand-600 dark:text-sand-300">
          {profile.university && (
            <p className="flex items-center gap-2">
              <GraduationCap size={14} className="text-primary-400 flex-shrink-0" />
              <span className="truncate">{profile.university}</span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <MapPin size={14} className="text-primary-400 flex-shrink-0" />
            {profile.city ?? 'Morocco'}
          </p>
          {profile.budget && (
            <p className="flex items-center gap-2">
              <Wallet size={14} className="text-primary-400 flex-shrink-0" />
              ~{formatPrice(profile.budget)} / month
            </p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="neutral">{t}</Badge>
            ))}
          </div>
        )}

        <motion.div whileTap={{ scale: 0.97 }} className="mt-4">
          <Button
            onClick={handleLink}
            disabled={linked}
            variant={linked ? 'secondary' : 'default'}
            className="w-full"
          >
            <AnimatePresence mode="wait" initial={false}>
              {linked ? (
                <motion.span key="done" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                             className="flex items-center gap-2">
                  <Check size={16} /> Request sent
                </motion.span>
              ) : (
                <motion.span key="link" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                             className="flex items-center gap-2">
                  <Heart size={16} /> Link Up
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const [cityFilter, setCityFilter]     = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<GenderEnum | 'all'>('all')
  const [showFilters, setShowFilters]   = useState(false)

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: api.getProfiles,
  })

  const filtered = useMemo(() => {
    if (!profiles) return []
    return profiles.filter((p) => {
      if (p.id === me?.id) return false
      if (cityFilter !== 'all' && p.city !== cityFilter) return false
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false
      return true
    })
  }, [profiles, me?.id, cityFilter, genderFilter])

  const activeFilters = (cityFilter !== 'all' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0)

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
              Discover roommates
            </h1>
            <p className="text-sand-500 dark:text-sand-400 mt-1">
              {isLoading ? 'Finding students near you…' : `${filtered.length} students looking for a place`}
            </p>
          </div>
          <Button
            variant={activeFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Filters {activeFilters > 0 && `(${activeFilters})`}
          </Button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="card p-4 mt-4 grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-sand-700 dark:text-sand-300">City</label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-sand-700 dark:text-sand-300">Gender</label>
                  <div className="flex gap-2">
                    {(['all', 'female', 'male'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        className={cn(
                          'flex-1 h-11 rounded-xl text-sm font-semibold capitalize transition-colors border',
                          genderFilter === g
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-sand-200 dark:border-[#3A3A36] text-sand-600 dark:text-sand-300 hover:bg-sand-100 dark:hover:bg-[#2A2A26]'
                        )}
                      >
                        {g === 'all' ? 'Everyone' : g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {cityFilter !== 'all' && (
              <Badge variant="default" className="gap-1.5 py-1 pl-2.5 pr-1.5">
                <MapPin size={11} /> {cityFilter}
                <button onClick={() => setCityFilter('all')} className="hover:bg-primary-200 rounded-full p-0.5">
                  <X size={11} />
                </button>
              </Badge>
            )}
            {genderFilter !== 'all' && (
              <Badge variant="default" className="gap-1.5 py-1 pl-2.5 pr-1.5 capitalize">
                {genderFilter}
                <button onClick={() => setGenderFilter('all')} className="hover:bg-primary-200 rounded-full p-0.5">
                  <X size={11} />
                </button>
              </Badge>
            )}
          </div>
        )}
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} variant="profile" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No students match your filters"
          description="Try widening your search to see more potential roommates."
          action={
            <Button variant="outline" onClick={() => { setCityFilter('all'); setGenderFilter('all') }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((p) => (
            <ProfileCard key={p.id} profile={p} onView={() => navigate(`/profile/${p.id}`)} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
