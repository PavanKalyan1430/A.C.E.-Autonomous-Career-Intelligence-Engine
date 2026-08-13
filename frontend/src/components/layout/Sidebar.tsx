import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BrainCircuit, 
  FileText, 
  Target, 
  Map, 
  Building2, 
  MessageSquare, 
  Briefcase, 
  BarChart3, 
  Settings, 
  LogOut,
  Moon,
  Sun
} from 'lucide-react'

// Mocking useTheme for now until we build the context
const useTheme = () => ({ theme: 'light', toggleTheme: () => {} })

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
      ]
    },
    {
      label: 'Career Intelligence',
      items: [
        { name: 'AI Career Agent', path: '/career', icon: <BrainCircuit size={18} /> },
        { name: 'Resume Intelligence', path: '/resume', icon: <FileText size={18} /> },
        { name: 'Job Intelligence', path: '/jobs', icon: <Target size={18} /> },
        { name: 'Skill Roadmap', path: '/skills', icon: <Map size={18} /> },
        { name: 'Company Intelligence', path: '/companies', icon: <Building2 size={18} /> },
      ]
    },
    {
      label: 'Interview',
      items: [
        { name: 'Mock Interview', path: '/interviews', icon: <MessageSquare size={18} /> },
      ]
    },
    {
      label: 'Tracking',
      items: [
        { name: 'Applications', path: '/applications', icon: <Briefcase size={18} /> },
        { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={18} /> },
      ]
    }
  ]

  return (
    <aside className="w-[260px] h-screen bg-[#0D2B1D] border-r border-[#18291E] flex flex-col fixed left-0 top-0 z-20 text-white shadow-xl">
      
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 mt-2 mb-2">
        <img 
          src="/logo.png" 
          alt="A.C.E. Logo" 
          className="h-10 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] drop-shadow-[0_0_15px_rgba(45,154,99,0.5)]"
        />
        <div className="flex flex-col leading-none">
          <h1 className="font-extrabold text-white leading-none tracking-tight text-xl">A.C.E.</h1>
          <p className="text-[10px] uppercase font-semibold text-[#34B36F] tracking-widest mt-1">Career OS</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[11px] font-semibold text-brand-ai uppercase tracking-wider mb-2">
              {group.label}
            </h3>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#18291E] text-white shadow-inner relative'
                        : 'text-[#AEC3B0] hover:bg-[#18291E]/60 hover:text-white hover:translate-x-1'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(51,102,89,0.8)]" />
                      )}
                      <span className={`${isActive ? 'text-brand-ai' : 'text-neutral-500 transition-colors'}`}>
                        {item.icon}
                      </span>
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / System */}
      <div className="p-4 border-t border-[#18291E] space-y-1 bg-[#092015]">
        <NavLink 
          to="/settings"
          className={({ isActive }) => 
            `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive 
                ? 'bg-brand-primary text-white shadow-[0_0_8px_rgba(51,102,89,0.8)]' 
                : 'text-[#AEC3B0] hover:bg-[#18291E] hover:text-white'
            }`
          }
        >
          <Settings size={18} className="opacity-70" />
          Settings
        </NavLink>
        <div className="flex items-center justify-between mt-2 pt-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-primary border border-[#6B8F71] text-white flex items-center justify-center font-bold text-xs shadow-md">
              PR
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-white leading-tight">Pavan R.</span>
              <span className="text-[10px] text-[#AEC3B0]">Pro Member</span>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 text-[#AEC3B0] hover:text-white hover:bg-[#18291E] rounded-md transition-all duration-200"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
