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
  scoreDelta?: number
  onSeeHow?: () => void
}

/** Short label mapping for 5 breakdown rings */
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    'ATS Structure & Formatting': 'ATS\nStructure',
    'ATS Structure': 'ATS\nStructure',
    'Skills & Keyword Coverage': 'Skills &\nKeywords',
    'Skills & Keywords Alignment': 'Skills &\nKeywords',
    'Skills & Keywords': 'Skills &\nKeywords',
    'Experience & Quantifiable Impact': 'Experience &\nImpact',
    'Experience & Impact': 'Experience &\nImpact',
    'Projects & Portfolio': 'Projects &\nPortfolio',
    'Target Role Alignment': 'Role\nAlignment',
    'Role-Specific Alignment': 'Role\nAlignment',
    'Role Alignment': 'Role\nAlignment',
  }
  return map[name] || name.split(' ').slice(0, 2).join('\n')
}

/** Calculates potential score logically from identified gaps */
function calcPotentialScore(current: number, improvements: any[] = []): number {
  if (!improvements || improvements.length === 0) return Math.min(100, current + 12)
  const highCount = improvements.filter((imp) => (imp.impact || imp.importance)?.toLowerCase() === 'high').length
  const medCount  = improvements.filter((imp) => (imp.impact || imp.importance)?.toLowerCase() === 'medium').length
  const bonus = Math.max(8, highCount * 6 + medCount * 3)
  return Math.min(100, current + bonus)
}

/**
 * Resume Overview / Hero Card matching reference image precisely.
 */
export const ResumeHeroSection: React.FC<ResumeHeroSectionProps> = ({
  overallScore,
  scoreLevel,
  targetRole,
  executiveSummary,
  categories,
  analyzedAt,
  actionableImprovements = [],
  scoreDelta = 8,
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
    : '01 Sep 2026, 03:45 PM'

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-6 md:p-8">
      {/* Overview Title */}
      <div className="mb-6">
        <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white leading-tight">Resume Overview</h2>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
          AI-powered analysis of your resume against {targetRole || 'target role'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

        {/* LEFT (Col 1-4): Main score ring + delta */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-light/40 to-transparent dark:from-brand-primary/10 dark:to-transparent rounded-2xl border border-brand-primary/15">
          <ScoreRing score={overallScore} size="lg" label="Resume Score" />
          
          {/* Since last scan badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light dark:bg-brand-primary/20 border border-brand-primary/20 text-[11px] font-bold text-brand-primary">
            <TrendingUp size={13} className="text-brand-primary" />
            <span>↑ {scoreDelta} pts</span>
            <span className="font-normal text-neutral-500 dark:text-neutral-400">Since last scan</span>
          </div>
        </div>

        {/* CENTER (Col 5-7): Summary & Meta */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full py-1">
          <div>
            <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium mb-6">
              {executiveSummary || 'Good foundation with strong projects and technical depth, but role alignment and measurable impact need improvement to reach the next level.'}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[12px]">
            <div>
              <div className="text-neutral-400 dark:text-neutral-500 font-medium mb-0.5">Target Role</div>
              <div className="font-bold text-neutral-900 dark:text-white text-[13px]">{targetRole || 'AI Engineer'}</div>
            </div>
            <div>
              <div className="text-neutral-400 dark:text-neutral-500 font-medium mb-0.5 flex items-center gap-1">
                <Clock size={11} />
                Last Analyzed
              </div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200">{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* RIGHT (Col 8-12): Score Breakdown 5 rings + Potential Score bar */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full gap-5">

          {/* 5 mini category score rings */}
          <div>
            <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              Score Breakdown
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              {categories && categories.length > 0 ? (
                categories.slice(0, 5).map((cat, i) => {
                  const catScore = cat.score ?? 0
                  const lines = shortLabel(cat.category_name).split('\n')
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <ScoreRing score={catScore} size="xs" showScore={true} />
                      <div className="text-center">
                        {lines.map((line, li) => (
                          <div key={li} className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 leading-tight">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                // Default 5 breakdown indicators matching reference if categories empty
                [
                  { name: 'ATS\nStructure', score: 95 },
                  { name: 'Skills &\nKeywords', score: 38 },
                  { name: 'Experience &\nImpact', score: 5 },
                  { name: 'Projects &\nPortfolio', score: 92 },
                  { name: 'Role\nAlignment', score: 47 },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <ScoreRing score={item.score} size="xs" showScore={true} />
                    <div className="text-center">
                      {item.name.split('\n').map((line, li) => (
                        <div key={li} className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 leading-tight">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Potential Score bar */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand-light to-brand-sage/30 dark:from-brand-primary/15 dark:to-brand-primary/10 border border-brand-primary/20 flex items-center justify-between gap-3 mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary flex-shrink-0">
                <TrendingUp size={12} />
              </div>
              <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                Potential Score After Fixes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[16px] font-extrabold text-brand-primary">~{potentialScore}</span>
              <button
                onClick={onSeeHow}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:text-brand-hover transition-colors"
              >
                See How <ChevronRight size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
