import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  isDark: boolean
  sidebarOpen: boolean
  unreadNotifications: number
  unreadMessages: number

  toggleDark: () => void
  setDark: (v: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
  setUnreadNotifications: (n: number) => void
  setUnreadMessages: (n: number) => void
  decrementNotifications: () => void
  decrementMessages: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        isDark: false,
        sidebarOpen: true,
        unreadNotifications: 3,
        unreadMessages: 5,

        toggleDark: () => {
          const next = !get().isDark
          set({ isDark: next })
          document.documentElement.classList.toggle('dark', next)
        },
        setDark: (v) => {
          set({ isDark: v })
          document.documentElement.classList.toggle('dark', v)
        },
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setSidebarOpen: (v) => set({ sidebarOpen: v }),
        setUnreadNotifications: (n) => set({ unreadNotifications: n }),
        setUnreadMessages: (n) => set({ unreadMessages: n }),
        decrementNotifications: () =>
          set((s) => ({ unreadNotifications: Math.max(0, s.unreadNotifications - 1) })),
        decrementMessages: () =>
          set((s) => ({ unreadMessages: Math.max(0, s.unreadMessages - 1) })),
      }),
      {
        name: 'moroom-ui',
        partialize: (s) => ({ isDark: s.isDark }),
        onRehydrateStorage: () => (state) => {
          if (state?.isDark) {
            document.documentElement.classList.add('dark')
          }
        },
      }
    )
  )
)
