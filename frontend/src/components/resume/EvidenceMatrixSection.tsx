import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Grid } from 'lucide-react'

interface EvidenceItem {
  requirement: string
  importance: string
  evidence_strength: string
  semantic_similarity: number | null
  explicit_resume_evidence?: string
  contextual_evidence?: string
  explanation?: string
}

interface EvidenceMatrixSectionProps {
  evidenceMatrix: EvidenceItem[]
  targetRole: string
  showLimit?: number
}

const STRENGTH_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  strong:  { label: 'Strong',  bg: 'bg-brand-primary/10',   text: 'text-brand-primary', border: 'border-brand-primary/20' },
  partial: { label: 'Partial', bg: 'bg-brand-ai/10',         text: 'text-brand-ai',      border: 'border-brand-ai/20' },
  weak:    { label: 'Weak',    bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500', border: 'border-neutral-200 dark:border-neutral-700' },
  missing: { label: 'Missing', bg: 'bg-brand-sage/30 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-400', border: 'border-neutral-200 dark:border-neutral-700' },
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  high:   { bg: 'bg-brand-primary', text: 'text-white' },
  medium: { bg: 'bg-brand-ai/80',   text: 'text-white' },
  low:    { bg: 'bg-neutral-300 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300' },
}

/** Single expandable evidence row */
const EvidenceRow: React.FC<{ item: EvidenceItem; index: number }> = ({ item, index }) => {
  const [expanded, setExpanded] = useState(false)

  const strengthKey = item.evidence_strength?.toLowerCase() ?? 'missing'
  const strengthCfg = STRENGTH_CONFIG[strengthKey] ?? STRENGTH_CONFIG.missing
  const priorityKey = item.importance?.toLowerCase() ?? 'high'
  const priorityCfg = PRIORITY_CONFIG[priorityKey] ?? PRIORITY_CONFIG.high

  const semantic = item.semantic_similarity !== null && item.semantic_similarity !== undefined
    ? Number(item.semantic_similarity)
    : null
  const hasEvidence = strengthKey === 'strong' || strengthKey === 'partial'

  return (
    <>
      {/* Main row */}
      <tr
        className={`border-b border-neutral-100 dark:border-neutral-800/60 cursor-pointer
          ${expanded ? 'bg-brand-light/30 dark:bg-brand-primary/5' : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20'}
          transition-colors`}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Requirement */}
        <td className="px-4 py-3">
          <div className="text-[12px] font-bold text-neutral-800 dark:text-white leading-tight">{item.requirement}</div>
          {item.contextual_evidence && !expanded && (
            <div className="text-[10px] text-neutral-400 mt-0.5 truncate max-w-[160px]">{item.contextual_evidence}</div>
          )}
        </td>

        {/* Priority */}
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${priorityCfg.bg} ${priorityCfg.text}`}>
            {item.importance || 'High'}
          </span>
        </td>

        {/* Your Evidence (abbreviated) */}
        <td className="px-4 py-3 max-w-[180px]">
          {item.explicit_resume_evidence ? (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
              {item.explicit_resume_evidence}
            </p>
          ) : (
            <span className="text-[10px] text-neutral-300 dark:text-neutral-600 italic">—</span>
          )}
        </td>

        {/* Evidence Strength badge */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${strengthCfg.bg} ${strengthCfg.text} ${strengthCfg.border}`}>
            {hasEvidence
              ? <CheckCircle size={9} className="flex-shrink-0" />
              : <AlertCircle size={9} className="flex-shrink-0" />
            }
            {strengthCfg.label}
          </span>
        </td>

        {/* Semantic Match mini-bar */}
        <td className="px-4 py-3 min-w-[100px]">
          {semantic !== null ? (
            <div>
              <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{semantic.toFixed(2)}%</div>
              <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(semantic, 100)}%`,
                    background: `linear-gradient(90deg, #AEC3B0, #336659)`,
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-neutral-400">—</span>
          )}
        </td>

        {/* Action */}
        <td className="px-4 py-3">
          {hasEvidence ? (
            <span className="text-brand-primary">
              <CheckCircle size={16} />
            </span>
          ) : (
            <button
              className="flex items-center gap-1 text-[10px] font-semibold text-brand-primary hover:text-brand-hover transition-colors"
              onClick={(e) => { e.stopPropagation() }}
            >
              <PlusCircle size={12} />
              Add Evidence
            </button>
          )}
        </td>

        {/* Expand toggle */}
        <td className="px-3 py-3">
          <div className="text-neutral-400">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </td>
      </tr>

      {/* Expanded detail panel */}
      {expanded && (
        <tr className="bg-brand-light/20 dark:bg-brand-primary/5">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              {/* Left: evidence details */}
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Matched Resume Text</div>
                  {item.explicit_resume_evidence ? (
                    <div className="italic text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900/50 rounded-lg px-3 py-2 border border-neutral-200 dark:border-neutral-700 text-[11px] leading-relaxed">
                      "{item.explicit_resume_evidence}"
                    </div>
                  ) : (
                    <div className="text-neutral-400 italic">No direct quote found in resume.</div>
                  )}
                </div>
                {item.contextual_evidence && (
                  <div>
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Context</div>
                    <div className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.contextual_evidence}</div>
                  </div>
                )}
              </div>

              {/* Right: reasoning */}
              <div className="space-y-3">
                {item.explanation && (
                  <div>
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">ACE Intelligence Reasoning</div>
                    <div className="text-neutral-600 dark:text-neutral-400 leading-relaxed bg-white dark:bg-neutral-900/50 rounded-lg px-3 py-2 border border-neutral-200 dark:border-neutral-700">
                      {item.explanation}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Evidence Strength</div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${strengthCfg.bg} ${strengthCfg.text} ${strengthCfg.border}`}>
                      {strengthCfg.label}
                    </span>
                  </div>
                  {semantic !== null && (
                    <div>
                      <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Semantic Match</div>
                      <div className="text-[13px] font-bold text-brand-primary">{semantic.toFixed(2)}%</div>
                    </div>
                  )}
                </div>
                {!hasEvidence && item.explanation && (
                  <div className="mt-2">
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Recommended Action</div>
                    <div className="text-neutral-600 dark:text-neutral-400">{item.explanation}</div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/**
 * Premium Evidence Matrix section.
 * Redesigns the raw evidence table into a scannable analytical product component.
 * Rows are expandable to show drill-down detail without navigating away.
 */
export const EvidenceMatrixSection: React.FC<EvidenceMatrixSectionProps> = ({
  evidenceMatrix,
  targetRole,
  showLimit = 5,
}) => {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? evidenceMatrix : evidenceMatrix.slice(0, showLimit)

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card overflow-hidden">

      {/* Section header */}
      <div className="px-5 md:px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white mb-0.5">Evidence Matrix</h3>
          {targetRole && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              How well your resume matches the requirements for {targetRole}.
            </p>
          )}
        </div>
        {evidenceMatrix.length > showLimit && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-hover transition-colors group flex-shrink-0"
          >
            {showAll ? 'View Less' : `View Full Evidence (${evidenceMatrix.length})`}
            <ChevronRight size={13} className={`transition-transform ${showAll ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
          </button>
        )}
      </div>

      {!evidenceMatrix || evidenceMatrix.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Grid size={16} />}
            title="No evidence matrix available"
            description="Run an ATS analysis with your target role to see how each requirement is evidenced in your resume."
            compact
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-neutral-50/70 dark:bg-neutral-900/50">
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Requirement</th>
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Your Evidence</th>
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Evidence Strength</th>
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Semantic Match</th>
                <th className="px-4 py-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, i) => (
                <EvidenceRow key={i} item={item} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
