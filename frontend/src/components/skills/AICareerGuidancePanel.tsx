import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react'

interface PrioritizedGap {
  skill: string
  priority: string
  reason: string
  evidence_sources: string[]
}

interface ProvenanceRecommendation {
  title: string
  priority: string
  reason: string
  source_metrics: string[]
  recommended_action: string
}

interface AICareerGuidancePanelProps {
  aiSynthesis?: string
  prioritizedGaps: PrioritizedGap[]
  recommendations: ProvenanceRecommendation[]
  targetRole: string
  coveragePercentage: number
}

export const AICareerGuidancePanel: React.FC<AICareerGuidancePanelProps> = ({
  aiSynthesis,
  prioritizedGaps,
  recommendations,
  targetRole,
  coveragePercentage
}) => {
  const topGap = prioritizedGaps.find(g => g.priority === 'high') || prioritizedGaps[0]

  return (
    <div className="space-y-4">
      {/* AI Synthesis Summary Card */}
      <Card className="p-5 border border-brand-primary/20 bg-gradient-to-br from-white via-[#faf9f6] to-brand-sage/20 dark:from-[#18291E] dark:via-[#18291E] dark:to-[#0D2B1D] shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1 rounded-md bg-brand-primary/10 text-brand-primary">
            <Sparkles size={14} className="animate-pulse-dot" />
          </span>
          <h3 className="text-xs font-extrabold text-brand-primary uppercase tracking-widest">
            A.C.E. Career Intelligence Synthesis
          </h3>
        </div>

        <p className="text-2xs text-neutral-700 dark:text-neutral-200 font-medium leading-relaxed">
          {aiSynthesis || `Target role skill coverage for ${targetRole} is currently ${coveragePercentage}%.`}
        </p>
      </Card>

      {/* Highest Priority Skill Gap Card */}
      {topGap && (
        <Card className="p-5 border-l-4 border-l-amber-500 border-y border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E]">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                Highest Impact Gap Blocker
              </span>
            </div>
            <Badge variant="warning" className="text-[10px] uppercase">
              {topGap.priority} Priority
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-neutral-800 dark:text-white mb-1">
            {topGap.skill}
          </h4>

          <p className="text-2xs text-neutral-500 dark:text-neutral-400 font-medium mb-3 leading-relaxed">
            {topGap.reason}
          </p>

          <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
            <span>Sources: {topGap.evidence_sources.join(', ')}</span>
            <span className="text-brand-primary font-bold flex items-center gap-0.5">
              +15% Readiness Impact <TrendingUp size={10} />
            </span>
          </div>
        </Card>
      )}

      {/* Priority Gaps List */}
      {prioritizedGaps.length > 0 && (
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E]">
          <h3 className="text-2xs font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Target size={14} className="text-brand-primary" /> Validated Priority Skill Gaps ({prioritizedGaps.length})
          </h3>

          <div className="space-y-2">
            {prioritizedGaps.slice(0, 4).map((gap, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 flex justify-between items-center"
              >
                <div>
                  <h4 className="text-2xs font-bold text-neutral-800 dark:text-white">
                    {gap.skill}
                  </h4>
                  <p className="text-[10px] text-neutral-400 line-clamp-1 font-medium">
                    {gap.reason}
                  </p>
                </div>
                <Badge
                  variant={gap.priority === 'high' ? 'warning' : 'neutral'}
                  className="text-[9px] uppercase font-bold ml-2 whitespace-nowrap"
                >
                  {gap.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Provenance Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E]">
          <h3 className="text-2xs font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-brand-primary" /> Actionable Provenance Strategy
          </h3>

          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-brand-primary/10 bg-brand-light/20 dark:bg-brand-primary/5 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-2xs font-bold text-neutral-800 dark:text-white">
                    {rec.title}
                  </h4>
                  <Badge variant="blue" className="text-[9px] uppercase">
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-normal">
                  {rec.recommended_action}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
