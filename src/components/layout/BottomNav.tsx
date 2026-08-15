import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Compass, Building2, Users, MessageSquare, Bell, Crown, ListChecks,
  Menu, UsersRound, BadgeCheck, User, Moon, Sun, LogOut, X,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSelector from '@/components/shared/LanguageSelector'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/featureFlags'

type Tab = { to: string; icon: React.ElementType; key: string; badge?: boolean }

const STUDENT_TABS: Tab[] = [
  { to: '/discover',      icon: Compass,       key: 'discover' },
  { to: '/apartments',   icon: Building2,     key: 'apartments' },
  { to: '/community',    icon: Users,         key: 'community.label' },
  { to: '/inbox',        icon: MessageSquare, key: 'inbox.label', badge: true },
  { to: '/notifications',icon: Bell,          key: 'alerts', badge: true },
]

const REALTOR_TABS: Tab[] = [
  { to: '/my-listings',   icon: ListChecks,    key: 'myListings' },
  { to: '/apartments',   icon: Building2,     key: 'apartments' },
  { to: '/inbox',        icon: MessageSquare, key: 'inbox.label', badge: true },
  { to: '/notifications',icon: Bell,          key: 'alerts', badge: true },
]

/** Routes that don't fit in the bar — previously unreachable on mobile. */
function MoreSheet({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { isDark, toggleDark } = useUIStore()
  const isRealtor = profile?.account_type === 'realtor'

  const go = (to: string) => { onClose(); navigate(to) }

  const links: { to: string; icon: React.ElementType; key: string; gold?: boolean }[] = isRealtor
    ? [
        { to: '/profile', icon: User, key: 'profile' },
      ]
    : [
        { to: '/groups',      icon: UsersRound, key: 'groups.label' },
        ...(FEATURES.realtors ? [{ to: '/realtors', icon: BadgeCheck, key: 'realtors.label' }] : []),
        { to: '/my-listings', icon: ListChecks, key: 'myListings' },
        { to: '/profile',     icon: User,       key: 'profile' },
        ...(profile?.is_premium && FEATURES.concierge
          ? [{ to: '/concierge', icon: Crown, key: 'cribQuest', gold: true }]
          : !profile?.is_premium && FEATURES.premium
          ? [{ to: '/upgrade', icon: Crown, key: 'unlockPremium', gold: true }]
          : []),
      ]

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="lg:hidden fixed inset-0 z-40 bg-black/40"
        aria-hidden
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        role="dialog" aria-modal="true" aria-label={t('more')}
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-white dark:bg-[#16201E] border-t border-[--border] p-4 pb-8"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="font-black text-sand-900 dark:text-white">{t('more')}</p>
          <button onClick={onClose} aria-label={t('close')} className="btn-ghost -mr-1">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {links.map(({ to, icon: Icon, key, gold }) => (
            <button
              key={to}
              onClick={() => go(to)}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold text-left transition-colors',
                gold
                  ? 'bg-gold-400/15 text-gold-600 dark:text-gold-400'
                  : 'bg-sand-50 dark:bg-[#222D2B] text-sand-700 dark:text-sand-200',
              )}
            >
              <Icon size={18} className={gold ? 'text-gold-500' : 'text-primary-500'} />
              {t(key)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sand-50 dark:bg-[#222D2B] px-4 py-3 text-sm font-semibold text-sand-700 dark:text-sand-200"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? t('lightMode') : t('darkMode')}
          </button>
          <LanguageSelector variant="row" className="flex-1" />
        </div>

        <button
          onClick={() => { onClose(); signOut().then(() => navigate('/login')) }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <LogOut size={16} /> {t('signOut')}
        </button>
      </motion.div>
    </>
  )
}

export default function BottomNav() {
  const { t } = useLanguage()
  const { unreadMessages, unreadNotifications } = useUIStore()
  const profile = useAuthStore((s) => s.profile)
  const reduceMotion = useReducedMotion()
  const [moreOpen, setMoreOpen] = useState(false)
  const isRealtor = profile?.account_type === 'realtor'
  const TABS = isRealtor ? REALTOR_TABS : STUDENT_TABS

  const badges: Record<string, number> = {
    '/inbox': unreadMessages,
    '/notifications': unreadNotifications,
  }

  return (
    <>
      <AnimatePresence>
        {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-[--border] px-2 pb-safe"
      >
        <div className="flex items-center justify-around h-16">
          {TABS.map(({ to, icon: Icon, key, badge }) => {
            const count = badge ? (badges[to] ?? 0) : 0
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 transition-colors min-w-0',
                    isActive
                      ? 'text-gold-700'
                      : 'text-sand-500 dark:text-sand-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active pill — slides between tabs via shared layoutId. */}
                    {isActive && (
                      <motion.span
                        layoutId="bottomNavPill"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 380, damping: 30 }
                        }
                        className="absolute inset-0 rounded-2xl bg-gold-400"
                        aria-hidden
                      />
                    )}

                    <span className="relative z-10">
                      <motion.span
                        animate={isActive && !reduceMotion ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="block"
                      >
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                      </motion.span>
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </span>
                    <span className="relative z-10 text-[10px] font-semibold truncate">{t(key)}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* More — opens the sheet with everything that doesn't fit the bar. */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className="relative flex flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 text-sand-500 dark:text-sand-400 min-w-0"
          >
            <Menu size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold truncate">{t('more')}</span>
          </button>
        </div>
      </motion.nav>
    </>
  )
}
