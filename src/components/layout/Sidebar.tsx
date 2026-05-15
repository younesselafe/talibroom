import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Compass, Building2, Users, MessageSquare, Bell,
  User, ListChecks, BadgeCheck, UsersRound, LogOut, Moon, Sun,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import Avatar from '@/components/shared/Avatar'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/discover',      icon: Compass,      label: 'Discover' },
  { to: '/apartments',   icon: Building2,    label: 'Apartments' },
  { to: '/community',    icon: Users,        label: 'Community' },
  { to: '/inbox',        icon: MessageSquare,label: 'Inbox' },
  { to: '/notifications',icon: Bell,         label: 'Notifications' },
  { to: '/groups',       icon: UsersRound,   label: 'Groups' },
  { to: '/realtors',     icon: BadgeCheck,   label: 'Realtors' },
  { to: '/my-listings',  icon: ListChecks,   label: 'My Listings' },
  { to: '/profile',      icon: User,         label: 'Profile' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const { isDark, toggleDark, unreadMessages, unreadNotifications } = useUIStore()
  const navigate = useNavigate()

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
            <span className="text-white font-black text-sm">M</span>
          </div>
          <span className="text-xl font-black text-sand-900 dark:text-white tracking-tight">
            Mo<span className="text-primary-500">Room</span>
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto hide-scrollbar">
        {NAV.map(({ to, icon: Icon, label }) => {
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
              <span className="flex-1 text-sm">{label}</span>
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
      </nav>

      {/* Bottom actions */}
      <div className="px-3 mt-4 space-y-1 border-t border-[--border] pt-4">
        <button onClick={toggleDark} className="nav-link w-full">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm">{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          onClick={() => signOut().then(() => navigate('/login'))}
          className="nav-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut size={18} />
          <span className="text-sm">Sign out</span>
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
              <p className="text-xs text-sand-400 truncate">{profile.city ?? 'No city set'}</p>
            </div>
          </button>
        </div>
      )}
    </motion.div>
  )
}
