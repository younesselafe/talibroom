import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES } from '@/types'
import type { GenderEnum, Profile } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { staggerContainer } from '@/components/ui/motion'
import DiscoverHero from './DiscoverHero'
import ProfileCard, { isProfileOnline } from './ProfileCard'

type SortKey = 'active' | 'premium' | 'newest'

const SORT_LABELS: Record<SortKey, string> = {
  active:  'Recently active',
  premium: 'Premium first',
  newest:  'Newest members',
}

const POPULAR_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir']

const lastSeenMs = (p: Profile) => (p.last_seen ? new Date(p.last_seen).getTime() : 0)

// ─── Active-filter chip ──────────────────────────────────────────────────────

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/25 dark:text-primary-300">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 transition-colors hover:bg-primary-200/70 dark:hover:bg-primary-800/50"
      >
        <X size={11} />
      </button>
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const reduceMotion = useReducedMotion()

  const [search, setSearch]             = useState('')
  const [cityFilter, setCityFilter]     = useState('all')
  const [genderFilter, setGenderFilter] = useState<GenderEnum | 'all'>('all')
  const [sort, setSort]                 = useState<SortKey>('active')

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: api.getProfiles,
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
      // 'active' — online first, then most recently seen.
      const onlineDelta = Number(isProfileOnline(b)) - Number(isProfileOnline(a))
      return onlineDelta !== 0 ? onlineDelta : lastSeenMs(b) - lastSeenMs(a)
    })
  }, [others, cityFilter, genderFilter, search, sort])

  const activeCount =
    (cityFilter !== 'all' ? 1 : 0) +
    (genderFilter !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0)

  const clearAll = () => {
    setSearch('')
    setCityFilter('all')
    setGenderFilter('all')
  }

  return (
    <div className="page-container space-y-6">
      <DiscoverHero
        search={search}
        onSearchChange={setSearch}
        totalStudents={stats.total}
        cityCount={stats.cities}
        onlineCount={stats.online}
      />

      {/* Filter bar */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="card space-y-4 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* City */}
          <div className="min-w-[150px] flex-1">
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger aria-label="Filter by city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {MOROCCAN_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div
            role="radiogroup"
            aria-label="Filter by gender"
            className="flex items-center gap-1 rounded-xl bg-sand-100 p-1 dark:bg-[#2A2A26]"
          >
            {(['all', 'female', 'male'] as const).map((g) => {
              const selected = genderFilter === g
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setGenderFilter(g)}
                  className={cn(
                    'h-9 rounded-lg px-3.5 text-sm font-semibold capitalize transition-colors',
                    selected
                      ? 'bg-white text-primary-600 shadow-sm dark:bg-[#1C1C1A] dark:text-primary-400'
                      : 'text-sand-500 hover:text-sand-800 dark:text-sand-400 dark:hover:text-sand-200',
                  )}
                >
                  {g === 'all' ? 'Everyone' : g}
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <div className="min-w-[150px] flex-1 sm:max-w-[200px]">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label="Sort students">
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
          <span className="flex-shrink-0 text-xs font-semibold text-sand-400">Popular</span>
          {POPULAR_CITIES.map((c) => {
            const selected = cityFilter === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={selected}
                onClick={() => setCityFilter(selected ? 'all' : c)}
                className={cn(
                  'flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  selected
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-sand-200 text-sand-600 hover:border-primary-300 hover:text-primary-600 dark:border-[#3A3A36] dark:text-sand-300 dark:hover:text-primary-400',
                )}
              >
                {c}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-sand-500 dark:text-sand-400">
            {isLoading ? (
              'Finding students near you…'
            ) : (
              <>
                <span className="font-bold text-sand-800 dark:text-sand-200">
                  {filtered.length}
                </span>{' '}
                {filtered.length === 1 ? 'student' : 'students'} found
              </>
            )}
          </p>

          {activeCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {search.trim() && (
                <FilterChip label={`“${search.trim()}”`} onClear={() => setSearch('')} />
              )}
              {cityFilter !== 'all' && (
                <FilterChip label={cityFilter} onClear={() => setCityFilter('all')} />
              )}
              {genderFilter !== 'all' && (
                <FilterChip label={genderFilter} onClear={() => setGenderFilter('all')} />
              )}
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <SkeletonGrid count={8} variant="profile" className="xl:grid-cols-4" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeCount > 0 ? '🔍' : '🏠'}
            title={activeCount > 0 ? 'No students match your filters' : 'No students yet'}
            description={
              activeCount > 0
                ? 'Try widening your search — clear a filter or two to see more potential roommates.'
                : 'Check back soon — new students join MoRoom every day.'
            }
            action={
              activeCount > 0 ? (
                <Button variant="outline" onClick={clearAll}>
                  Clear all filters
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
                onView={() => navigate(`/profile/${p.id}`)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
