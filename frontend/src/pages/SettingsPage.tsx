import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, memoryApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatApiError } from '@/utils/error'
import {
  User as UserIcon,
  Shield,
  Key,
  Database,
  CheckCircle,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  LogOut,
  AlertCircle,
  Lock,
  Mail,
  Briefcase,
  Search,
  Bot,
  Brain,
  Check,
  Zap
} from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user: storeUser, updateUser, logout } = useAuthStore()

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'memory' | 'membership'>('profile')

  // Dynamic Profile Form State — No Hardcoded Values
  const [fullName, setFullName] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [bio, setBio] = useState('')
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('')
  const [profileErrorMsg, setProfileErrorMsg] = useState('')

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('')
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('')

  // AI Preferences State
  const [difficulty, setDifficulty] = useState('Medium')
  const [modelRouting, setModelRouting] = useState('auto')
  const [enableAgentMemory, setEnableAgentMemory] = useState(true)
  const [enableLiveSearch, setEnableLiveSearch] = useState(true)
  const [prefSuccessMsg, setPrefSuccessMsg] = useState('')
  const [prefErrorMsg, setPrefErrorMsg] = useState('')

  // Memory State
  const [newMemoryCategory, setNewMemoryCategory] = useState('Skill')
  const [newMemoryText, setNewMemoryText] = useState('')
  const [memorySuccessMsg, setMemorySuccessMsg] = useState('')
  const [memoryErrorMsg, setMemoryErrorMsg] = useState('')

  // 1. Fetch live authenticated user & profile data from /auth/me
  const { data: userMe, isLoading: isUserLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await authApi.me()
      return res.data
    },
    retry: 1
  })

  // Synchronize form state dynamically when userMe data loads from PostgreSQL
  useEffect(() => {
    if (userMe) {
      updateUser(userMe)
      if (userMe.profile) {
        setFullName(userMe.profile.full_name || '')
        setTargetRole(userMe.profile.target_role || '')
        setBio(userMe.profile.bio || '')
        
        const prefs = userMe.profile.preferences || {}
        if (prefs.difficulty) setDifficulty(prefs.difficulty)
        if (prefs.model_routing) setModelRouting(prefs.model_routing)
        if (prefs.enable_agent_memory !== undefined) setEnableAgentMemory(!!prefs.enable_agent_memory)
        if (prefs.enable_live_search !== undefined) setEnableLiveSearch(!!prefs.enable_live_search)
      }
    }
  }, [userMe, updateUser])

  // 2. Fetch AI career context memories
  const { data: memories, isLoading: isMemoriesLoading } = useQuery({
    queryKey: ['memoriesList'],
    queryFn: async () => {
      try {
        const res = await memoryApi.getAll()
        return res.data
      } catch (err) {
        return []
      }
    }
  })

  // 3. Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { full_name?: string; target_role?: string; bio?: string; preferences?: Record<string, any> }) => {
      const res = await authApi.updateProfile(payload)
      return res.data
    },
    onSuccess: async () => {
      setProfileSuccessMsg('Profile updated successfully.')
      setProfileErrorMsg('')
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      const meRes = await authApi.me()
      updateUser(meRes.data)
      setTimeout(() => setProfileSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setProfileErrorMsg(formatApiError(err, 'Failed to update profile details.'))
      setProfileSuccessMsg('')
    }
  })

  // 4. Update Preferences Mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Record<string, any>) => {
      const res = await authApi.updateProfile({ preferences })
      return res.data
    },
    onSuccess: async () => {
      setPrefSuccessMsg('AI preferences saved successfully.')
      setPrefErrorMsg('')
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      const meRes = await authApi.me()
      updateUser(meRes.data)
      setTimeout(() => setPrefSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setPrefErrorMsg(formatApiError(err, 'Failed to save AI preferences.'))
      setPrefSuccessMsg('')
    }
  })

  // 5. Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await authApi.changePassword(data)
      return res.data
    },
    onSuccess: () => {
      setPasswordSuccessMsg('Password updated successfully.')
      setPasswordErrorMsg('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setPasswordErrorMsg(formatApiError(err, 'Failed to change password. Verify your current password.'))
      setPasswordSuccessMsg('')
    }
  })

  // 6. Memory Mutations
  const createMemoryMutation = useMutation({
    mutationFn: async (vars: { category: string; text: string }) => {
      const res = await memoryApi.create(vars.category, vars.text)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoriesList'] })
      setNewMemoryText('')
      setMemorySuccessMsg('Memory fact added successfully.')
      setMemoryErrorMsg('')
      setTimeout(() => setMemorySuccessMsg(''), 3000)
    },
    onError: (err: any) => {
      setMemoryErrorMsg(formatApiError(err, 'Failed to add memory fact.'))
      setMemorySuccessMsg('')
    }
  })

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await memoryApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoriesList'] })
      setMemorySuccessMsg('Memory item deleted.')
      setTimeout(() => setMemorySuccessMsg(''), 3000)
    },
    onError: (err: any) => {
      setMemoryErrorMsg(formatApiError(err, 'Failed to delete memory item.'))
    }
  })

  // Form Handlers
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate({
      full_name: fullName.trim(),
      target_role: targetRole.trim(),
      bio: bio.trim()
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrorMsg('')
    setPasswordSuccessMsg('')

    if (!currentPassword) {
      setPasswordErrorMsg('Current password is required.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirmation do not match.')
      return
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword
    })
  }

  const handlePreferencesSave = (e: React.FormEvent) => {
    e.preventDefault()
    updatePreferencesMutation.mutate({
      difficulty,
      model_routing: modelRouting,
      enable_agent_memory: enableAgentMemory,
      enable_live_search: enableLiveSearch
    })
  }

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemoryText.trim()) return
    createMemoryMutation.mutate({
      category: newMemoryCategory,
      text: newMemoryText.trim()
    })
  }

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login')
  }

  const activeUser = userMe || storeUser

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in text-neutral-700 dark:text-neutral-300 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-[#18291E]">
        <div>
          <h1 className="text-3xl font-extrabold text-[#3d3d3d] dark:text-white tracking-tight flex items-center gap-3">
            <Sliders className="text-brand-primary" size={28} />
            Account & Settings
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium mt-1">
            Manage your personal profile, security credentials, AI routing preferences, and agent memories.
          </p>
        </div>

        <Button 
          variant="secondary" 
          size="sm" 
          icon={<LogOut size={16} />} 
          onClick={handleLogout}
          className="text-danger border-danger/20 hover:bg-danger/10"
        >
          Sign Out
        </Button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-neutral-200 dark:border-[#1E293B]">
        {[
          { id: 'profile', label: 'General Profile', icon: <UserIcon size={16} /> },
          { id: 'security', label: 'Security & Password', icon: <Key size={16} /> },
          { id: 'preferences', label: 'AI Preferences', icon: <Bot size={16} /> },
          { id: 'memory', label: 'Career Memories', icon: <Database size={16} /> },
          { id: 'membership', label: 'Membership Plan', icon: <Shield size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18291E]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Settings Content Area */}
      <div className="mt-6">
        
        {/* ── TAB 1: GENERAL PROFILE ── */}
        {activeTab === 'profile' && (
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B] max-w-3xl">
            <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-6 flex items-center gap-2">
              <UserIcon size={18} className="text-brand-primary" /> Profile Information
            </h3>

            {profileSuccessMsg && (
              <div className="mb-4 p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-brand-primary animate-slide-up">
                <CheckCircle size={16} /> {profileSuccessMsg}
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-danger animate-slide-up">
                <AlertCircle size={16} /> {profileErrorMsg}
              </div>
            )}

            {isUserLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-5 text-xs font-semibold">
                
                {/* Email Read-only */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="email" 
                      disabled
                      value={activeUser?.email || ''}
                      className="w-full bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-lg pl-9 pr-3 py-2.5 outline-none cursor-not-allowed font-medium"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">Email address is tied to your account identity and cannot be changed here.</span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                    Full Name
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Target Role */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                    Target Career Role
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="e.g. Senior Backend Engineer, AI Engineer, Full Stack Lead"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Bio / Summary */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                    Professional Summary / Bio
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Briefly describe your career background and key engineering interests..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" loading={updateProfileMutation.isPending} icon={<Check size={16} />}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {/* ── TAB 2: SECURITY & PASSWORD ── */}
        {activeTab === 'security' && (
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B] max-w-3xl">
            <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-6 flex items-center gap-2">
              <Key size={18} className="text-brand-primary" /> Password & Security
            </h3>

            {passwordSuccessMsg && (
              <div className="mb-4 p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-brand-primary animate-slide-up">
                <CheckCircle size={16} /> {passwordSuccessMsg}
              </div>
            )}

            {passwordErrorMsg && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-danger animate-slide-up">
                <AlertCircle size={16} /> {passwordErrorMsg}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={changePasswordMutation.isPending} icon={<Key size={16} />}>
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── TAB 3: AI PREFERENCES ── */}
        {activeTab === 'preferences' && (
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B] max-w-3xl">
            <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-6 flex items-center gap-2">
              <Bot size={18} className="text-brand-primary" /> AI Agent & Interview Preferences
            </h3>

            {prefSuccessMsg && (
              <div className="mb-4 p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-brand-primary animate-slide-up">
                <CheckCircle size={16} /> {prefSuccessMsg}
              </div>
            )}

            {prefErrorMsg && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-danger animate-slide-up">
                <AlertCircle size={16} /> {prefErrorMsg}
              </div>
            )}

            <form onSubmit={handlePreferencesSave} className="space-y-6 text-xs font-semibold">
              
              {/* Default Interview Difficulty */}
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                  Default Mock Interview Difficulty
                </label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg p-2.5 outline-none font-bold"
                >
                  <option value="Easy">Easy — Fundamental technical questions & straightforward scenarios</option>
                  <option value="Medium">Medium — Standard software engineering interviews (Recommended)</option>
                  <option value="Hard">Hard — Deep architectural trade-offs, edge cases & high pressure</option>
                </select>
              </div>

              {/* Model Routing Strategy */}
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                  AI Model Routing Engine
                </label>
                <select 
                  value={modelRouting}
                  onChange={(e) => setModelRouting(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg p-2.5 outline-none font-bold"
                >
                  <option value="auto">Auto Router — Dynamic balance between sub-second speed & depth (Recommended)</option>
                  <option value="groq">Groq Instant — Ultra low latency (~150ms speech & rapid text)</option>
                  <option value="openai">OpenAI GPT-4o — High reasoning depth for complex system design</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Brain className="text-brand-primary" size={20} />
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-white block">Enable Persistent Agent Memory</span>
                      <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Allow AI agents to recall your candidate skills and target career goals across chat sessions.</span>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enableAgentMemory}
                    onChange={(e) => setEnableAgentMemory(e.target.checked)}
                    className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Search className="text-brand-primary" size={20} />
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-white block">Enable Live Web Intelligence</span>
                      <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Allow AI agents to fetch live company tech stacks and recent engineering news via Tavily.</span>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enableLiveSearch}
                    onChange={(e) => setEnableLiveSearch(e.target.checked)}
                    className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={updatePreferencesMutation.isPending} icon={<Check size={16} />}>
                  Save AI Preferences
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── TAB 4: CAREER MEMORIES ── */}
        {activeTab === 'memory' && (
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B] max-w-3xl">
            <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4 flex items-center gap-2">
              <Database size={18} className="text-brand-primary" /> AI Agent Career Memory
            </h3>
            
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-medium">
              A.C.E. references these persistent user context facts during mock interviews, resume matching, and career planning sessions.
            </p>

            {memorySuccessMsg && (
              <div className="mb-4 p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-brand-primary animate-slide-up">
                <CheckCircle size={16} /> {memorySuccessMsg}
              </div>
            )}

            {memoryErrorMsg && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-danger animate-slide-up">
                <AlertCircle size={16} /> {memoryErrorMsg}
              </div>
            )}

            {/* Add memory form */}
            <form onSubmit={handleAddMemorySubmit} className="flex flex-col sm:flex-row gap-2.5 mb-6">
              <select 
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-xs outline-none font-bold"
              >
                <option value="Skill">Skill</option>
                <option value="Project">Project</option>
                <option value="Preference">Preference</option>
                <option value="Experience">Experience</option>
              </select>
              
              <input 
                type="text"
                required
                placeholder="e.g. 4+ years of Python FastAPI and Distributed Systems experience..."
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-primary"
              />

              <Button type="submit" size="sm" icon={<Plus size={14} />} loading={createMemoryMutation.isPending}>
                Add Fact
              </Button>
            </form>

            {/* List memories */}
            {isMemoriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : memories && memories.length > 0 ? (
              <div className="space-y-2.5">
                {memories.map((m: any, idx: number) => (
                  <div 
                    key={m.id || idx}
                    className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-xl text-xs font-medium hover:border-brand-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <Badge variant="blue" size="xs" className="flex-shrink-0">{m.category}</Badge>
                      <span className="text-neutral-700 dark:text-neutral-300 truncate">{m.memory_text}</span>
                    </div>
                    <button
                      type="button"
                      title="Delete memory item"
                      onClick={() => deleteMemoryMutation.mutate(m.id)}
                      disabled={deleteMemoryMutation.isPending}
                      className="text-neutral-400 hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                No custom agent memories saved yet. Add a career fact above to seed context.
              </div>
            )}
          </Card>
        )}

        {/* ── TAB 5: MEMBERSHIP PLAN ── */}
        {activeTab === 'membership' && (
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B] max-w-3xl">
            <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-6 flex items-center gap-2">
              <Shield size={18} className="text-brand-primary" /> Active Membership & Tiers
            </h3>

            <div className="p-6 bg-gradient-to-br from-brand-primary/10 via-transparent to-brand-primary/5 border border-brand-primary/20 rounded-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-neutral-800 dark:text-white">Pro Career Membership</h4>
                      <Badge variant="blue" size="xs" className="bg-brand-primary text-white">Active</Badge>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                      Full access to A.C.E. multi-agent career operating system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-brand-primary/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Zap size={16} className="text-brand-primary" /> 384-Dim Vector Candidate Embeddings
                </div>
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Zap size={16} className="text-brand-primary" /> Live Tavily Corporate Research Search
                </div>
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Zap size={16} className="text-brand-primary" /> ~150ms Groq Whisper STT Audio Streaming
                </div>
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Zap size={16} className="text-brand-primary" /> Zero-Disk Encryption & User Isolation
                </div>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
