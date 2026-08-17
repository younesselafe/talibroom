import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, CheckCircle2, XCircle, Gift, ShieldCheck, Flame, Pin,
  Users, Building2, Sparkles, UsersRound, Crown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSelector from '@/components/shared/LanguageSelector'
import { Button } from '@/components/ui/button'
import { MOROCCAN_CITIES } from '@/types'

// Jagged "torn paper" bottom edge — pure CSS, no image assets.
const TORN_EDGE: React.CSSProperties = {
  clipPath:
    'polygon(0% 0%, 100% 0%, 100% 90%, 94% 96%, 88% 90%, 82% 97%, 76% 91%, 70% 96%, ' +
    '64% 90%, 58% 95%, 52% 89%, 46% 96%, 40% 90%, 34% 95%, 28% 89%, 22% 96%, ' +
    '16% 90%, 10% 95%, 4% 89%, 0% 94%)',
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
}

export default function LandingPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Capture ?ref=<uuid> so SignupPage can attach it even if the visitor
  // browses around before creating an account.
  useEffect(() => {
    const ref = params.get('ref')
    if (ref) sessionStorage.setItem('talibroom_ref', ref)
  }, [params])

  const { data: signupCount } = useQuery({
    queryKey: ['signup-count'],
    queryFn: api.getSignupCount,
    staleTime: 5 * 60 * 1000,
  })

  const { data: premiumClaimed } = useQuery({
    queryKey: ['referral-premium-claimed'],
    queryFn: api.getReferralPremiumClaimed,
    staleTime: 5 * 60 * 1000,
  })

  const goJoin = () => navigate('/signup')
  const visibleCities = MOROCCAN_CITIES.slice(0, 9)
  const moreCities = MOROCCAN_CITIES.length - visibleCities.length
  const spotsLeft = premiumClaimed != null ? Math.max(0, 1000 - premiumClaimed) : null

  const FEATURE_ICONS = [Users, Building2, Sparkles, UsersRound] as const
  const FEATURE_KEYS = ['match', 'listings', 'list_own', 'groups'] as const

  return (
    <div className="min-h-screen bg-[--bg] overflow-x-hidden">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="page-container flex items-center justify-between !py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="text-lg font-black text-sand-900 dark:text-white tracking-tight">
            Talib<span className="text-primary-500">Room</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector variant="row" />
          <Link to="/login" className="text-sm font-semibold text-sand-600 dark:text-sand-300 hover:text-sand-900 dark:hover:text-white transition-colors">
            {t('landing.nav_login')}
          </Link>
        </div>
      </header>

      <main>
        {/* ─── Hero ───────────────────────────────────────────────────────── */}
        <section className="page-container grid lg:grid-cols-2 gap-12 lg:gap-8 items-center pt-6 pb-20 lg:pb-28">
          <motion.div
            initial="initial" animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.09 } } }}
            className="max-w-xl"
          >
            <motion.span
              variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400 text-xs font-bold px-3 py-1.5 mb-5"
            >
              {t('landing.eyebrow')}
            </motion.span>

            <motion.h1
              variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
              className="text-4xl sm:text-5xl xl:text-6xl font-black text-sand-900 dark:text-white leading-[1.05] tracking-tight text-balance"
            >
              {t('landing.headline_1')}<br />
              <span className="text-primary-500">{t('landing.headline_2')}</span>
            </motion.h1>

            <motion.p
              variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
              className="mt-5 text-lg text-sand-600 dark:text-sand-400 leading-relaxed"
            >
              {t('landing.subhead')}
            </motion.p>

            <motion.div
              variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
              className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <Button size="lg" onClick={goJoin} className="gap-2">
                {t('landing.cta_join')} <ArrowRight size={18} />
              </Button>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-sand-500 dark:text-sand-400">
                <Flame size={16} className="text-gold-500 flex-shrink-0" />
                {signupCount != null ? (
                  <span>{signupCount} {t('landing.counter_suffix')}</span>
                ) : (
                  <span className="h-4 w-32 rounded-full skeleton" />
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Signature visual — the chaos of a scam flyer fading behind a real, verified profile. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-[340px] sm:h-[400px] flex items-center justify-center"
          >
            {/* Torn flyer — the old way */}
            <motion.div
              initial={{ rotate: -14, y: -10 }}
              animate={{ rotate: -7, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-2 sm:left-6 top-4 w-52 sm:w-60 bg-[#F2EBDA] text-[#3A3226] shadow-card-lg p-4 pb-8"
              style={TORN_EDGE}
            >
              <Pin size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-red-500 rotate-12" fill="currentColor" />
              <p className="font-black text-sm tracking-tight">{t('landing.flyer_title')}</p>
              <p className="text-xs mt-1 line-through decoration-2 decoration-red-500/70 opacity-70">{t('landing.flyer_phone')}</p>
              <div className="mt-6 flex justify-center">
                <span className="border-[3px] border-red-500/80 text-red-500/80 font-black text-[11px] tracking-widest uppercase px-3 py-1 -rotate-12 rounded">
                  {t('landing.flyer_stamp')}
                </span>
              </div>
            </motion.div>

            {/* Clean card — the TalibRoom way */}
            <motion.div
              initial={{ rotate: 8, y: 20, opacity: 0 }}
              animate={{ rotate: 3, y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-60 sm:w-72 rounded-3xl bg-white dark:bg-[#16201E] shadow-card-lg border border-sand-100 dark:border-[#27302E] p-5 translate-x-8 translate-y-10 sm:translate-x-14 sm:translate-y-16"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-mint-500 flex-shrink-0" />
                <div>
                  <p className="font-black text-sand-900 dark:text-white text-sm">Yasmine, 20</p>
                  <p className="text-xs text-sand-500 dark:text-sand-400">Rabat · ENSIAS</p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-mint-100 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400 text-[11px] font-bold px-2.5 py-1">
                <ShieldCheck size={12} /> {t('landing.clean_card_badge')}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Old way vs new way ─────────────────────────────────────────── */}
        <section className="page-container py-16 lg:py-20">
          <motion.h2 {...fadeUp} className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white text-center tracking-tight mb-10">
            {t('landing.old_new_title')}
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <motion.div {...fadeUp} className="rounded-3xl border border-sand-200 dark:border-[#27302E] bg-sand-50/60 dark:bg-[#16201E]/60 p-6">
              <p className="font-bold text-sand-500 dark:text-sand-400 text-sm mb-4">{t('landing.old_way_title')}</p>
              <ul className="space-y-3">
                {(['old_way_1', 'old_way_2', 'old_way_3'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-sand-600 dark:text-sand-400">
                    <XCircle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="rounded-3xl border-2 border-primary-500/30 bg-primary-50/50 dark:bg-primary-900/10 p-6 shadow-card">
              <p className="font-bold text-primary-600 dark:text-primary-400 text-sm mb-4">{t('landing.new_way_title')}</p>
              <ul className="space-y-3">
                {(['new_way_1', 'new_way_2', 'new_way_3'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-sand-700 dark:text-sand-300 font-medium">
                    <CheckCircle2 size={17} className="text-mint-500 flex-shrink-0 mt-0.5" />
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* ─── Features ───────────────────────────────────────────────────── */}
        <section className="page-container py-16 lg:py-20">
          <motion.h2 {...fadeUp} className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white text-center tracking-tight mb-12">
            {t('landing.features_title')}
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {FEATURE_KEYS.map((key, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <motion.div
                  key={key}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                  className="rounded-3xl border border-sand-200 dark:border-[#27302E] bg-white dark:bg-[#16201E] p-6"
                >
                  <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4">
                    <Icon size={19} />
                  </div>
                  <p className="font-bold text-sand-900 dark:text-white mb-1.5">{t(`landing.feature_${key}_title`)}</p>
                  <p className="text-sm text-sand-500 dark:text-sand-400 leading-relaxed">{t(`landing.feature_${key}_desc`)}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────────────────── */}
        <section className="page-container py-16 lg:py-20">
          <motion.h2 {...fadeUp} className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white text-center tracking-tight mb-12">
            {t('landing.how_title')}
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {(['1', '2', '3'] as const).map((n, i) => (
              <motion.div key={n} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="text-center">
                <div className="w-11 h-11 rounded-2xl bg-primary-500 text-white font-black flex items-center justify-center mx-auto mb-4 text-lg">
                  {n}
                </div>
                <p className="font-bold text-sand-900 dark:text-white mb-1.5">{t(`landing.how_${n}_title`)}</p>
                <p className="text-sm text-sand-500 dark:text-sand-400 leading-relaxed">{t(`landing.how_${n}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Invite rewards: premium (capped) + giveaway (ongoing) ─────────── */}
        <section className="page-container py-4 pb-20">
          <motion.div
            {...fadeUp}
            className="max-w-3xl mx-auto rounded-[2rem] bg-gradient-to-br from-gold-400 via-gold-400 to-amber-300 p-8 sm:p-10 text-center relative overflow-hidden"
          >
            <Crown size={30} className="mx-auto mb-3 text-white drop-shadow" />
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {t('landing.premium_reward_title')}
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              {t('landing.premium_reward_desc')}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white">
              {spotsLeft != null ? (
                <span>{t('landing.premium_spots_left', { count: spotsLeft })}</span>
              ) : (
                <span className="h-3 w-28 rounded-full bg-white/30 animate-pulse" />
              )}
            </div>

            <div className="my-7 flex items-center gap-3 max-w-xs mx-auto" aria-hidden>
              <div className="flex-1 border-t-2 border-dashed border-white/40" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{t('landing.giveaway_divider')}</span>
              <div className="flex-1 border-t-2 border-dashed border-white/40" />
            </div>

            <Gift size={26} className="mx-auto mb-2 text-white drop-shadow" />
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
              {t('landing.giveaway_title')}
            </h3>
            <p className="text-white/90 text-sm max-w-lg mx-auto leading-relaxed">
              {t('landing.giveaway_desc')}
            </p>

            <Button size="lg" onClick={goJoin} className="mt-6 bg-white text-gold-700 hover:bg-white/90 shadow-lg gap-2">
              {t('landing.giveaway_cta')} <ArrowRight size={18} />
            </Button>
            <p className="mt-4 text-xs text-white/75">{t('landing.giveaway_fineprint')}</p>
          </motion.div>
        </section>

        {/* ─── Cities ──────────────────────────────────────────────────────── */}
        <section className="page-container pb-20 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sand-400 mb-4">{t('landing.cities_title')}</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {visibleCities.map((city) => (
              <span key={city} className="badge bg-sand-100 dark:bg-[#222D2B] text-sand-600 dark:text-sand-300">
                {city}
              </span>
            ))}
            {moreCities > 0 && (
              <span className="badge bg-sand-100 dark:bg-[#222D2B] text-sand-400">
                {t('landing.cities_more', { count: moreCities })}
              </span>
            )}
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[--border]">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-3 !py-6 text-sm text-sand-500 dark:text-sand-400">
          <span>{t('landing.footer_tagline')}</span>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-sand-800 dark:hover:text-sand-200 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-sand-800 dark:hover:text-sand-200 transition-colors">Privacy</Link>
            <span>{t('landing.footer_rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
