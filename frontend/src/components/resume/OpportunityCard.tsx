import React from 'react'
import { ArrowRight } from 'lucide-react'

interface OpportunityCardProps {
  problem: string
  recommendation: string
  impact: string      // 'high' | 'medium' | 'low'
  whyItMatters?: string
  index: number
}

const IMPACT_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high:   { label: 'HIGH PRIORITY',   bg: 'bg-brand-primary/10 dark:bg-brand-primary/15',   text: 'text-brand-primary',  dot: 'bg-brand-primary' },
  medium: { label: 'MEDIUM PRIORITY', bg: 'bg-brand-ai/10 dark:bg-brand-ai/10',              text: 'text-brand-ai',       dot: 'bg-brand-ai' },
  low:    { label: 'LOW PRIORITY',    bg: 'bg-neutral-100 dark:bg-neutral-800/40',            text: 'text-neutral-500',    dot: 'bg-neutral-400' },
}

const ICON_PATHS = [
  'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806',
  'M13 10V3L4 14h7v7l9-11h-7z',
]

/**
 * Single opportunity row in the "Top Opportunities to Improve" panel.
 * Uses ACE green semantic priority colours, no red/orange.
 */
export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  problem,
  recommendation,
  impact,
  whyItMatters,
  index,
}) => {
  const cfg = IMPACT_CONFIG[impact?.toLowerCase()] ?? IMPACT_CONFIG.medium
  const iconPath = ICON_PATHS[index % ICON_PATHS.length]

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/30 hover:border-brand-primary/20 hover:shadow-sm transition-all group">

      {/* Icon container */}
      <div className="w-8 h-8 rounded-lg bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#336659" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[12px] font-bold text-neutral-800 dark:text-white leading-tight">{problem}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${cfg.bg} ${cfg.text} border border-current/20`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
            {cfg.label}
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {recommendation || whyItMatters}
        </p>
      </div>

      {/* CTA arrow */}
      <button className="flex-shrink-0 w-7 h-7 rounded-lg border border-brand-primary/20 bg-brand-light dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary hover:text-white">
        <ArrowRight size={12} />
      </button>
    </div>
  )
}
