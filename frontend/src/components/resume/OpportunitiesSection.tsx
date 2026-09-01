import React from 'react'
import { ChevronRight, Lightbulb } from 'lucide-react'
import { OpportunityCard } from './OpportunityCard'
import { CareerGuidancePanel } from './CareerGuidancePanel'
import { EmptyState } from './EmptyState'

interface OpportunitiesSectionProps {
  actionableImprovements: any[]
  missingKeywords: any[]
  targetRole: string
  learningRoadmap?: any[]
}

/**
 * Two-column section: "Top Opportunities" (left) + "AI Career Guidance" (right).
 * Only shows top 3 improvements. "View All" only renders if there are more.
 */
export const OpportunitiesSection: React.FC<OpportunitiesSectionProps> = ({
  actionableImprovements = [],
  missingKeywords = [],
  targetRole,
  learningRoadmap = [],
}) => {
  const top3 = actionableImprovements.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* LEFT: Top Opportunities (2/3 width) */}
      <div className="lg:col-span-2 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5">
        <div className="mb-4">
          <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white mb-0.5">
            Top Opportunities to Improve
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Address these high-impact gaps to increase your score faster.
          </p>
        </div>

        {top3.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={16} />}
            title="No improvement opportunities identified"
            description="ACE hasn't detected critical gaps for your target role. Your resume is well-aligned."
            compact
          />
        ) : (
          <>
            <div className="space-y-2">
              {top3.map((imp, i) => (
                <OpportunityCard
                  key={i}
                  index={i}
                  problem={imp.problem}
                  recommendation={imp.recommendation}
                  impact={imp.impact}
                  whyItMatters={imp.why_it_matters}
                />
              ))}
            </div>

            {actionableImprovements.length > 3 && (
              <button className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-hover transition-colors group">
                View All Recommendations ({actionableImprovements.length})
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </>
        )}
      </div>

      {/* RIGHT: AI Career Guidance (1/3 width) */}
      <div className="lg:col-span-1">
        <CareerGuidancePanel
          missingKeywords={missingKeywords}
          targetRole={targetRole}
          learningRoadmap={learningRoadmap}
        />
      </div>
    </div>
  )
}
