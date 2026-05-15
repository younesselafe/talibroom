import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { supabase, isMockMode } from '@/lib/supabase'
import { MOCK_PROFILES } from '@/mock/data'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  setProfile: (profile: Profile) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isInitialized: false,

        initialize: async () => {
          if (get().isInitialized) return

          if (isMockMode) {
            // Demo mode: auto-login as first mock profile
            const mockProfile = MOCK_PROFILES[0]
            set({
              profile: mockProfile,
              isInitialized: true,
              isLoading: false,
              user: { id: mockProfile.id, email: 'demo@moroom.ma' } as User,
            })
            return
          }

          set({ isLoading: true })
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              set({ session, user: session.user, profile })
            }
          } catch (err) {
            console.error('[auth] initialize error', err)
          } finally {
            set({ isLoading: false, isInitialized: true })
          }

          supabase.auth.onAuthStateChange(async (event, session) => {
            set({ session, user: session?.user ?? null })
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              set({ profile })
            } else {
              set({ profile: null })
            }
          })
        },

        signIn: async (email, password) => {
          if (isMockMode) {
            const mockProfile = MOCK_PROFILES[0]
            set({ profile: mockProfile, user: { id: mockProfile.id, email } as User })
            return { error: null }
          }
          set({ isLoading: true })
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          set({ isLoading: false })
          return { error: error?.message ?? null }
        },

        signUp: async (email, password, fullName) => {
          if (isMockMode) {
            const mockProfile = MOCK_PROFILES[0]
            set({ profile: { ...mockProfile, full_name: fullName } })
            return { error: null }
          }
          set({ isLoading: true })
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (!error && data.user) {
            await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: fullName,
              is_premium: false,
            })
          }
          set({ isLoading: false })
          return { error: error?.message ?? null }
        },

        signOut: async () => {
          if (!isMockMode) await supabase.auth.signOut()
          set({ user: null, session: null, profile: null })
        },

        updateProfile: async (updates) => {
          const { profile, user } = get()
          if (!profile || !user) return
          const updated = { ...profile, ...updates }
          set({ profile: updated })
          if (!isMockMode) {
            await supabase.from('profiles').update(updates).eq('id', user.id)
          }
        },

        setProfile: (profile) => set({ profile }),
      }),
      {
        name: 'moroom-auth',
        partialize: (state) => ({ profile: state.profile }),
      }
    )
  )
)
