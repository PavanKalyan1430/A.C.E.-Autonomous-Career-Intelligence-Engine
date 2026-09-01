import React from 'react'
import { ScoreMetricCard } from './ScoreMetricCard'
import { EmptyState } from './EmptyState'
import { BarChart2 } from 'lucide-react'

interface Category {
  category_name: string
  score: number | null
  weight_percentage: number
  weighted_contribution?: number
}

interface ResumeBreakdownSectionProps {
  categories: Category[]
}

/**
 * Horizontal row of 5 score metric cards.
 * Matches the "Resume Breakdown" section in the reference image.
 */
export const ResumeBreakdownSection: React.FC<ResumeBreakdownSectionProps> = ({ categories }) => {
  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 md:p-6">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white mb-0.5">Resume Breakdown</h3>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Detailed scores across key evaluation areas.
        </p>
      </div>

      {!categories || categories.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={16} />}
          title="Score breakdown unavailable"
          description="Run an ATS analysis to see detailed scores across each evaluation dimension."
          compact
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {categories.slice(0, 5).map((cat, i) => (
            <ScoreMetricCard
              key={i}
              categoryName={cat.category_name}
              score={cat.score}
              weightPercentage={cat.weight_percentage}
            />
          ))}
        </div>
      )}
    </div>
  )
}
