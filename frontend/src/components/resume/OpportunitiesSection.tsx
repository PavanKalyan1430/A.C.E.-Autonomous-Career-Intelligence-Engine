import React from 'react'
import { useNavigate } from 'react-router-dom'
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
 * Two-column section: "Top Opportunities to Improve" (left) + "AI Career Guidance" (right).
 * Uses real actionable_improvements if provided; if empty but missing_keywords exist,
 * maps top missing keywords into opportunities so that it NEVER contradicts AI Career Guidance.
 */
export const OpportunitiesSection: React.FC<OpportunitiesSectionProps> = ({
  actionableImprovements = [],
  missingKeywords = [],
  targetRole,
  learningRoadmap = [],
}) => {
  const navigate = useNavigate()

  // Data consistency check: fallback to missing keywords if actionable_improvements is empty
  let itemsToDisplay = actionableImprovements
  if (itemsToDisplay.length === 0 && missingKeywords.length > 0) {
    itemsToDisplay = missingKeywords.map((kw: any) => ({
      problem: `Add ${kw.keyword} Evidence`,
      recommendation: kw.where_it_matters || `Include concrete experience or project details demonstrating capability with ${kw.keyword}.`,
      impact: kw.priority || 'high',
      why_it_matters: `Prerequisite requirement for ${targetRole || 'target role'} alignment.`,
    }))
  }

  const top3 = itemsToDisplay.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* LEFT: Top Opportunities (2/3 width) */}
      <div className="lg:col-span-2 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 flex flex-col">
        <div className="mb-4">
          <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white mb-0.5">
            Top Opportunities to Improve
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Address these high-impact gaps to increase your score faster.
          </p>
        </div>

        {top3.length === 0 ? (
          <div className="my-auto">
            <EmptyState
              icon={<Lightbulb size={16} />}
              title="No improvement opportunities identified"
              description="Your resume is well-aligned with the core requirements for your target role."
              compact
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 flex-1">
              {top3.map((imp, i) => (
                <OpportunityCard
                  key={i}
                  index={i}
                  problem={imp.problem || imp.gap}
                  recommendation={imp.recommendation}
                  impact={imp.impact || imp.importance}
                  whyItMatters={imp.why_it_matters}
                />
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              {itemsToDisplay.length > 3 ? (
                <button className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-hover transition-colors group">
                  View All Recommendations ({itemsToDisplay.length})
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : <div />}

              <button
                onClick={() => navigate('/skills')}
                className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-brand-primary transition-colors group"
              >
                Go to Skill Roadmap
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
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
