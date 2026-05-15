import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, MapPin, BedDouble, Users, Sparkles, BadgeCheck, Play, Building2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { MOROCCAN_CITIES } from '@/types'
import type { Apartment, OwnerType } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'

// ─── Apartment card ────────────────────────────────────────────────────────────

function ApartmentCard({ apt, onClick }: { apt: Apartment; onClick: () => void }) {
  const ownerName = apt.owner_type === 'realtor'
    ? apt.realtor?.agency_name ?? apt.realtor?.full_name ?? 'Realtor'
    : apt.student_owner?.full_name ?? 'Student'
  const verified = apt.owner_type === 'realtor' && apt.realtor?.verified

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-sand-100 dark:bg-[#2A2A26]">
        <motion.img
          src={apt.image_url ?? ''}
          alt={apt.title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-card-gradient" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {apt.is_premium && (
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
            {apt.owner_type === 'realtor' ? 'Realtor' : 'Student'}
          </Badge>
        </div>

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <p className="text-white font-black text-xl drop-shadow">
            {formatPrice(apt.price)}
            <span className="text-xs font-medium text-white/80"> / mo</span>
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
            <BedDouble size={14} className="text-primary-400" /> {apt.rooms} {apt.rooms > 1 ? 'rooms' : 'room'}
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
  const navigate = useNavigate()
  const [tab, setTab]               = useState<Tab>('all')
  const [cityFilter, setCityFilter] = useState('all')

  const { data: apartments, isLoading } = useQuery({
    queryKey: ['apartments'],
    queryFn: api.getApartments,
  })

  const filtered = useMemo(() => {
    if (!apartments) return []
    return apartments.filter((a) => {
      if (tab !== 'all' && a.owner_type !== tab) return false
      if (cityFilter !== 'all' && a.city !== cityFilter) return false
      return true
    })
  }, [apartments, tab, cityFilter])

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            Find an apartment
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            {isLoading ? 'Loading verified listings…' : `${filtered.length} homes available`}
          </p>
        </div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={() => navigate('/apartments/new')}>
            <Plus size={18} /> List your place
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
            <TabsTrigger value="all"><Building2 size={14} /> All</TabsTrigger>
            <TabsTrigger value="realtor"><BadgeCheck size={14} /> Verified realtor</TabsTrigger>
            <TabsTrigger value="student"><Users size={14} /> Student</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-44">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} variant="apartment" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No apartments here yet"
          description="Try another city or filter — or be the first to list a place."
          action={<Button onClick={() => navigate('/apartments/new')}><Plus size={16} /> Create listing</Button>}
        />
      ) : (
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
      )}
    </div>
  )
}
