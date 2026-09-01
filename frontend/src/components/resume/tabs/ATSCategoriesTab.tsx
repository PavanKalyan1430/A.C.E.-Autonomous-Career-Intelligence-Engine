import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { EmptyState } from '../EmptyState'
import { BarChart2 } from 'lucide-react'

interface Category {
  category_name: string
  score: number | null
  weight_percentage: number
  weighted_contribution?: number
  why_basis?: string
  evidence?: string
  deficiencies?: string[]
  calculation_inputs?: Record<string, any>
}

interface ATSCategoriesTabProps {
  categories: Category[]
}

const ATSCategoryCard: React.FC<{ cat: Category }> = ({ cat }) => {
  const [expanded, setExpanded] = useState(false)
  const clamped = Math.min(Math.max(cat.score ?? 0, 0), 100)
  const contribution = cat.weighted_contribution !== undefined
    ? Math.round(cat.weighted_contribution)
    : Math.round(((cat.score ?? 0) * cat.weight_percentage) / 100)

  const defLen = cat.deficiencies?.length ?? 0

  // Derive clean signal text from calculation_inputs (no raw [object Object])
  const signals: string[] = []
  if (cat.calculation_inputs) {
    Object.entries(cat.calculation_inputs).forEach(([k, v]) => {
      if (typeof v === 'boolean' && v) signals.push(k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      else if (typeof v === 'number' && v > 0) signals.push(`${k.replace(/_/g, ' ')}: ${v}`)
    })
  }

  return (
    <div className="p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 shadow-card hover:shadow-elevated transition-all">

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">{cat.category_name}</h4>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Weight: {cat.weight_percentage}% · Contribution:&nbsp;
            <span className="font-bold text-brand-primary">{contribution}%</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[22px] font-extrabold text-brand-primary leading-none">{cat.score !== null ? cat.score : '—'}</div>
          <div className="text-[9px] text-neutral-400 font-medium">/100</div>
        </div>
      </div>

      {/* Gradient progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${clamped}%`,
            background: clamped >= 70
              ? 'linear-gradient(90deg, #6B8F71, #1f493d)'
              : clamped >= 40
              ? 'linear-gradient(90deg, #AEC3B0, #336659)'
              : 'linear-gradient(90deg, #E3EFD3, #6B8F71)',
          }}
        />
      </div>

      {/* Positive signals (always visible) */}
      {cat.evidence && (
        <div className="mb-3">
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Positive Signals</div>
          <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed bg-brand-light/30 dark:bg-brand-primary/5 rounded-lg px-3 py-2 border border-brand-primary/10">
            {cat.evidence}
          </div>
        </div>
      )}

      {/* Deficiencies (always visible when few, expandable when many) */}
      {defLen > 0 && (
        <div className="mb-2">
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Attention Areas</div>
          <ul className="space-y-1">
            {cat.deficiencies!.slice(0, expanded ? undefined : 2).map((def, k) => (
              <li key={k} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-ai flex-shrink-0 mt-1.5" />
                {def}
              </li>
            ))}
          </ul>
          {defLen > 2 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-brand-primary hover:text-brand-hover transition-colors"
            >
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {expanded ? 'Show less' : `+${defLen - 2} more`}
            </button>
          )}
        </div>
      )}

      {/* Signal tags (from calculation_inputs, human-readable) */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {signals.slice(0, 6).map((s, i) => (
            <span key={i} className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-[9px] font-medium text-neutral-500 rounded-full border border-neutral-200 dark:border-neutral-700">
              ✓ {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export const ATSCategoriesTab: React.FC<ATSCategoriesTabProps> = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return (
      <EmptyState
        icon={<BarChart2 size={16} />}
        title="ATS category analysis unavailable"
        description="Run a full ATS analysis to see detailed category breakdowns."
        compact
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((cat, i) => <ATSCategoryCard key={i} cat={cat} />)}
    </div>
  )
}
