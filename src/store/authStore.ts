import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { supabase, isMockMode } from '@/lib/supabase'

// Demo fixtures load via dynamic import so they tree-shake out of prod bundles.
async function mockProfile(): Promise<Profile> {
  const { MOCK_PROFILES } = await import('@/mock/data')
  return MOCK_PROFILES[0]
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, accountType?: 'student' | 'realtor', referredBy?: string | null) => Promise<{ error: string | null }>
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
            const profile = await mockProfile()
            set({
              profile,
              isInitialized: true,
              isLoading: false,
              user: { id: profile.id, email: 'demo@talibroom.ma' } as User,
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
            const profile = await mockProfile()
            set({ profile, user: { id: profile.id, email } as User })
            return { error: null }
          }
          set({ isLoading: true })
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          set({ isLoading: false })
          return { error: error?.message ?? null }
        },

        signUp: async (email, password, fullName, accountType = 'student', referredBy = null) => {
          if (isMockMode) {
            const profile = await mockProfile()
            set({ profile: { ...profile, full_name: fullName } })
            return { error: null }
          }
          set({ isLoading: true })
          // The `handle_new_user` DB trigger creates the profiles row from
          // this metadata — the client must not insert one itself. The
          // trigger re-validates referred_by server-side before trusting it.
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, account_type: accountType, referred_by: referredBy } },
          })
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
          const previous = profile
          set({ profile: { ...profile, ...updates } })
          if (!isMockMode) {
            const { error } = await supabase
              .from('profiles').update(updates).eq('id', user.id)
            if (error) {
              // Roll back the optimistic write so the UI never lies about
              // what's saved (e.g. the moderation guard rejecting a field).
              set({ profile: previous })
              throw new Error(error.message)
            }
          }
        },

        setProfile: (profile) => set({ profile }),
      }),
      {
        name: 'talibroom-auth',
        partialize: (state) => ({ profile: state.profile }),
      }
    )
  )
)
