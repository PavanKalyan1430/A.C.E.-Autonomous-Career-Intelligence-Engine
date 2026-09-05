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
 * Pure Data-Driven Opportunities Section.
 * ZERO hardcoded dummy cards. Items map strictly from API arrays.
 */
export const OpportunitiesSection: React.FC<OpportunitiesSectionProps> = ({
  actionableImprovements = [],
  missingKeywords = [],
  targetRole,
  learningRoadmap = [],
}) => {
  const navigate = useNavigate()

  // Derives items strictly from real API analysis arrays
  let itemsToDisplay = actionableImprovements
  if (itemsToDisplay.length === 0 && missingKeywords.length > 0) {
    itemsToDisplay = missingKeywords.map((kw: any) => ({
      problem: `Add ${kw.keyword} Evidence`,
      recommendation: kw.where_it_matters || `Missing requirement for ${targetRole || 'target role'} alignment.`,
      impact: kw.priority || 'high',
    }))
  }

  const top3 = itemsToDisplay.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* LEFT: Top Opportunities (2/3 width) */}
      <div className="lg:col-span-2 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 md:p-6 flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white mb-0.5">
              Top Opportunities to Improve
            </h3>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
              Address these high-impact gaps to increase your score faster
            </p>
          </div>

          {top3.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={<Lightbulb size={16} />}
                title="No improvement opportunities identified"
                description="Your resume covers the key requirements for your target role."
                compact
              />
            </div>
          ) : (
            <div className="space-y-3">
              {top3.map((imp, i) => (
                <OpportunityCard
                  key={i}
                  index={i}
                  problem={imp.problem || imp.gap}
                  recommendation={imp.recommendation}
                  impact={imp.impact || imp.importance}
                  whyItMatters={imp.why_it_matters}
                  potentialPts={imp.potential_pts}
                  onTakeAction={() => navigate('/skills')}
                />
              ))}
            </div>
          )}
        </div>

        {itemsToDisplay.length > 0 && (
          <div className="mt-4 pt-3 text-center border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => navigate('/skills')}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-700 dark:text-neutral-300 hover:text-brand-primary transition-colors group"
            >
              View All Recommendations
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
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
