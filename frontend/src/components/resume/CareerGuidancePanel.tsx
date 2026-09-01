import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, Star } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Layers } from 'lucide-react'

interface MissingKeyword {
  keyword: string
  priority: string
  reason?: string
  where_it_matters?: string
}

interface CareerGuidancePanelProps {
  missingKeywords: MissingKeyword[]
  targetRole: string
  learningRoadmap?: any[]
}

/**
 * Pure Data-Driven AI Career Guidance Panel.
 * ZERO hardcoded strings or invented percentage bullets.
 */
export const CareerGuidancePanel: React.FC<CareerGuidancePanelProps> = ({
  missingKeywords,
  targetRole,
  learningRoadmap = [],
}) => {
  const navigate = useNavigate()
  const topGap = missingKeywords.find((k) => k.priority?.toLowerCase() === 'high') ?? missingKeywords[0]

  // Collect real reasons from API only — no template strings
  const realReasons: string[] = []
  if (topGap) {
    if (topGap.where_it_matters) realReasons.push(topGap.where_it_matters)
    if (topGap.reason) realReasons.push(topGap.reason)
    const roadmapMatch = learningRoadmap.find((n: any) =>
      n.name?.toLowerCase().includes(topGap.keyword.toLowerCase())
    )
    if (roadmapMatch?.reason) realReasons.push(roadmapMatch.reason)
  }

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 h-full flex flex-col justify-between">

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white">AI Career Guidance</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-light dark:bg-brand-primary/15 border border-brand-primary/20 text-[9px] font-bold text-brand-primary tracking-wider uppercase">
            BETA
          </span>
        </div>

        {!topGap ? (
          <div className="py-6">
            <EmptyState
              icon={<Layers size={16} />}
              title="No critical gaps identified"
              description="Your resume covers the key requirements for your target role well."
              compact
            />
          </div>
        ) : (
          <>
            {/* Highest Impact Gap box */}
            <div className="mb-5">
              <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Highest Impact Gap
              </div>
              <div className="p-3.5 rounded-xl bg-brand-light/40 dark:bg-brand-primary/10 border border-brand-primary/20">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-[14px] font-extrabold text-neutral-900 dark:text-white leading-tight">
                    {topGap.keyword}
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[9px] font-extrabold border border-brand-primary/20 uppercase">
                    <Star size={9} fill="currentColor" /> {topGap.priority?.toUpperCase() || 'HIGH'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Missing capability for {targetRole || 'target role'}.
                </p>
              </div>
            </div>

            {/* Why fix this next? (Rendered ONLY if real API reasons exist) */}
            {realReasons.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
                  Why fix this next?
                </div>
                <div className="space-y-2">
                  {realReasons.map((point, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <CheckCircle size={13} className="text-brand-primary flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Button */}
      <div className="pt-3">
        <button
          onClick={() => navigate('/skills')}
          className="w-full py-2.5 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-brand-primary/30 hover:bg-brand-light/30 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 group"
        >
          <span>View Learning Path</span>
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  )
}
