import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Flame,
  ArrowRight,
  Edit3,
  CheckSquare
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
    <div className="flex flex-col gap-4">
      {/* Top Banner / Executive Workspace Strip */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-[#0D2B1D] via-[#18291E] to-[#234F45] text-white p-6 rounded-2xl shadow-elevated border border-brand-primary/30">
        
        {/* Left: Role Info & Readiness Score */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-brand-sage/80 bg-white/10 px-2.5 py-1 rounded-md border border-white/10">
              Career Roadmap Target
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{targetRole}</h2>
              <button
                onClick={onOpenRoleSetup}
                className="p-1.5 text-brand-sage hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Change Target Role"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 max-w-xl">
            <div className="flex-1">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="text-brand-sage">Role Readiness Coverage</span>
                <span className="text-white font-extrabold">{coveragePercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-brand-sage via-[#10B981] to-[#336659] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, coveragePercentage))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Metric Badges */}
        <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
            <div className="text-metric font-black text-brand-sage leading-none">{completedCount}</div>
            <div className="text-[10px] uppercase font-bold text-neutral-300 mt-1">Completed</div>
          </div>

          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
            <div className="text-metric font-black text-emerald-400 leading-none">{remainingCount}</div>
            <div className="text-[10px] uppercase font-bold text-neutral-300 mt-1">Gaps Left</div>
          </div>

          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
            <div className="text-metric font-black text-white leading-none">{totalEffortHours}h</div>
            <div className="text-[10px] uppercase font-bold text-neutral-300 mt-1">Est. Effort</div>
          </div>
        </div>

      </div>

      {/* Grid: Commitment Selector + Next Best Skill Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Weekly Commitment Calculator */}
        <Card className="lg:col-span-1 p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} className="text-brand-primary" /> Velocity Commitment
              </span>
              <span className="text-xs font-bold text-brand-primary bg-brand-light dark:bg-brand-primary/20 px-2 py-0.5 rounded-md">
                ~{estimatedWeeks} Weeks
              </span>
            </div>

            <p className="text-2xs text-neutral-500 dark:text-neutral-400 mb-3 font-medium">
              Select your weekly study commitment to project your role-ready completion date.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {([5, 10, 15] as const).map((hrs) => (
                <button
                  key={hrs}
                  onClick={() => setWeeklyCommitment(hrs)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    weeklyCommitment === hrs
                      ? 'bg-brand-hover text-white border-brand-hover shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-brand-primary/40'
                  }`}
                >
                  {hrs}h / wk
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-2xs text-neutral-500 border-t border-neutral-100 dark:border-neutral-800/80 pt-2 font-medium">
            <span>Pace: {weeklyCommitment === 5 ? 'Steady' : weeklyCommitment === 10 ? 'Accelerated' : 'Sprint'}</span>
            <span className="text-brand-primary font-bold">Target Ready in ~{estimatedWeeks} wks</span>
          </div>
        </Card>

        {/* Next Best Skill Recommendation Banner */}
        <Card className="lg:col-span-2 p-5 border-l-4 border-l-brand-primary border-y border-r border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-brand-sage/20 via-white to-white dark:from-brand-primary/10 dark:via-[#18291E] dark:to-[#18291E] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-brand-primary/10 text-brand-primary">
                <Sparkles size={14} className="animate-pulse-dot" />
              </span>
              <span className="text-2xs font-extrabold text-brand-primary uppercase tracking-widest">
                Highest Priority Action Node
              </span>
              {nextBestSkill && (
                <Badge variant="success">
                  {nextBestSkill.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                </Badge>
              )}
            </div>

            {nextBestSkill ? (
              <>
                <h3 className="text-base font-bold text-neutral-800 dark:text-white">
                  Focus Next on: <span className="text-brand-primary">{nextBestSkill.name}</span>
                </h3>
                <p className="text-2xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed font-medium">
                  {nextBestSkill.reason}
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500 font-medium">
                All roadmap prerequisite gaps are completed for {targetRole}!
              </p>
            )}
          </div>

          {nextBestSkill && (
            <Button
              onClick={() => onSelectNextSkill(nextBestSkill.id)}
              iconRight={<ArrowRight size={14} />}
              className="bg-brand-hover hover:bg-brand-hover/90 text-white font-bold whitespace-nowrap"
            >
              Inspect Skill Node
            </Button>
          )}
        </Card>

      </div>
    </div>
  )
}
