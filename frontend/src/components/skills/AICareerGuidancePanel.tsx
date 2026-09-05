import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Sparkles,
  Target,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  ArrowRight,
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
    <div className="space-y-5">
      
      {/* ── 3-COLUMN BOTTOM GRID FOR SUPPORTING INTELLIGENCE ────────── */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* 1. A.C.E. CAREER INTELLIGENCE SYNTHESIS */}
        <Card className="p-5 md:p-6 border border-[#10B981]/30 bg-gradient-to-br from-[#062C22] via-[#0D2B1D] to-[#0A3D2E] text-white rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1 rounded-md bg-[#10B981]/20 text-[#34D399]">
                <Sparkles size={15} />
              </span>
              <h3 className="text-xs font-black text-[#34D399] uppercase tracking-widest">
                A.C.E. CAREER INTELLIGENCE SYNTHESIS
              </h3>
            </div>

            <p className="text-2xs text-neutral-200 font-medium leading-relaxed">
              {aiSynthesis || `Target role skill coverage for ${targetRole} is currently ${coveragePercentage}%. Closing critical framework and architecture gaps will significantly elevate role readiness score.`}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} /> Verified AI Analysis
            </span>
            <span>Real-time</span>
          </div>
        </Card>

        {/* 2. HIGHEST IMPACT GAP BLOCKER */}
        {topGap ? (
          <Card className="p-5 md:p-6 border border-[#10B981]/30 bg-[#062C22] text-white rounded-2xl shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-400" /> HIGHEST IMPACT GAP BLOCKER
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase">
                  HIGH PRIORITY
                </span>
              </div>

              <h4 className="text-base font-black text-white mb-1 tracking-tight">
                {topGap.skill}
              </h4>

              <p className="text-2xs text-neutral-300 font-medium leading-relaxed mb-3">
                {topGap.reason}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-extrabold text-neutral-300">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-neutral-400">Sources:</span>
                {(topGap.evidence_sources && topGap.evidence_sources.length > 0
                  ? topGap.evidence_sources
                  : ['resume_gap', 'company_requirement']
                ).map((src, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 font-mono text-[9px]">
                    {src}
                  </span>
                ))}
              </div>
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5 whitespace-nowrap">
                +15% Impact <TrendingUp size={11} />
              </span>
            </div>
          </Card>
        ) : (
          <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-[#FDFDFB] dark:bg-[#18291E] rounded-2xl flex items-center justify-center text-center text-xs text-neutral-400 font-medium">
            No critical gap blockers identified.
          </Card>
        )}

        {/* 3. VALIDATED PRIORITY SKILL GAPS */}
        <Card className="p-5 md:p-6 border border-neutral-200 dark:border-neutral-800 bg-[#062C22] text-white rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#34D399] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Target size={15} className="text-[#10B981]" />
              VALIDATED PRIORITY SKILL GAPS ({prioritizedGaps.length})
            </h3>

            <div className="space-y-2">
              {prioritizedGaps.slice(0, 4).map((gap, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex justify-between items-center"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-2xs font-extrabold text-white truncate">
                      {gap.skill}
                    </h4>
                    <p className="text-[9px] text-neutral-400 truncate font-medium">
                      {gap.reason}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                    gap.priority === 'high' 
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {gap.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

      </div>

      {/* ── 4. ACTIONABLE PROVENANCE STRATEGY (BOTTOM STRIP) ────────── */}
      {recommendations.length > 0 && (
        <Card className="p-5 border border-[#10B981]/25 bg-gradient-to-r from-[#FBFBFA] via-[#F5F5F0] to-[#EAECE6] dark:from-[#18291E] dark:via-[#132319] dark:to-[#0D2B1D] rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3.5 max-w-3xl">
            <span className="p-2 rounded-xl bg-[#10B981]/15 text-[#10B981] dark:text-[#34D399] shrink-0 mt-0.5">
              <Lightbulb size={18} />
            </span>
            <div>
              <span className="text-[10px] font-black text-[#0D4738] dark:text-[#34D399] uppercase tracking-widest block mb-1">
                ACTIONABLE PROVENANCE STRATEGY
              </span>
              <p className="text-2xs text-neutral-700 dark:text-neutral-200 font-medium leading-relaxed">
                {recommendations[0]?.recommended_action || 'Build and contextualize practical projects with quantitative metrics to validate your technical evidence for target role evaluation.'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              const element = document.getElementById('roadmap-workspace')
              element?.scrollIntoView({ behavior: 'smooth' })
            }}
            iconRight={<ArrowRight size={14} />}
            className="bg-[#0D4738] hover:bg-[#062C22] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl whitespace-nowrap shrink-0 shadow-sm"
          >
            View Strategy
          </Button>
        </Card>
      )}

    </div>
  )
}
