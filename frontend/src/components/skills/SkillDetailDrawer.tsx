import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { SkillNodeData } from './InteractiveRoadmapGraph'
import {
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Target,
  BookOpen,
  Code2,
  Check,
  AlertCircle,
  MessageSquare,
  Zap,
  CheckSquare
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
      <Card className="p-8 border border-neutral-200 dark:border-neutral-800 bg-[#FDFDFB] dark:bg-[#18291E] h-full flex flex-col items-center justify-center text-center text-neutral-400 rounded-2xl min-h-[400px]">
        <div className="w-14 h-14 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mb-4 border border-[#10B981]/30">
          <Target size={28} className="animate-pulse" />
        </div>
        <h3 className="text-base font-black text-neutral-800 dark:text-white mb-1 tracking-tight">
          No Skill Selected
        </h3>
        <p className="text-2xs text-neutral-500 dark:text-neutral-400 max-w-xs font-medium leading-relaxed">
          Select any node in the roadmap workspace to view target market diagnosis, prerequisite checklists, and AI learning guidance.
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
    <Card className="p-6 md:p-7 border border-neutral-200 dark:border-neutral-800 bg-[#FDFDFB] dark:bg-[#18291E] rounded-2xl shadow-md flex flex-col justify-between animate-fade-in space-y-6">
      <div className="space-y-5">
        
        {/* Drawer Header */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0D4738] dark:text-[#34D399] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#10B981]" /> Skill Diagnostic Panel
            </span>
            {skill.status === 'completed' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#065F46] dark:text-emerald-300 font-black text-[10px] border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={11} /> VERIFIED
              </span>
            )}
            {skill.status === 'focus' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#10B981] text-white font-black text-[10px] shadow-sm">
                ● CURRENT FOCUS
              </span>
            )}
            {skill.status === 'recommended' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#0D4738] dark:text-[#34D399] font-black text-[10px] border border-[#10B981]/30">
                RECOMMENDED
              </span>
            )}
            {skill.status === 'blocked' && (
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-black text-[10px] flex items-center gap-1">
                <Lock size={10} /> BLOCKED
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight mb-1">
            {skill.name}
          </h2>

          <div className="flex items-center gap-4 text-2xs font-bold text-neutral-500 dark:text-neutral-400 mt-2">
            <span className="flex items-center gap-1 text-[#0D4738] dark:text-[#34D399] font-extrabold">
              <Zap size={13} /> {skill.impact === 'high' ? 'High Target Impact' : 'Medium Impact'}
            </span>
            <span>Estimated Effort: {skill.estimated_effort_hours ? `${skill.estimated_effort_hours}h` : 'N/A'}</span>
          </div>
        </div>

        <div className="h-px bg-neutral-200/80 dark:bg-neutral-800" />

        {/* Prerequisites Checklist */}
        {skill.prerequisites && skill.prerequisites.length > 0 && (
          <div>
            <h4 className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Lock size={12} className="text-[#10B981]" /> Dependency Prerequisites
            </h4>
            <div className="space-y-2 bg-[#F5F5F0] dark:bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800">
              {skill.prerequisites.map((p: { name: string; met: boolean }, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-2xs font-semibold">
                  <span className={p.met ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'}>
                    {p.name}
                  </span>
                  {p.met ? (
                    <span className="text-[#065F46] dark:text-[#34D399] font-black flex items-center gap-1 text-[10px]">
                      <CheckCircle2 size={12} /> Met
                    </span>
                  ) : (
                    <span className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1 text-[10px] bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                      <Lock size={10} /> Missing
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A.C.E. Career Rationale */}
        <div>
          <h4 className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#10B981]" /> A.C.E. Career Rationale
          </h4>
          <div className="text-2xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed bg-[#10B981]/10 dark:bg-[#10B981]/10 p-3.5 rounded-xl border border-[#10B981]/20">
            {skill.reason}
          </div>
        </div>

        {/* Key Core Topics to Master */}
        <div>
          <h4 className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <BookOpen size={12} className="text-[#10B981]" /> Key Concepts & Architecture
          </h4>
          <ul className="text-2xs text-neutral-700 dark:text-neutral-300 font-medium space-y-1.5 list-disc list-inside pl-1">
            <li>Core principles & system architecture patterns for {skill.name}</li>
            <li>Production error handling, concurrency, and performance tuning</li>
            <li>Real-world interview problem scenarios for {targetRole}</li>
          </ul>
        </div>

        {/* Practical Application Challenge */}
        <div>
          <h4 className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Code2 size={12} className="text-[#10B981]" /> Practical Project Application
          </h4>
          <p className="text-2xs text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed bg-[#F5F5F0] dark:bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800">
            Implement a working module or mini-project utilizing {skill.name} to demonstrate practical evidence on your resume.
          </p>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-4 border-t border-neutral-200/80 dark:border-neutral-800">
        <Button
          fullWidth
          icon={<MessageSquare size={14} />}
          onClick={handleAskAgent}
          className="bg-[#0D4738] hover:bg-[#062C22] text-white font-extrabold shadow-sm py-2.5 rounded-xl"
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
            className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
          >
            {updateSuccess ? 'Verified!' : 'Mark Skill as Verified'}
          </Button>
        )}
      </div>
    </Card>
  )
}
