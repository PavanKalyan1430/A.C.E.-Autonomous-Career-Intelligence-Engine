import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit3,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Hourglass
} from 'lucide-react'

interface ExecutiveSummaryHeaderProps {
  targetRole: string
  coveragePercentage: number
  completedCount: number
  remainingCount: number
  totalEffortHours: number
  nextBestSkill: {
    id: string
    name: string
    reason: string
    impact: string
    effort: string
  } | null
  onOpenRoleSetup: () => void
  onSelectNextSkill: (skillId: string) => void
}

export const ExecutiveSummaryHeader: React.FC<ExecutiveSummaryHeaderProps> = ({
  targetRole,
  coveragePercentage,
  completedCount,
  remainingCount,
  totalEffortHours,
  nextBestSkill,
  onOpenRoleSetup,
  onSelectNextSkill
}) => {
  const [weeklyCommitment, setWeeklyCommitment] = useState<5 | 10 | 15>(10)

  // Calculate estimated weeks to complete remaining effort
  const estimatedWeeks = totalEffortHours > 0
    ? (totalEffortHours / weeklyCommitment).toFixed(1)
    : '0'

  return (
    <div className="flex flex-col gap-5">
      {/* ── TOP HERO / READINESS BANNER ────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#062C22] via-[#0D2B1D] to-[#0A3D2E] text-white p-6 md:p-7 border border-[#10B981]/25 shadow-2xl">
        {/* Subtle Radial Glow in Background */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-64 h-64 rounded-full bg-[#34D399]/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Left Side: Target Role & Readiness Bar */}
          <div className="flex-1 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#34D399] bg-[#10B981]/15 px-3 py-1 rounded-md border border-[#10B981]/30">
                Target Role
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{targetRole}</h2>
                <button
                  onClick={onOpenRoleSetup}
                  className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Edit Target Role"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>

            {/* Role Readiness Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-200 font-medium">Role Readiness Coverage</span>
                <span className="text-emerald-400 font-black text-sm">{coveragePercentage}%</span>
              </div>
              
              <div className="w-full h-3 bg-black/50 rounded-full p-0.5 border border-white/10 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#059669] rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(0, coveragePercentage))}%` }}
                />
              </div>
              
              <p className="text-2xs text-neutral-300 font-medium pt-0.5">
                {coveragePercentage >= 80 
                  ? 'Excellent alignment! Near role-ready target.' 
                  : `You're on track. ${remainingCount} key gap${remainingCount === 1 ? '' : 's'} to go.`}
              </p>
            </div>
          </div>

          {/* Right Side: Key Metrics Row */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
            {/* Metric 1: Completed */}
            <div className="px-4 py-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl text-center min-w-[100px] flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={16} className="text-[#34D399]" />
                <span className="text-2xl font-black text-white leading-none">{completedCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300">Completed</span>
            </div>

            {/* Metric 2: Gaps Left */}
            <div className="px-4 py-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl text-center min-w-[100px] flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={16} className="text-emerald-400" />
                <span className="text-2xl font-black text-emerald-400 leading-none">{remainingCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300">Gaps Left</span>
            </div>

            {/* Metric 3: Est Effort */}
            <div className="px-4 py-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl text-center min-w-[100px] flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <Hourglass size={16} className="text-emerald-300" />
                <span className="text-2xl font-black text-white leading-none">{totalEffortHours}h</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300">Est. Effort</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUB-HERO CARDS: NEXT BEST ACTION & VELOCITY COMMITMENT ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Next Best Action Card (Left/Main prominence) */}
        <Card className="lg:col-span-2 p-5 border border-emerald-500/20 bg-gradient-to-br from-[#FBFBFA] via-[#F5F5F0] to-[#EAECE6] dark:from-[#18291E] dark:via-[#132319] dark:to-[#0D2B1D] rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#10B981]/15 text-[#10B981] dark:text-[#34D399]">
                  <Sparkles size={15} />
                </span>
                <span className="text-[10px] font-extrabold text-[#0D4738] dark:text-[#34D399] uppercase tracking-widest">
                  Next Best Action
                </span>
              </div>
              {nextBestSkill && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#0D4738] dark:text-[#34D399] text-[10px] font-extrabold">
                  {nextBestSkill.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                </span>
              )}
            </div>

            {nextBestSkill ? (
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  Focus Next on: <span className="text-[#0D4738] dark:text-[#34D399] underline decoration-emerald-500/40">{nextBestSkill.name}</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed max-w-2xl">
                  {nextBestSkill.reason}
                </p>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 font-medium py-2">
                All roadmap prerequisite gaps are completed for {targetRole}!
              </p>
            )}
          </div>

          {nextBestSkill && (
            <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800 flex justify-end">
              <Button
                onClick={() => onSelectNextSkill(nextBestSkill.id)}
                iconRight={<ArrowRight size={14} />}
                className="bg-[#0D4738] hover:bg-[#062C22] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.01]"
              >
                Inspect Skill Node
              </Button>
            </div>
          )}
        </Card>

        {/* Velocity Commitment Selector */}
        <Card className="lg:col-span-1 p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E] rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} className="text-[#10B981]" /> Velocity Commitment
              </span>
              <span className="text-xs font-bold text-[#0D4738] dark:text-[#34D399] bg-[#10B981]/15 px-2.5 py-0.5 rounded-md border border-[#10B981]/25">
                ~{estimatedWeeks} Weeks
              </span>
            </div>

            <p className="text-2xs text-neutral-500 dark:text-neutral-400 mb-3 font-medium leading-normal">
              Select your weekly study commitment to project your role-ready completion date.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {([5, 10, 15] as const).map((hrs) => (
                <button
                  key={hrs}
                  onClick={() => setWeeklyCommitment(hrs)}
                  className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                    weeklyCommitment === hrs
                      ? 'bg-[#0D4738] text-white border-[#0D4738] shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-[#10B981]/40'
                  }`}
                >
                  {hrs}h / wk
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-2xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/80 pt-2 font-medium">
            <span>Pace: {weeklyCommitment === 5 ? 'Steady' : weeklyCommitment === 10 ? 'Accelerated' : 'Sprint'}</span>
            <span className="text-[#0D4738] dark:text-[#34D399] font-bold">Target Ready in ~{estimatedWeeks} wks</span>
          </div>
        </Card>

      </div>
    </div>
  )
}
