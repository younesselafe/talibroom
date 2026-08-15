import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import PageTransition from '@/components/shared/PageTransition'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function AppShell() {
  const setUnreadNotifications = useUIStore((s) => s.setUnreadNotifications)
  const setUnreadMessages = useUIStore((s) => s.setUnreadMessages)
  const location    = useLocation()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const isChat = location.pathname.startsWith('/chat/')

  // Keep the navbar / bottom-nav badges in sync with real unread counts.
  // These share react-query's cache with the Inbox / Notifications pages, so
  // when a page marks something read and invalidates, the badges recompute.
  const { data: notifications } = useQuery({
    queryKey: ['notifications'], queryFn: api.getNotifications,
  })
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: api.getLinks })

  useEffect(() => {
    if (notifications) {
      setUnreadNotifications(notifications.filter((n) => !n.is_read).length)
    }
  }, [notifications, setUnreadNotifications])

  useEffect(() => {
    if (links) {
      setUnreadMessages(links.reduce((sum, l) => sum + (l.unread_count ?? 0), 0))
    }
  }, [links, setUnreadMessages])

  // Realtime notifications — instant badge bump when a new row arrives.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])

  // Presence heartbeat — refresh the signed-in user's last_seen on load and
  // every 3 min so "Active now" indicators across the app stay accurate.
  useEffect(() => {
    api.touchLastSeen().catch(() => {})
    const t = setInterval(() => { api.touchLastSeen().catch(() => {}) }, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  return (
    // dvh keeps the chat composer above the collapsing mobile URL bar;
    // h-screen stays as the fallback for browsers without dvh support.
    <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-[--bg]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex">
        <Sidebar />
      </aside>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navbar (mobile + desktop) */}
        {!isChat && <Navbar />}

        {/* Page content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'pb-20 lg:pb-0', // space for bottom nav on mobile
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
