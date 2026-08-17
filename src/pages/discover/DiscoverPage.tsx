import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Rocket, Heart, UserRound } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { GenderEnum, Profile } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { staggerContainer } from '@/components/ui/motion'
import DiscoverHero from './DiscoverHero'
import DiscoverFilters, { type SortKey } from './DiscoverFilters'
import ProfileCard, { isProfileOnline } from './ProfileCard'
import PremiumBanner from '@/components/shared/PremiumBanner'
import PremiumUpsellBanner from '@/components/shared/PremiumUpsellBanner'
import { useLanguage } from '@/lib/LanguageContext'
import { FEATURES } from '@/lib/featureFlags'

function ConciergeBanner() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (!FEATURES.concierge || me?.is_premium || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 p-4 shadow-md"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 text-amber-800 hover:text-amber-900"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white shadow">
            <Rocket size={20} />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className="font-black text-amber-900 text-sm">{t('disc.cta_title')}</p>
            <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
              {t('disc.cta_desc')}
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 transition-colors"
            >
              {t('disc.cta_btn')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

const lastSeenMs = (p: Profile) => (p.last_seen ? new Date(p.last_seen).getTime() : 0)

/** Nudge shown to users who skipped onboarding — without city + gender they
 *  are near-invisible in matching and their results are unfiltered. */
function CompleteProfileBanner() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const navigate = useNavigate()

  if (!me || (me.city && me.gender)) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900/40 dark:bg-primary-900/15">
      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-primary-500 text-white">
        <UserRound size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-primary-800 dark:text-primary-200">{t('disc.complete_title')}</p>
        <p className="mt-0.5 text-xs text-primary-700 dark:text-primary-300">{t('disc.complete_desc')}</p>
      </div>
      <button
        onClick={() => navigate('/profile')}
        className="flex-shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 transition-colors"
      >
        {t('disc.complete_btn')}
      </button>
    </div>
  )
}

// ─── Active-filter chip ──────────────────────────────────────────────────────

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/25 dark:text-primary-300">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 transition-colors hover:bg-primary-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:bg-primary-800/50"
      >
        <X size={11} />
      </button>
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const reduceMotion = useReducedMotion()

  const queryClient = useQueryClient()
  const [search, setSearch]         = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [sort, setSort]             = useState<SortKey>('active')
  const [savedOnly, setSavedOnly]   = useState(false)
  // Locked to the user's own gender — roommate matching is always same-gender.
  const genderFilter = (me?.gender ?? 'all') as GenderEnum | 'all'

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles', genderFilter],
    // Gender narrowing happens server-side — less data, no PII overfetch.
    queryFn: () => api.getProfiles(genderFilter !== 'all' ? { gender: genderFilter } : undefined),
  })

  // Persistent shortlist (favorites table) with an optimistic toggle.
  const { data: savedIds = new Set<string>() } = useQuery({
    queryKey: ['favorites', 'profile'],
    queryFn: () => api.getFavoriteIds('profile'),
  })
  const toggleSave = useMutation({
    mutationFn: (p: { id: string; saved: boolean }) =>
      p.saved ? api.removeFavorite('profile', p.id) : api.addFavorite('profile', p.id),
    onMutate: async (p) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'profile'] })
      const prev = queryClient.getQueryData<Set<string>>(['favorites', 'profile'])
      const next = new Set(prev ?? [])
      if (p.saved) next.delete(p.id); else next.add(p.id)
      queryClient.setQueryData(['favorites', 'profile'], next)
      return { prev }
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['favorites', 'profile'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites', 'profile'] }),
  })

  // Everyone except the signed-in user.
  const others = useMemo(
    () => (profiles ?? []).filter((p) => p.id !== me?.id),
    [profiles, me?.id],
  )

  // Headline stats — based on the full pool, not the filtered view.
  const stats = useMemo(() => {
    if (!profiles) return { total: null, cities: null, online: null }
    return {
      total: others.length,
      cities: new Set(others.map((p) => p.city).filter(Boolean)).size,
      online: others.filter(isProfileOnline).length,
    }
  }, [profiles, others])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = others.filter((p) => {
      if (savedOnly && !savedIds.has(p.id)) return false
      if (cityFilter !== 'all' && p.city !== cityFilter) return false
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false
      if (q && !`${p.full_name} ${p.university ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })

    return list.sort((a, b) => {
      if (sort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sort === 'premium') {
        if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1
        return lastSeenMs(b) - lastSeenMs(a)
      }
      // 'active' — premium first, then online, then most recently seen.
      if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1
      const onlineDelta = Number(isProfileOnline(b)) - Number(isProfileOnline(a))
      return onlineDelta !== 0 ? onlineDelta : lastSeenMs(b) - lastSeenMs(a)
    })
  }, [others, cityFilter, genderFilter, search, sort, savedOnly, savedIds])

  const activeCount =
    (cityFilter !== 'all' ? 1 : 0) +
    (savedOnly ? 1 : 0) +
    (search.trim() ? 1 : 0)

  const clearAll = () => {
    setSearch('')
    setCityFilter('all')
    setSavedOnly(false)
  }

  return (
    <div className="page-container space-y-6">
      <PremiumBanner />
      <PremiumUpsellBanner />
      <CompleteProfileBanner />
      <ConciergeBanner />
      <DiscoverHero
        search={search}
        onSearchChange={setSearch}
        totalStudents={stats.total}
        cityCount={stats.cities}
        onlineCount={stats.online}
      />

      <DiscoverFilters
        city={cityFilter}
        gender={genderFilter}
        sort={sort}
        onCityChange={setCityFilter}
        onSortChange={setSort}
      />

      {/* Results */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-sand-500 dark:text-sand-400" aria-live="polite">
            {isLoading ? (
              t('disc.loading')
            ) : (
              <>
                <span className="font-bold text-sand-800 dark:text-sand-200">
                  {filtered.length}
                </span>{' '}
                {filtered.length === 1 ? t('disc.count_singular') : t('disc.count_plural')}
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {/* Persistent shortlist filter */}
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly((v) => !v)}
              className={
                savedOnly
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-gold-700'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-sand-200 px-3 py-1 text-xs font-semibold text-sand-600 hover:border-gold-400 hover:text-gold-600 dark:border-[#2F3B39] dark:text-sand-300 transition-colors'
              }
            >
              <Heart size={12} className={savedOnly ? 'fill-current' : undefined} />
              {t('disc.saved_only')}{savedIds.size > 0 ? ` (${savedIds.size})` : ''}
            </button>

            {activeCount > 0 && (
              <>
              {search.trim() && (
                <FilterChip label={`“${search.trim()}”`} onClear={() => setSearch('')} />
              )}
              {cityFilter !== 'all' && (
                <FilterChip label={cityFilter} onClear={() => setCityFilter('all')} />
              )}

              <button
                type="button"
                onClick={clearAll}
                className="rounded text-xs font-semibold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-300"
              >
                {t('disc.clear_all')}
              </button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <SkeletonGrid count={8} variant="roommate" className="xl:grid-cols-4" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeCount > 0 ? '🔍' : '🏠'}
            title={activeCount > 0 ? t('disc.empty_filter_title') : t('disc.empty_title')}
            description={
              activeCount > 0
                ? t('disc.empty_filter_desc')
                : t('disc.empty_desc')
            }
            action={
              activeCount > 0 ? (
                <Button variant="outline" onClick={clearAll}>
                  {t('disc.clear_filters')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial={reduceMotion ? false : 'initial'}
            animate="animate"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                viewer={me}
                saved={savedIds.has(p.id)}
                onToggleSave={() => toggleSave.mutate({ id: p.id, saved: savedIds.has(p.id) })}
                onView={() => navigate(`/profile/${p.id}`)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
