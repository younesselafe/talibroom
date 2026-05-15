import { motion, useReducedMotion } from 'framer-motion'
import { Search, Sparkles, Users, MapPin, Zap, type LucideIcon } from 'lucide-react'

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
      <Icon size={15} className="text-white/70" aria-hidden />
      <span className="font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-white/65">{label}</span>
    </div>
  )
}

export default function DiscoverHero({
  search, onSearchChange, totalStudents, cityCount, onlineCount,
}: DiscoverHeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-hero-gradient text-white shadow-card-lg"
    >
      {/* Atmosphere */}
      <div aria-hidden className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-mint-400/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-28 right-4 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div aria-hidden className="absolute inset-0 bg-dot-grid text-white/[0.07]" />

      <div className="relative px-6 py-9 sm:px-10 sm:py-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/15 backdrop-blur-sm">
          <Sparkles size={13} className="text-gold-300" aria-hidden />
          Roommate matching
        </span>

        <h1 className="mt-4 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          Find your people,
          <br />
          <span className="text-white/70">find your place.</span>
        </h1>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
          Browse students across Morocco looking for a roommate — filter by city,
          lifestyle and budget to find someone genuinely compatible.
        </p>

        {/* Search */}
        <div className="relative mt-6 max-w-md">
          <Search
            size={18}
            aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or university…"
            aria-label="Search students by name or university"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/55 backdrop-blur-md transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        {/* Stats */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <HeroStat icon={Users} value={totalStudents} label="students" />
          <HeroStat icon={MapPin} value={cityCount} label="cities" />
          <HeroStat icon={Zap} value={onlineCount} label="online now" />
        </div>
      </div>
    </motion.section>
  )
}
