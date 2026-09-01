import React from 'react'
import { ArrowRight } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Layers } from 'lucide-react'

interface MissingKeyword {
  keyword: string
  priority: string
  reason?: string
}

interface CareerGuidancePanelProps {
  missingKeywords: MissingKeyword[]
  targetRole: string
  learningRoadmap?: any[]
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  high:   { bg: 'bg-brand-primary/10', text: 'text-brand-primary' },
  medium: { bg: 'bg-brand-ai/10',      text: 'text-brand-ai'      },
  low:    { bg: 'bg-neutral-100',       text: 'text-neutral-500'   },
}

/**
 * AI Career Guidance panel — shows the single highest-impact missing requirement.
 * All content (reason, priority, keyword) comes directly from the API response.
 * Nothing is fabricated or constructed from templates.
 */
export const CareerGuidancePanel: React.FC<CareerGuidancePanelProps> = ({
  missingKeywords,
  targetRole,
  learningRoadmap = [],
}) => {
  const topGap = missingKeywords.find((k) => k.priority?.toLowerCase() === 'high') ?? missingKeywords[0]

  // Collect real reasons only — from the keyword's own reason field or a matching roadmap node
  const realReasons: string[] = []
  if (topGap) {
    if (topGap.reason) realReasons.push(topGap.reason)
    const roadmapMatch = learningRoadmap.find((n: any) =>
      n.name?.toLowerCase().includes(topGap.keyword.toLowerCase())
    )
    if (roadmapMatch?.reason) realReasons.push(roadmapMatch.reason)
  }

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-neutral-800 dark:text-white">AI Career Guidance</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-sage/60 dark:bg-brand-primary/15 border border-brand-primary/20 text-[9px] font-bold text-brand-primary tracking-wider uppercase">
          BETA
        </span>
      </div>

      {!topGap ? (
        <div className="flex-1 flex items-center">
          <EmptyState
            icon={<Layers size={16} />}
            title="No critical gaps identified"
            description="Your resume covers the key requirements for your target role."
            compact
          />
        </div>
      ) : (
        <>
          {/* Highest impact gap */}
          <div className="mb-4">
            <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
              Highest Impact Gap
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-brand-light to-brand-sage/20 dark:from-brand-primary/10 dark:to-brand-primary/5 border border-brand-primary/15">
              <div>
                <div className="text-[13px] font-bold text-neutral-800 dark:text-white">{topGap.keyword}</div>
                {topGap.priority && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 capitalize">{topGap.priority} priority keyword</div>
                )}
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-current/20 ${PRIORITY_CONFIG[topGap.priority?.toLowerCase() ?? 'high'].bg} ${PRIORITY_CONFIG[topGap.priority?.toLowerCase() ?? 'high'].text}`}>
                {topGap.priority?.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Reasons from API only — renders nothing if no real reasons */}
          {realReasons.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Why this matters
              </div>
              <div className="space-y-2">
                {realReasons.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary flex-shrink-0 mt-1.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All missing keywords */}
          {missingKeywords.length > 1 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Other gaps ({missingKeywords.length - 1})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.slice(1, 7).map((k, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                  >
                    {k.keyword}
                  </span>
                ))}
                {missingKeywords.length > 7 && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    +{missingKeywords.length - 7} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA — scroll to roadmap tab */}
          <div className="mt-auto">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-primary text-white text-[12px] font-semibold hover:bg-brand-hover transition-colors group">
              <span>View Learning Roadmap</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
