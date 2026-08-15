import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import PageLoader from '@/components/shared/PageLoader'
import { FEATURES } from '@/lib/featureFlags'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const LandingPage       = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage         = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage        = lazy(() => import('@/pages/auth/SignupPage'))
const OnboardingPage    = lazy(() => import('@/pages/auth/OnboardingPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

const DiscoverPage    = lazy(() => import('@/pages/discover/DiscoverPage'))

const ApartmentsPage      = lazy(() => import('@/pages/apartments/ApartmentsPage'))
const ApartmentDetailPage = lazy(() => import('@/pages/apartments/ApartmentDetailPage'))
const NewListingPage       = lazy(() => import('@/pages/apartments/NewListingPage'))

const CommunityPage   = lazy(() => import('@/pages/community/CommunityPage'))
const InboxPage       = lazy(() => import('@/pages/inbox/InboxPage'))
const ChatPage        = lazy(() => import('@/pages/chat/ChatPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const ProfilePage     = lazy(() => import('@/pages/profile/ProfilePage'))
const MyListingsPage  = lazy(() => import('@/pages/my-listings/MyListingsPage'))
const RealtorsPage    = lazy(() => import('@/pages/realtors/RealtorsPage'))
const GroupsPage      = lazy(() => import('@/pages/groups/GroupsPage'))
const GroupChatPage   = lazy(() => import('@/pages/groups/GroupChatPage'))
const ConciergePage   = lazy(() => import('@/pages/concierge/ConciergePage'))
const UpgradePage     = lazy(() => import('@/pages/upgrade/UpgradePage'))
const AdminPage       = lazy(() => import('@/pages/admin/AdminPage'))
const TermsPage       = lazy(() => import('@/pages/legal/TermsPage'))
const PrivacyPage     = lazy(() => import('@/pages/legal/PrivacyPage'))

// ─── Guards ───────────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.is_admin) return <Navigate to="/admin" replace />
  const onboardingDone = !!(profile?.city || profile?.university || localStorage.getItem('talibroom_onboarding_done'))
  if (!onboardingDone) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (user) {
    if (profile?.is_admin) return <Navigate to="/admin" replace />
    return <Navigate to={profile?.account_type === 'realtor' ? '/my-listings' : '/discover'} replace />
  }
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.is_admin) return <Navigate to="/discover" replace />
  return <>{children}</>
}

/** Redirects realtor accounts away from student-only routes. */
function StudentOnlyGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile)
  if (profile?.account_type === 'realtor') return <Navigate to="/my-listings" replace />
  return <>{children}</>
}

/** Smart home redirect — realtors land on /my-listings, students on /discover. */
function HomeRedirect() {
  const profile = useAuthStore((s) => s.profile)
  return <Navigate to={profile?.account_type === 'realtor' ? '/my-listings' : '/discover'} replace />
}

/** Root route — signed-in users go straight to their home, guests see the marketing page. */
function RootRoute() {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (user) {
    if (profile?.is_admin) return <Navigate to="/admin" replace />
    return <Navigate to={profile?.account_type === 'realtor' ? '/my-listings' : '/discover'} replace />
  }
  return <LandingPage />
}

/** Blocks a route while its feature flag is off, even via direct URL. */
function FeatureGuard({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <Navigate to="/discover" replace />
  return <>{children}</>
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"           element={<RootRoute />} />
          <Route path="/login"      element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/signup"     element={<GuestGuard><SignupPage /></GuestGuard>} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          {/* No guard — the recovery link signs the user in mid-flow. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms"      element={<TermsPage />} />
          <Route path="/privacy"    element={<PrivacyPage />} />

          {/* Protected app routes — wrapped in AppShell */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            {/* Student-only routes */}
            <Route path="/discover"               element={<StudentOnlyGuard><DiscoverPage /></StudentOnlyGuard>} />
            <Route path="/community"              element={<StudentOnlyGuard><CommunityPage /></StudentOnlyGuard>} />
            <Route path="/groups"                 element={<StudentOnlyGuard><GroupsPage /></StudentOnlyGuard>} />
            <Route path="/groups/:id"             element={<StudentOnlyGuard><GroupChatPage /></StudentOnlyGuard>} />
            <Route path="/realtors"               element={<StudentOnlyGuard><FeatureGuard enabled={FEATURES.realtors}><RealtorsPage /></FeatureGuard></StudentOnlyGuard>} />
            <Route path="/concierge"              element={<StudentOnlyGuard><FeatureGuard enabled={FEATURES.concierge}><ConciergePage /></FeatureGuard></StudentOnlyGuard>} />
            {/* Shared routes — accessible by both students and realtors */}
            <Route path="/apartments"             element={<ApartmentsPage />} />
            <Route path="/apartments/new"         element={<NewListingPage />} />
            <Route path="/apartments/:id/edit"    element={<NewListingPage />} />
            <Route path="/apartments/:id"         element={<ApartmentDetailPage />} />
            <Route path="/inbox"                  element={<InboxPage />} />
            <Route path="/chat/:id"               element={<ChatPage />} />
            <Route path="/notifications"          element={<NotificationsPage />} />
            <Route path="/profile"                element={<ProfilePage />} />
            <Route path="/profile/:id"            element={<ProfilePage />} />
            <Route path="/my-listings"            element={<MyListingsPage />} />
            <Route path="/upgrade"                element={<FeatureGuard enabled={FEATURES.premium}><UpgradePage /></FeatureGuard>} />
          </Route>

          {/* Admin — completely separate from the student app */}
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

          {/* Fallback */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
