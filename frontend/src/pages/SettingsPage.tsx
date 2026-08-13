import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoryApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Settings,
  User as UserIcon,
  Shield,
  Key,
  Database,
  CheckCircle,
  Plus,
  Trash2,
  Trash,
  Sparkles
} from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  
  // Settings values
  const [profileName, setProfileName] = useState('Pavan Kalyan')
  const [profileRole, setProfileRole] = useState('Backend Engineer')
  const [difficulty, setDifficulty] = useState('Medium')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Memory states
  const [newMemoryCategory, setNewMemoryCategory] = useState('Skill')
  const [newMemoryText, setNewMemoryText] = useState('')

  // 1. Fetch AI career agent context memories from database
  const { data: memories, isLoading: isMemoriesLoading } = useQuery({
    queryKey: ['memoriesList'],
    queryFn: async () => {
      // If endpoint doesn't exist, return empty array as safety fallback
      try {
        const res = await memoryApi.getAll()
        return res.data
      } catch (err) {
        return []
      }
    }
  })

  // 2. Mutation: Create memory context item
  const createMemoryMutation = useMutation({
    mutationFn: async (vars: { category: string; text: string }) => {
      const res = await memoryApi.create(vars.category, vars.text)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoriesList'] })
      setNewMemoryText('')
    }
  })

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemoryText.trim()) return
    createMemoryMutation.mutate({
      category: newMemoryCategory,
      text: newMemoryText.trim()
    })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in text-neutral-700 dark:text-neutral-300 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Settings</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Manage your career profile preferences and A.C.E. agent context memories.</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-1.5 text-2xs font-semibold text-brand-primary animate-slide-up">
          <CheckCircle size={14} /> Profile preferences saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: General Profile Settings */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B]">
            <h3 className="text-xs font-bold text-[#3d3d3d] dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-4 flex items-center gap-2">
              <UserIcon size={16} className="text-brand-primary" /> General Profile
            </h3>

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Profile Full Name</label>
                <input 
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Target Career Role</label>
                <input 
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Default Mock Interview Difficulty</label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none font-semibold"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* AI agent context memory block */}
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B]">
            <h3 className="text-xs font-bold text-[#3d3d3d] dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-4 flex items-center gap-2">
              <Database size={16} className="text-brand-primary" /> AI Career Memory
            </h3>
            
            <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-normal mb-4 font-medium">
              A.C.E. references these persistent memory facts during mock interviews and career planning chats.
            </p>

            {/* Add memory fact */}
            <form onSubmit={handleAddMemorySubmit} className="flex gap-2.5 mb-6">
              <select 
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg px-2.5 py-2 text-2xs outline-none font-bold"
              >
                <option value="Skill">Skill</option>
                <option value="Project">Project</option>
                <option value="Preference">Preference</option>
              </select>
              
              <input 
                type="text"
                required
                placeholder="e.g. Prefer remote opportunities inside fintech domains..."
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg px-3 py-2 text-2xs outline-none focus:border-brand-primary"
              />

              <Button type="submit" size="sm" icon={<Plus size={14} />} loading={createMemoryMutation.isPending}>
                Add Fact
              </Button>
            </form>

            {/* list memories */}
            {isMemoriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : memories && memories.length > 0 ? (
              <div className="space-y-2">
                {memories.map((m: any, idx: number) => (
                  <div 
                    key={m.id || idx}
                    className="flex justify-between items-center p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg text-2xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="blue" size="xs">{m.category}</Badge>
                      <span className="text-neutral-600 dark:text-neutral-400">{m.memory_text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-400 dark:text-neutral-600 text-2xs">
                No memories saved yet. Type a fact above to seeding context.
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Account and billing */}
        <div className="space-y-6">
          <Card className="p-6 border border-neutral-200 dark:border-[#1E293B]">
            <h3 className="text-xs font-bold text-[#3d3d3d] dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-brand-primary" /> Membership Plan
            </h3>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-brand-primary/20">
                <Sparkles size={24} className="text-brand-primary animate-pulse-dot" />
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-[#3d3d3d] dark:text-white">Pro Career Membership</h4>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mt-1">Status: Active</p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-2xs text-neutral-500 font-medium leading-relaxed">
                Unlock dynamic candidate vector calculations, live Tavily corporate intelligence lookup, and Groq STT whisper loops.
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
