import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, careerApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Target, Search, Sparkles, Check, ArrowRight, Briefcase } from 'lucide-react'

interface TargetRoleGuidedSetupProps {
  currentRole?: string
  onCompleted?: () => void
  isInline?: boolean
}

const POPULAR_ROLES = [
  'Senior Backend Engineer',
  'AI / ML Engineer',
  'Full Stack Developer',
  'DevOps & Platform Engineer',
  'System Architect',
  'Frontend Specialist'
]

export const TargetRoleGuidedSetup: React.FC<TargetRoleGuidedSetupProps> = ({
  currentRole = '',
  onCompleted,
  isInline = false
}) => {
  const queryClient = useQueryClient()
  const [roleInput, setRoleInput] = useState(currentRole)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setRoleInput(val)
    setErrorMsg('')

    if (val.trim().length >= 2) {
      try {
        const res = await careerApi.searchRoles(val)
        if (Array.isArray(res.data)) {
          const titles = res.data.map((r: any) => r.title || r.name || r).filter(Boolean)
          setSuggestions(titles.slice(0, 5))
        }
      } catch {
        // Fallback silently if provider unconfigured
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }

  const handleSaveRole = async (targetRoleToSave: string) => {
    const role = targetRoleToSave.trim()
    if (!role) {
      setErrorMsg('Please specify a target role to build your roadmap.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')
    try {
      await authApi.updateProfile({ target_role: role })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['careerIntelligence'] }),
        queryClient.invalidateQueries({ queryKey: ['latestResume'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      ])
      if (onCompleted) onCompleted()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update target role. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={`${isInline ? 'p-6' : 'p-8 max-w-xl mx-auto'} border border-brand-primary/20 bg-gradient-to-b from-white to-brand-sage/10 dark:from-[#18291E] dark:to-[#0D2B1D] shadow-elevated`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
          <Target size={22} className="animate-pulse-dot" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-800 dark:text-white">
            {currentRole ? 'Update Target Career Role' : 'Set Your Target Career Role'}
          </h2>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400 font-medium">
            ACE synthesizes real-time market requirements and prerequisites based on your selection.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSaveRole(roleInput) }} className="space-y-4">
        <div className="relative">
          <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
            Target Job Title
          </label>
          <div className="relative">
            <input
              type="text"
              value={roleInput}
              onChange={handleInputChange}
              placeholder="e.g. Senior Backend Engineer, AI/ML Specialist..."
              className="w-full px-4 py-2.5 pl-10 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
            />
            <Search size={16} className="absolute left-3 top-3 text-neutral-400" />
          </div>

          {/* Autocomplete suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-[#18291E] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-dropdown overflow-hidden animate-fade-in">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRoleInput(sug)
                    setSuggestions([])
                    handleSaveRole(sug)
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-brand-sage/30 dark:hover:bg-brand-primary/20 flex items-center justify-between transition-colors"
                >
                  <span>{sug}</span>
                  <ArrowRight size={12} className="text-brand-primary" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick select pills */}
        <div>
          <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={12} className="text-brand-primary" /> Popular Career Paths
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleInput(role)
                  handleSaveRole(role)
                }}
                className={`px-3 py-1.5 rounded-lg text-2xs font-semibold border transition-all ${
                  roleInput.toLowerCase() === role.toLowerCase()
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-brand-primary/40'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <p className="text-2xs text-danger font-semibold bg-danger-light p-2 rounded-lg border border-danger-border">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={!roleInput.trim()}
            icon={<Check size={16} />}
            className="bg-brand-hover hover:bg-brand-hover/90 text-white font-bold"
          >
            Generate Career Roadmap
          </Button>
        </div>
      </form>
    </Card>
  )
}
