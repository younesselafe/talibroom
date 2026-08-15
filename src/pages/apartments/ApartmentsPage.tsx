import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, MapPin, BedDouble, Users, Sparkles, BadgeCheck, Play, Building2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES } from '@/types'
import type { Apartment, OwnerType } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import Lightbox from '@/components/shared/Lightbox'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PremiumBanner from '@/components/shared/PremiumBanner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { useLanguage } from '@/lib/LanguageContext'

// ─── Apartment card ────────────────────────────────────────────────────────────

function ApartmentCard({ apt, onClick }: { apt: Apartment; onClick: () => void }) {
  const { t } = useLanguage()
  const ownerName = apt.owner_type === 'realtor'
    ? apt.realtor?.agency_name ?? apt.realtor?.full_name ?? 'Realtor'
    : apt.student_owner?.full_name ?? 'Student'
  const verified = apt.owner_type === 'realtor' && apt.realtor?.verified
  const [lbIdx, setLbIdx] = useState<number | null>(null)
  const pics = apt.image_urls.filter(Boolean)

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer group"
    >
      {lbIdx !== null && pics.length > 0 && (
        <Lightbox
          images={pics}
          index={lbIdx}
          onClose={() => setLbIdx(null)}
          onNav={setLbIdx}
        />
      )}
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-sand-100 dark:bg-[#2A2A26]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (pics.length > 0) setLbIdx(0) }}
          className="absolute inset-0 w-full h-full"
          aria-label="View photos"
          tabIndex={-1}
        >
          <motion.img
            src={pics[0] ?? ''}
            alt={apt.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </button>
        {pics.length > 1 && (
          <span className="absolute bottom-10 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white pointer-events-none">
            {pics.length} {t('apt.photos')}
          </span>
        )}
        <div className="absolute inset-0 bg-card-gradient" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {(apt.is_premium || apt.student_owner?.is_premium) && (
            <Badge variant="gold" className="bg-white/95 backdrop-blur">
              <Sparkles size={11} /> Premium
            </Badge>
          )}
          {apt.video_url && (
            <Badge variant="neutral" className="bg-white/95 backdrop-blur">
              <Play size={11} /> Tour
            </Badge>
          )}
        </div>

        {/* Owner type chip */}
        <div className="absolute top-3 right-3">
          <Badge
            variant={apt.owner_type === 'realtor' ? 'blue' : 'green'}
            className="backdrop-blur"
          >
            {verified && <BadgeCheck size={11} />}
            {apt.owner_type === 'realtor' ? t('realtor_badge') : t('student')}
          </Badge>
        </div>

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <p className="text-white font-black text-xl drop-shadow">
            {formatPrice(apt.price)}
            <span className="text-xs font-medium text-white/80"> {t('apt.per_month')}</span>
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-sand-900 dark:text-white leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {apt.title}
        </h3>

        <div className="mt-2 flex items-center gap-3 text-sm text-sand-500 dark:text-sand-400">
          <span className="flex items-center gap-1">
            <MapPin size={14} className="text-primary-400" /> {apt.city}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble size={14} className="text-primary-400" /> {apt.rooms} {apt.rooms > 1 ? t('apt.rooms') : t('apt.room')}
          </span>
        </div>

        {/* Slots availability */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-sand-400 truncate max-w-[55%]">{ownerName}</span>
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-primary-400" />
            <span className="text-xs font-semibold text-sand-600 dark:text-sand-300">
              {apt.available_slots} of {apt.total_slots} left
            </span>
            <div className="flex gap-0.5 ml-1">
              {Array.from({ length: apt.total_slots }).map((_, i) => (
                <span
                  key={i}
                  className={
                    i < apt.available_slots
                      ? 'w-1.5 h-1.5 rounded-full bg-emerald-500'
                      : 'w-1.5 h-1.5 rounded-full bg-sand-300 dark:bg-[#3A3A36]'
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'all' | OwnerType

export default function ApartmentsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const canAccessRealtor = !!(me?.is_premium || me?.account_type === 'realtor')
  const [tab, setTab]               = useState<Tab>('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [priceMin, setPriceMin]     = useState<string>('any')
  const [priceMax, setPriceMax]     = useState<string>('any')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data: pages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // Include filter values in the key so TanStack Query fires a fresh page-1
    // request against Supabase whenever the user changes a filter.
    queryKey: ['apartments', 'browse', tab, cityFilter, priceMin, priceMax],
    queryFn: ({ pageParam }) => api.getApartmentsPage(
      pageParam,
      tab === 'all' ? undefined : tab,
      cityFilter === 'all' ? undefined : cityFilter,
      priceMin === 'any' ? null : Number(priceMin),
      priceMax === 'any' ? null : Number(priceMax),
    ),
    getNextPageParam: (lastPage) =>
      lastPage.length >= 20 ? lastPage.at(-1)?.created_at : undefined,
    initialPageParam: undefined as string | undefined,
  })

  const apartments = pages?.pages.flatMap((p) => p) ?? []

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.1 },
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const isRealtor = me?.account_type === 'realtor'

  const filtered = useMemo(() => {
    return apartments.filter((a) => {
      // Realtor accounts only see professional (realtor) listings.
      if (isRealtor && a.owner_type === 'student') return false
      // Realtor-owned listings are premium-gated for non-premium students.
      if (a.owner_type === 'realtor' && !canAccessRealtor) return false
      // Gender matching for student listings.
      if (a.owner_type === 'student' && me?.gender
          && a.student_owner?.gender !== me.gender) return false
      return true
    })
  }, [apartments, me?.gender, canAccessRealtor, isRealtor])

  return (
    <div className="page-container">
      <PremiumBanner />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            {t('apt.page_title')}
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            {isLoading ? t('apt.loading') : `${filtered.length} ${t('apt.homes_available')}`}
          </p>
        </div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={() => navigate('/apartments/new')}>
            <Plus size={18} /> {t('apt.list_place')}
          </Button>
        </motion.div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 flex items-center justify-between gap-3 flex-wrap"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="all"><Building2 size={14} /> {t('all')}</TabsTrigger>
            {canAccessRealtor && (
              <TabsTrigger value="realtor"><BadgeCheck size={14} /> {t('apt.verified_realtor')}</TabsTrigger>
            )}
            {!isRealtor && (
              <TabsTrigger value="student"><Users size={14} /> {t('student')}</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('apt.all_cities')}</SelectItem>
                {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Price range — filtered in SQL, not in the browser. */}
          <div className="w-32">
            <Select value={priceMin} onValueChange={setPriceMin}>
              <SelectTrigger aria-label={t('apt.price_min')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('apt.price_min')}</SelectItem>
                {[1000, 1500, 2000, 2500, 3000, 4000].map((p) => (
                  <SelectItem key={p} value={String(p)}>{p}+ MAD</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={priceMax} onValueChange={setPriceMax}>
              <SelectTrigger aria-label={t('apt.price_max')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('apt.price_max')}</SelectItem>
                {[1500, 2000, 2500, 3000, 4000, 6000].map((p) => (
                  <SelectItem key={p} value={String(p)}>≤ {p} MAD</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} variant="apartment" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏠"
          title={t('apt.empty_title')}
          description={t('apt.empty_desc')}
          action={<Button onClick={() => navigate('/apartments/new')}><Plus size={16} /> {t('createListing')}</Button>}
        />
      ) : (
        <>
          <motion.div
            key={`${tab}-${cityFilter}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((apt) => (
              <ApartmentCard key={apt.id} apt={apt} onClick={() => navigate(`/apartments/${apt.id}`)} />
            ))}
          </motion.div>
          <div ref={sentinelRef} className="h-2 mt-4" />
          {isFetchingNextPage && <SkeletonGrid count={3} variant="apartment" />}
        </>
      )}
    </div>
  )
}
