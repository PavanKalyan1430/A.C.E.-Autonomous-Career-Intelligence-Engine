import React from 'react'

interface ScoreMetricCardProps {
  categoryName: string
  score: number | null
  weightPercentage: number
  icon?: React.ReactNode
}

function getStatus(score: number | null): { label: string; color: string; track: string } {
  if (score === null) return { label: 'N/A', color: '#AEC3B0', track: '#E3EFD3' }
  if (score >= 80) return { label: 'Excellent',          color: '#1f493d', track: '#E3EFD3' }
  if (score >= 60) return { label: 'Good',               color: '#336659', track: '#E3EFD3' }
  if (score >= 40) return { label: 'Needs Improvement',  color: '#4E6243', track: '#E3EFD3' }
  if (score >= 20) return { label: 'Critical Gap',       color: '#6B8F71', track: '#E3EFD3' }
  return              { label: 'Critical Gap',       color: '#AEC3B0', track: '#E3EFD3' }
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'ats':        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>,
  'skills':     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  'experience': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  'projects':   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7h3a2 2 0 002-2V3M3 17h3a2 2 0 012 2v2M21 7h-3a2 2 0 01-2-2V3M21 17h-3a2 2 0 00-2 2v2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
  'role':       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>,
}

function getIconKey(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('ats') || lower.includes('format')) return 'ats'
  if (lower.includes('skill') || lower.includes('keyword')) return 'skills'
  if (lower.includes('exp') || lower.includes('impact')) return 'experience'
  if (lower.includes('project') || lower.includes('portfolio')) return 'projects'
  return 'role'
}

/**
 * Premium score metric card with ACE green gradient progress bar.
 * Gradient fill adapts to score level — not a flat colour.
 */
export const ScoreMetricCard: React.FC<ScoreMetricCardProps> = ({
  categoryName,
  score,
  weightPercentage,
}) => {
  const clamped = Math.min(Math.max(score ?? 0, 0), 100)
  const status = getStatus(score)
  const iconKey = getIconKey(categoryName)
  const icon = CATEGORY_ICONS[iconKey]

  // Short label for display
  const shortName = categoryName
    .replace('& Formatting', '')
    .replace('Alignment', '')
    .replace('-Specific', '')
    .trim()

  return (
    <div className="flex-1 min-w-[140px] p-4 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card hover:shadow-elevated hover:border-brand-primary/20 transition-all">

      {/* Icon + category */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center text-brand-primary flex-shrink-0">
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 leading-tight">{shortName}</span>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-0.5 mb-1">
        <span className="text-[22px] font-extrabold text-neutral-800 dark:text-white leading-none" style={{ color: status.color }}>
          {score !== null ? score : '—'}
        </span>
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">/100</span>
      </div>

      {/* Status label */}
      <div className="text-[10px] font-semibold mb-3" style={{ color: status.color }}>
        {status.label}
      </div>

      {/* Gradient progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: status.track }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, #AEC3B0 0%, ${status.color} 100%)`,
            boxShadow: `0 0 6px ${status.color}55`,
          }}
        />
      </div>

      {/* Weight */}
      <div className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">
        Weight: {weightPercentage}%
      </div>
    </div>
  )
}
