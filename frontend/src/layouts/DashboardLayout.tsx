import { Outlet, NavLink } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { LayoutDashboard, Video, Tag, Gift, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/videos', icon: Video, label: 'Videos' },
  { to: '/dashboard/offers', icon: Tag, label: 'Offers' },
  { to: '/dashboard/lead-magnets', icon: Gift, label: 'Lead Magnets' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background-primary flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background-secondary border-r border-border-primary p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground-primary">YouTube Tracker</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-soft transition-colors ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-border-primary">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
