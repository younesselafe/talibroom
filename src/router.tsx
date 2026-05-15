import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import PageLoader from '@/components/shared/PageLoader'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage      = lazy(() => import('@/pages/auth/SignupPage'))
const OnboardingPage  = lazy(() => import('@/pages/auth/OnboardingPage'))

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

// ─── Guards ───────────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.city && !profile?.university) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore()
  if (!isInitialized) return <PageLoader />
  if (user) return <Navigate to="/discover" replace />
  return <>{children}</>
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login"      element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/signup"     element={<GuestGuard><SignupPage /></GuestGuard>} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected app routes — wrapped in AppShell */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route index                          element={<Navigate to="/discover" replace />} />
            <Route path="/discover"               element={<DiscoverPage />} />
            <Route path="/apartments"             element={<ApartmentsPage />} />
            <Route path="/apartments/new"         element={<NewListingPage />} />
            <Route path="/apartments/:id"         element={<ApartmentDetailPage />} />
            <Route path="/community"              element={<CommunityPage />} />
            <Route path="/inbox"                  element={<InboxPage />} />
            <Route path="/chat/:id"               element={<ChatPage />} />
            <Route path="/notifications"          element={<NotificationsPage />} />
            <Route path="/profile"                element={<ProfilePage />} />
            <Route path="/profile/:id"            element={<ProfilePage />} />
            <Route path="/my-listings"            element={<MyListingsPage />} />
            <Route path="/realtors"               element={<RealtorsPage />} />
            <Route path="/groups"                 element={<GroupsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
