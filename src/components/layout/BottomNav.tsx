import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, Building2, Users, MessageSquare, Bell } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/discover',      icon: Compass,       label: 'Discover' },
  { to: '/apartments',   icon: Building2,     label: 'Apartments' },
  { to: '/community',    icon: Users,         label: 'Community' },
  { to: '/inbox',        icon: MessageSquare, label: 'Inbox', badge: true },
  { to: '/notifications',icon: Bell,          label: 'Alerts', badge: true },
]

export default function BottomNav() {
  const { unreadMessages, unreadNotifications } = useUIStore()

  const badges: Record<string, number> = {
    '/inbox': unreadMessages,
    '/notifications': unreadNotifications,
  }

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-[--border] px-2 pb-safe"
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ to, icon: Icon, label, badge }) => {
          const count = badge ? (badges[to] ?? 0) : 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-0',
                  isActive
                    ? 'text-primary-500'
                    : 'text-sand-500 dark:text-sand-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <motion.span
                      animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="block"
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    </motion.span>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold truncate">{label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-indicator"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </motion.nav>
  )
}
