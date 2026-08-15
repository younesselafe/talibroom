import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, MessageSquare, Moon, Sun, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import Avatar from '@/components/shared/Avatar'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/discover':      'Discover',
  '/apartments':    'Apartments',
  '/community':     'Community',
  '/inbox':         'Inbox',
  '/notifications': 'Notifications',
  '/profile':       'Profile',
  '/my-listings':   'My Listings',
  '/realtors':      'Realtors',
  '/groups':        'Groups',
  '/apartments/new':'New Listing',
}

export default function Navbar() {
  const { profile } = useAuthStore()
  const { isDark, toggleDark, unreadMessages, unreadNotifications } = useUIStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  const title = PAGE_TITLES[location.pathname] ?? 'TalibRoom'
  const canGoBack = location.pathname.split('/').length > 2

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 glass border-b border-[--border] px-4 h-14 flex items-center gap-3"
    >
      {/* Back button (mobile sub-pages) */}
      {canGoBack ? (
        <button
          onClick={() => navigate(-1)}
          className="lg:hidden btn-ghost -ml-2"
        >
          <ChevronLeft size={20} />
        </button>
      ) : (
        <div className="lg:hidden flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">T</span>
          </div>
        </div>
      )}

      <h1 className={cn(
        'flex-1 font-bold text-sand-900 dark:text-white',
        'lg:text-lg text-base',
      )}>
        {canGoBack ? title : (
          <span>
            Talib<span className="text-primary-500">Room</span>
          </span>
        )}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <button onClick={toggleDark} className="btn-ghost hidden sm:flex">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button onClick={() => navigate('/inbox')} className="btn-ghost relative">
          <MessageSquare size={18} />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>

        <button onClick={() => navigate('/notifications')} className="btn-ghost relative">
          <Bell size={18} />
          {unreadNotifications > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5"
            >
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </motion.span>
          )}
        </button>

        {profile && (
          <button
            onClick={() => navigate('/profile')}
            className="ml-1 hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name}
              size="sm"
              isPremium={profile.is_premium}
            />
          </button>
        )}
      </div>
    </motion.header>
  )
}
