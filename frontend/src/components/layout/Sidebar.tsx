import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Building2, Map, Briefcase,
  MessageSquare, BarChart3, Settings, Bot, LogOut, Zap
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { motion } from 'framer-motion'

const navItems = [
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Resume',         icon: FileText,         to: '/resume' },
  { label: 'Companies',      icon: Building2,        to: '/companies' },
  { label: 'Career Planner', icon: Map,              to: '/career' },
  { label: 'Applications',   icon: Briefcase,        to: '/applications' },
  { label: 'Interviews',     icon: MessageSquare,    to: '/interviews' },
  { label: 'AI Assistant',   icon: Bot,              to: '/assistant' },
  { label: 'Analytics',      icon: BarChart3,        to: '/analytics' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-bg-surface border-r border-bg-border flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-bg-border">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary tracking-tight">A.C.E.</p>
          <p className="text-[10px] text-text-muted leading-tight">Career Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-bg-border mx-3" />

      {/* Bottom */}
      <div className="p-3 space-y-0.5">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={17} /> Settings
        </NavLink>
        <button onClick={handleLogout} className="nav-item w-full text-danger/70 hover:text-danger hover:bg-danger/10">
          <LogOut size={17} /> Logout
        </button>
      </div>

      {/* User tag */}
      <div className="p-3 pt-0">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-bg-elevated rounded-xl border border-bg-border">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-violet flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{user?.email ?? 'User'}</p>
            <p className="text-[10px] text-text-muted">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
