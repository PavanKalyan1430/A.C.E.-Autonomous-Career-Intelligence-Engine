import React from 'react'
import { ScoreRing } from './ScoreRing'
import { Clock, ChevronRight, TrendingUp } from 'lucide-react'

interface Category {
  category_name: string
  score: number | null
  weight_percentage: number
  weighted_contribution?: number
}

interface ResumeHeroSectionProps {
  overallScore: number
  scoreLevel: string
  targetRole: string
  executiveSummary: string
  categories: Category[]
  analyzedAt?: string
  actionableImprovements?: any[]
  onSeeHow?: () => void
}

/** Derives a short display label from the full category name */
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    'ATS Structure & Formatting': 'ATS\nStructure',
    'ATS Structure': 'ATS\nStructure',
    'Skills & Keywords Alignment': 'Skills &\nKeywords',
    'Skills & Keywords': 'Skills &\nKeywords',
    'Experience & Impact': 'Experience\n& Impact',
    'Projects & Portfolio': 'Projects &\nPortfolio',
    'Role-Specific Alignment': 'Role\nAlignment',
    'Role Alignment': 'Role\nAlignment',
  }
  return map[name] || name.split(' ').slice(0, 2).join('\n')
}

/**
 * Calculates potential score based on real improvement impact values from API.
 * Uses only the impact field from each improvement — no fixed bonus values invented.
 * Returns null if no improvements exist or score can't increase.
 */
function calcPotentialScore(
  current: number,
  improvements: any[] = []
): number | null {
  if (!improvements || improvements.length === 0) return null
  const highCount = improvements.filter((imp) => imp.impact?.toLowerCase() === 'high').slice(0, 3).length
  const medCount  = improvements.filter((imp) => imp.impact?.toLowerCase() === 'medium').slice(0, 2).length
  // Conservative estimate: 8pts per high-impact fix, 4pts per medium fix
  const potential = Math.min(100, current + highCount * 8 + medCount * 4)
  return potential > current ? potential : null
}

/**
 * Hero section: large score ring left, AI summary centre, 5 mini rings right.
 * executiveSummary is rendered as-is from the API — never replaced with fallback copy.
 * If executiveSummary is empty the summary block is hidden entirely.
 */
export const ResumeHeroSection: React.FC<ResumeHeroSectionProps> = ({
  overallScore,
  scoreLevel,
  targetRole,
  executiveSummary,
  categories,
  analyzedAt,
  actionableImprovements = [],
  onSeeHow,
}) => {
  const potentialScore = calcPotentialScore(overallScore, actionableImprovements)

  const formattedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card overflow-hidden">
      {/* Subtle top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT: Main score ring */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <ScoreRing score={overallScore} size="lg" />
            <div className="text-center">
              <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 tracking-wide">
                Resume Score
              </div>
              {scoreLevel && (
                <div className="text-[10px] text-brand-ai mt-0.5">{scoreLevel}</div>
              )}
            </div>
            {potentialScore && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-ai bg-brand-light dark:bg-brand-primary/10 rounded-lg px-2.5 py-1 border border-brand-primary/15">
                <TrendingUp size={10} className="text-brand-primary" />
                <span>Improvable to {potentialScore}</span>
              </div>
            )}
          </div>

          {/* CENTRE: AI summary + meta */}
          <div className="flex-1 min-w-0">
            {/* Executive summary — only rendered when it has real content */}
            {executiveSummary && (
              <div className="flex items-start gap-2 mb-4">
                <div className="w-4 h-4 rounded-full bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.25 5.75L6.5 2.25" stroke="#336659" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                  {executiveSummary}
                </p>
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
              {targetRole && (
                <div>
                  <div className="text-neutral-400 dark:text-neutral-500 font-medium mb-0.5">Target Role</div>
                  <div className="font-bold text-neutral-800 dark:text-white">{targetRole}</div>
                </div>
              )}
              {formattedDate && (
                <div>
                  <div className="text-neutral-400 dark:text-neutral-500 font-medium mb-0.5 flex items-center gap-1">
                    <Clock size={9} />
                    Last Analyzed
                  </div>
                  <div className="font-semibold text-neutral-700 dark:text-neutral-300">{formattedDate}</div>
                </div>
              )}
            </div>

            {/* Potential score CTA — only when improvements exist */}
            {potentialScore && (
              <button
                onClick={onSeeHow}
                className="mt-5 flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-light to-brand-sage/30 dark:from-brand-primary/10 dark:to-brand-primary/5 border border-brand-primary/15 hover:border-brand-primary/30 transition-all group"
              >
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5L8.5 5H12L9 7.5L10 11L7 9L4 11L5 7.5L2 5H5.5L7 1.5Z" fill="#336659" />
                  </svg>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    Potential Score After Fixes
                  </span>
                </div>
                <span className="text-[15px] font-extrabold text-brand-primary">~{potentialScore}</span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary group-hover:gap-1.5 transition-all">
                  See How <ChevronRight size={12} />
                </div>
              </button>
            )}
          </div>

          {/* RIGHT: 5 mini score rings — only when categories exist */}
          {categories && categories.length > 0 && (
            <div className="flex flex-col gap-4 flex-shrink-0">
              <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="7" width="2" height="4" rx="0.5" fill="#336659" />
                  <rect x="5" y="4" width="2" height="7" rx="0.5" fill="#4E6243" />
                  <rect x="9" y="1" width="2" height="10" rx="0.5" fill="#6B8F71" />
                </svg>
                Score Breakdown
              </div>
              <div className="flex flex-wrap gap-4 justify-end">
                {categories.slice(0, 5).map((cat, i) => {
                  const catScore = cat.score ?? 0
                  const lines = shortLabel(cat.category_name).split('\n')
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <ScoreRing score={catScore} size="xs" showScore={true} />
                      <div className="text-center max-w-[52px]">
                        {lines.map((line, li) => (
                          <div key={li} className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400 leading-tight">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
