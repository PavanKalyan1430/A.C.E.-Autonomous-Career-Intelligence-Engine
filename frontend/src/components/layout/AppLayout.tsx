import React from 'react'
import { Sidebar } from './Sidebar'
import { Bell, Search } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const displayName = user?.profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User')
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'US'

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-700 dark:text-neutral-300">
      <Sidebar />
      
      <div className="flex-1 ml-[260px] flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="relative w-80 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Search jobs, skills, companies..." 
                className="w-full pl-9 pr-4 py-1.5 bg-brand-cream dark:bg-neutral-900 border border-transparent rounded-md text-sm focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder-neutral-400 text-neutral-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors" title="Notifications">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-white dark:border-neutral-800"></span>
            </button>
            <div 
              onClick={() => navigate('/settings')}
              title={`Profile settings (${displayName})`}
              className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer hover:bg-brand-hover transition-colors"
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 p-8 max-w-[1440px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
