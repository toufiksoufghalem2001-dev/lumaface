import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'

/* Route-level code-splitting (perf): every non-landing page ships in its own
   chunk so first paint loads only Layout + Home + shared vendors. Pages stay
   the contract — only the imports change. */
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Routine = lazy(() => import('@/pages/Routine'))
const Library = lazy(() => import('@/pages/Library'))
const ActivityDetail = lazy(() => import('@/pages/ActivityDetail'))
const ActivitySession = lazy(() => import('@/pages/ActivitySession'))
const ActivityDone = lazy(() => import('@/pages/ActivityDone'))
const Program = lazy(() => import('@/pages/Program'))
const CheckIn = lazy(() => import('@/pages/CheckIn'))
const Progress = lazy(() => import('@/pages/Progress'))
const Coach = lazy(() => import('@/pages/Coach'))
const Paywall = lazy(() => import('@/pages/Paywall'))
const Profile = lazy(() => import('@/pages/Profile'))
const Help = lazy(() => import('@/pages/Help'))
const Auth = lazy(() => import('@/pages/Auth'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const BillingSuccess = lazy(() => import('@/pages/BillingSuccess'))
const BillingCancel = lazy(() => import('@/pages/BillingCancel'))
const Support = lazy(() => import('@/pages/Support'))

/** Quiet chunk-loading state — calm wordmark, no spinners. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-label="Loading">
      <span className="font-display italic text-[22px] text-ink-3">LumaFace</span>
    </div>
  )
}

/**
 * LumaFace routes (design.md §8.8). Nested-route pattern: Layout renders
 * <Outlet/> and owns the phone frame + bars. Feature engineers REPLACE their
 * page files exactly — routes and component names are the contract.
 */
export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="routine" element={<Routine />} />
          <Route path="library" element={<Library />} />
          <Route path="activity/:id" element={<ActivityDetail />} />
          <Route path="activity/:id/session" element={<ActivitySession />} />
          <Route path="activity/:id/done" element={<ActivityDone />} />
          <Route path="program" element={<Program />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="progress" element={<Progress />} />
          <Route path="coach" element={<Coach />} />
          <Route path="paywall" element={<Paywall />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<Help />} />
          <Route path="auth" element={<Auth />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="billing/success" element={<BillingSuccess />} />
          <Route path="billing/cancel" element={<BillingCancel />} />
          <Route path="support" element={<Support />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
