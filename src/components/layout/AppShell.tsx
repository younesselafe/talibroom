import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import PageTransition from '@/components/shared/PageTransition'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export default function AppShell() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const location    = useLocation()

  const isChat = location.pathname.startsWith('/chat/')

  return (
    <div className="flex h-screen overflow-hidden bg-[--bg]">
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
