import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Compass, Building2, Users, MessageSquare, Bell,
  User, ListChecks, BadgeCheck, UsersRound, LogOut, Moon, Sun, Crown,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useLanguage } from '@/lib/LanguageContext'
import Avatar from '@/components/shared/Avatar'
import LanguageSelector from '@/components/shared/LanguageSelector'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/featureFlags'

const STUDENT_NAV: { to: string; icon: React.ElementType; key: string }[] = [
  { to: '/discover',       icon: Compass,       key: 'discover' },
  { to: '/apartments',    icon: Building2,     key: 'apartments' },
  { to: '/community',     icon: Users,         key: 'community.label' },
  { to: '/inbox',         icon: MessageSquare, key: 'inbox.label' },
  { to: '/notifications', icon: Bell,          key: 'notifications' },
  { to: '/groups',        icon: UsersRound,    key: 'groups.label' },
  { to: '/realtors',      icon: BadgeCheck,    key: 'realtors.label' },
  { to: '/my-listings',   icon: ListChecks,    key: 'myListings' },
  { to: '/profile',       icon: User,          key: 'profile' },
]

const REALTOR_NAV: { to: string; icon: React.ElementType; key: string }[] = [
  { to: '/my-listings',   icon: ListChecks,    key: 'myListings' },
  { to: '/apartments',    icon: Building2,     key: 'apartments' },
  { to: '/inbox',         icon: MessageSquare, key: 'inbox.label' },
  { to: '/notifications', icon: Bell,          key: 'notifications' },
  { to: '/profile',       icon: User,          key: 'profile' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const { isDark, toggleDark, unreadMessages, unreadNotifications } = useUIStore()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isRealtor = profile?.account_type === 'realtor'
  const NAV_ITEMS = (isRealtor ? REALTOR_NAV : STUDENT_NAV).filter(
    (item) => item.to !== '/realtors' || FEATURES.realtors,
  )

  const badges: Record<string, number> = {
    '/inbox': unreadMessages,
    '/notifications': unreadNotifications,
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-64 h-screen flex flex-col border-r border-[--border] bg-white dark:bg-[#1C1C1A] py-6"
    >
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="text-xl font-black text-sand-900 dark:text-white tracking-tight">
            Talib<span className="text-primary-500">Room</span>
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto hide-scrollbar">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => {
          const badge = badges[to]
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('nav-link relative', isActive && 'nav-link-active')
              }
            >
              <Icon size={18} />
              <span className="flex-1 text-sm">{t(key)}</span>
              {badge! > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center"
                >
                  {badge! > 9 ? '9+' : badge}
                </motion.span>
              )}
            </NavLink>
          )
        })}
        {/* Crib Quest — visible to all students; the page itself shows the
            premium upsell, so the product is discoverable before paying. */}
        {FEATURES.concierge && !isRealtor && (
          <NavLink
            to="/concierge"
            className={({ isActive }) =>
              cn('nav-link relative', isActive && 'nav-link-active')
            }
          >
            {({ isActive }) => (
              <>
                <Crown size={18} className={isActive ? 'text-amber-900' : 'text-gold-500'} />
                <span className={cn(
                  'flex-1 text-sm font-semibold',
                  isActive ? 'text-amber-900' : 'text-gold-600 dark:text-gold-400',
                )}>{t('cribQuest')}</span>
              </>
            )}
          </NavLink>
        )}
        {/* Upgrade CTA — non-premium students only */}
        {FEATURES.premium && !profile?.is_premium && !isRealtor && (
          <NavLink
            to="/upgrade"
            className={({ isActive }) =>
              cn('nav-link relative', isActive && 'nav-link-active')
            }
          >
            {({ isActive }) => (
              <>
                <Crown size={18} className={isActive ? 'text-amber-900' : 'text-gold-500'} />
                <span className={cn(
                  'flex-1 text-sm font-semibold',
                  isActive ? 'text-amber-900' : 'text-gold-600 dark:text-gold-400',
                )}>{t('unlockPremium')}</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 mt-4 space-y-1 border-t border-[--border] pt-4">
        <div className="px-1 py-1">
          <LanguageSelector variant="row" className="w-full" />
        </div>
        <button onClick={toggleDark} className="nav-link w-full">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm">{isDark ? t('lightMode') : t('darkMode')}</span>
        </button>
        <button
          onClick={() => signOut().then(() => navigate('/login'))}
          className="nav-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut size={18} />
          <span className="text-sm">{t('signOut')}</span>
        </button>
      </div>

      {/* User card */}
      {profile && (
        <div className="px-3 mt-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 dark:hover:bg-[#2A2A26] transition-colors"
          >
            <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" isPremium={profile.is_premium} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-sand-900 dark:text-white truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-sand-400 truncate">{profile.city ?? t('noCitySet')}</p>
            </div>
          </button>
        </div>
      )}
    </motion.div>
  )
}
