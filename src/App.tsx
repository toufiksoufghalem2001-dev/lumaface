import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Onboarding from '@/pages/Onboarding'
import Routine from '@/pages/Routine'
import Library from '@/pages/Library'
import ActivityDetail from '@/pages/ActivityDetail'
import ActivitySession from '@/pages/ActivitySession'
import ActivityDone from '@/pages/ActivityDone'
import Program from '@/pages/Program'
import CheckIn from '@/pages/CheckIn'
import Progress from '@/pages/Progress'
import Coach from '@/pages/Coach'
import Paywall from '@/pages/Paywall'
import Profile from '@/pages/Profile'
import Help from '@/pages/Help'
import Auth from '@/pages/Auth'
import AuthCallback from '@/pages/AuthCallback'
import BillingSuccess from '@/pages/BillingSuccess'
import BillingCancel from '@/pages/BillingCancel'
import Support from '@/pages/Support'

/**
 * LumaFace routes (design.md §8.8). Nested-route pattern: Layout renders
 * <Outlet/> and owns the phone frame + bars. Feature engineers REPLACE their
 * page files exactly — routes and component names are the contract.
 */
export default function App() {
  return (
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
  )
}
