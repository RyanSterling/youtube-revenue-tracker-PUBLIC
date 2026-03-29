import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Dashboard from './pages/Dashboard'
import Videos from './pages/Videos'
import VideoDetail from './pages/VideoDetail'
import Offers from './pages/Offers'
import LeadMagnets from './pages/LeadMagnets'
import Settings from './pages/Settings'
import DashboardLayout from './layouts/DashboardLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth()

  // Wait for Clerk to load before deciding what to render
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-primary">
        <div className="text-foreground-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login/*" element={<Login />} />
      <Route path="/signup/*" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="videos" element={<Videos />} />
        <Route path="videos/:id" element={<VideoDetail />} />
        <Route path="offers" element={<Offers />} />
        <Route path="lead-magnets" element={<LeadMagnets />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
