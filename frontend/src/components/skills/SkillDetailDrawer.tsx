import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkillNodeData } from './InteractiveRoadmapGraph'
import {
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Target,
  BookOpen,
  Code2,
  Check,
  AlertTriangle,
  MessageSquare,
  Award,
  Zap
} from 'lucide-react'

interface SkillDetailDrawerProps {
  skill: SkillNodeData | null
  targetRole: string
  verifiedSkills: string[]
}

export const SkillDetailDrawer: React.FC<SkillDetailDrawerProps> = ({
  skill,
  targetRole,
  verifiedSkills
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  if (!skill) {
    return (
      <Card className="p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E] h-full flex flex-col items-center justify-center text-center text-neutral-400">
        <Target size={36} className="text-neutral-300 dark:text-neutral-700 mb-3 animate-pulse" />
        <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
          No Skill Selected
        </h3>
        <p className="text-2xs text-neutral-400 max-w-xs font-medium">
          Select any skill node in the roadmap workspace to view full career diagnosis, market relevance, prerequisites, and learning resources.
        </p>
      </Card>
    )
  }

  const isAlreadyVerified = verifiedSkills.some(s => s.toLowerCase() === skill.name.toLowerCase()) || skill.status === 'completed'

  const handleMarkAsCompleted = async () => {
    if (isAlreadyVerified) return
    setIsUpdating(true)
    try {
      const updatedSkills = Array.from(new Set([...verifiedSkills, skill.name]))
      await authApi.updateProfile({
        preferences: { verified_skills_override: updatedSkills }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['careerIntelligence'] }),
        queryClient.invalidateQueries({ queryKey: ['latestResume'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      ])
      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to update skill verification', e)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAskAgent = () => {
    const promptMessage = `Can you provide a structured, practical learning plan and interview prep strategy for ${skill.name} as required for a ${targetRole}?`
    navigate('/career', { state: { initialPrompt: promptMessage } })
  }

  return (
    <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E] h-full flex flex-col justify-between shadow-card animate-fade-in">
      <div className="space-y-5">
        
        {/* Drawer Header */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
              Skill Diagnostic Panel
            </span>
            {skill.status === 'completed' && (
              <Badge variant="neutral" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold">
                ✓ VERIFIED
              </Badge>
            )}
            {skill.status === 'focus' && (
              <Badge variant="blue" className="bg-brand-hover text-white font-extrabold">
                ● CURRENT FOCUS
              </Badge>
            )}
            {skill.status === 'recommended' && (
              <Badge variant="cyan" className="bg-brand-sage/60 dark:bg-brand-primary/20 text-brand-primary font-extrabold">
                RECOMMENDED
              </Badge>
            )}
            {skill.status === 'blocked' && (
              <Badge variant="warning" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 font-extrabold">
                🔒 BLOCKED
              </Badge>
            )}
          </div>

          <h2 className="text-xl font-extrabold text-neutral-800 dark:text-white tracking-tight mb-1">
            {skill.name}
          </h2>

          <div className="flex items-center gap-4 text-2xs font-semibold text-neutral-500 dark:text-neutral-400 mt-2">
            <span className="flex items-center gap-1 text-brand-primary font-bold">
              <Zap size={12} /> {skill.impact === 'high' ? 'High Target Impact' : 'Medium Impact'}
            </span>
            <span>Est. {skill.effort}</span>
          </div>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        {/* Prerequisites Checklist */}
        {skill.prereqs && skill.prereqs.length > 0 && (
          <div>
            <h4 className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Lock size={12} className="text-brand-primary" /> Dependency Prerequisites
            </h4>
            <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              {skill.prereqs.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-2xs font-semibold">
                  <span className={p.met ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'}>
                    {p.name}
                  </span>
                  {p.met ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                      <CheckCircle2 size={12} /> Met
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-1 text-[10px]">
                      <AlertTriangle size={12} /> Missing
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A.C.E. Career Rationale */}
        <div>
          <h4 className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Sparkles size={12} className="text-brand-primary" /> A.C.E. Career Rationale
          </h4>
          <p className="text-2xs text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed bg-brand-sage/20 dark:bg-brand-primary/10 p-3 rounded-xl border border-brand-primary/10">
            {skill.reason}
          </p>
        </div>

        {/* Key Core Topics to Master */}
        <div>
          <h4 className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <BookOpen size={12} className="text-brand-primary" /> Key Concepts & Architecture
          </h4>
          <ul className="text-2xs text-neutral-600 dark:text-neutral-300 font-medium space-y-1 list-disc list-inside pl-1">
            <li>Core principles & system architecture patterns for {skill.name}</li>
            <li>Production error handling, concurrency, and performance tuning</li>
            <li>Real-world interview problem scenarios for {targetRole}</li>
          </ul>
        </div>

        {/* Practical Application Challenge */}
        <div>
          <h4 className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Code2 size={12} className="text-brand-primary" /> Practical Project Application
          </h4>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400 font-medium leading-normal bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
            Implement a working module or mini-project utilizing {skill.name} to demonstrate practical evidence on your resume.
          </p>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <Button
          fullWidth
          icon={<MessageSquare size={14} />}
          onClick={handleAskAgent}
          className="bg-brand-hover hover:bg-brand-hover/90 text-white font-bold"
        >
          Ask A.C.E. Agent for Study Plan
        </Button>

        {!isAlreadyVerified && (
          <Button
            fullWidth
            variant="secondary"
            isLoading={isUpdating}
            icon={<Check size={14} />}
            onClick={handleMarkAsCompleted}
            className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {updateSuccess ? 'Verified!' : 'Mark Skill as Verified'}
          </Button>
        )}
      </div>
    </Card>
  )
}
