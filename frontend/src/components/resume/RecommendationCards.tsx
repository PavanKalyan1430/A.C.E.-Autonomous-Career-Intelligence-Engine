import React from 'react'
import { Lightbulb } from 'lucide-react'
import { EmptyState } from './EmptyState'

interface Improvement {
  problem: string
  recommendation: string
  impact: string
  why_it_matters?: string
}

interface RecommendationCardsProps {
  improvements: Improvement[]
}

const IMPACT_STYLES: Record<string, { badge: string; border: string; dot: string }> = {
  high:   { badge: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20', border: 'border-brand-primary/15', dot: 'bg-brand-primary' },
  medium: { badge: 'bg-brand-ai/10 text-brand-ai border-brand-ai/20',               border: 'border-brand-ai/15',      dot: 'bg-brand-ai' },
  low:    { badge: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700', border: 'border-neutral-200 dark:border-neutral-700', dot: 'bg-neutral-400' },
}

/**
 * Grid of actionable improvement cards.
 * Replaces the ugly "No recommendations required." text with real cards or a premium empty state.
 * Each card shows the problem, recommended action, impact, and why it matters.
 */
export const RecommendationCards: React.FC<RecommendationCardsProps> = ({ improvements }) => {
  if (!improvements || improvements.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb size={16} />}
        title="No improvement actions required"
        description="ACE hasn't identified any critical gaps for your target role. Your resume is well-aligned."
        compact
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {improvements.map((imp, i) => {
        const impKey = imp.impact?.toLowerCase() ?? 'medium'
        const styles = IMPACT_STYLES[impKey] ?? IMPACT_STYLES.medium

        return (
          <div
            key={i}
            className={`p-5 bg-white dark:bg-[#0D1117] rounded-2xl border ${styles.border} shadow-card hover:shadow-elevated transition-all group flex flex-col gap-3`}
          >
            {/* Title + Priority */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight flex-1">
                {imp.problem}
              </h4>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${styles.badge} flex-shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                {imp.impact?.toUpperCase() || 'MEDIUM'}
              </span>
            </div>

            {/* Why it matters */}
            {imp.why_it_matters && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {imp.why_it_matters}
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Recommendation */}
            <div>
              <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Recommended Action</div>
              <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{imp.recommendation}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
