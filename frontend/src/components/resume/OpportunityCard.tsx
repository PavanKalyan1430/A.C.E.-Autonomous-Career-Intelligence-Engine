import React from 'react'

interface OpportunityCardProps {
  problem: string
  recommendation: string
  impact: string      // 'high' | 'medium' | 'low'
  whyItMatters?: string
  potentialPts?: string
  index: number
  onTakeAction?: () => void
}

const IMPACT_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; pts: string }> = {
  high:   { label: 'HIGH PRIORITY',   bg: 'bg-brand-primary/10 dark:bg-brand-primary/20', text: 'text-brand-primary',  dot: 'bg-brand-primary', pts: '+8–12 pts' },
  medium: { label: 'MEDIUM PRIORITY', bg: 'bg-brand-ai/10 dark:bg-brand-ai/20',              text: 'text-brand-ai',       dot: 'bg-brand-ai',      pts: '+4–7 pts'  },
  low:    { label: 'LOW PRIORITY',    bg: 'bg-neutral-100 dark:bg-neutral-800/40',            text: 'text-neutral-500',    dot: 'bg-neutral-400',   pts: '+2–4 pts'  },
}

const ICON_SVGS = [
  // Megaphone / Speaker icon
  <svg key="1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#336659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>,
  // Target / Code icon
  <svg key="2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#336659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  // Impact / Bar chart icon
  <svg key="3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#336659" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
]

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  problem,
  recommendation,
  impact,
  whyItMatters,
  potentialPts,
  index,
  onTakeAction,
}) => {
  const impKey = impact?.toLowerCase() ?? 'medium'
  const cfg = IMPACT_CONFIG[impKey] ?? IMPACT_CONFIG.medium
  const icon = ICON_SVGS[index % ICON_SVGS.length]
  const pts = potentialPts || cfg.pts

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-brand-light/20 dark:bg-neutral-900/40 hover:border-brand-primary/30 transition-all">

      {/* Left: Icon + Content */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-brand-light dark:bg-brand-primary/15 border border-brand-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">
              {problem}
            </h4>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${cfg.bg} ${cfg.text} border border-current/20 uppercase`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {recommendation || whyItMatters}
          </p>
        </div>
      </div>

      {/* Right: Potential Impact + Take Action button */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <div className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">
            {pts}
          </div>
          <div className="text-[9px] text-neutral-400 font-medium mt-0.5">
            Potential Impact
          </div>
        </div>

        <button
          onClick={onTakeAction}
          className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-[11px] font-bold transition-all shadow-sm flex-shrink-0"
        >
          Take Action
        </button>
      </div>

    </div>
  )
}
