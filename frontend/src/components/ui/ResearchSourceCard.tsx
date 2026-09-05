import React from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import type { ResearchSource } from '@/types'

interface ResearchSourceCardProps {
  source: string | ResearchSource | null | undefined
}

/**
 * Maps raw backend tier strings to clean user-facing product labels.
 * Backend classifies with internal tier codes like "Tier 1: Official Company".
 * We surface readable product language to users.
 */
function mapTierLabel(tier: string | undefined): string | undefined {
  if (!tier) return undefined
  const t = tier.toLowerCase()
  if (t.includes('official company'))        return 'Official'
  if (t.includes('official code') || t.includes('technical') && t.includes('official')) return 'Engineering'
  if (t.includes('hiring') || t.includes('job'))     return 'Hiring'
  if (t.includes('candidate') || t.includes('anecdotal')) return 'Candidate'
  if (t.includes('third-party') || t.includes('technical')) return 'Technical'
  return undefined
}

/**
 * Returns a signal strength descriptor based on the Tavily relevance_score (0.0–1.0).
 * We do NOT show the raw percentage — it is a Tavily internal metric, not meaningful
 * to users as a standalone number. We use a subtle dot instead.
 */
function getSignalStrength(score: number | undefined): 'strong' | 'moderate' | null {
  if (score === undefined || score <= 0) return null
  if (score >= 0.85) return 'strong'
  if (score >= 0.70) return 'moderate'
  return null
}

export const ResearchSourceCard: React.FC<ResearchSourceCardProps> = ({ source }) => {
  if (!source) return null

  // Defensive normalization — handles both plain URL strings and ResearchSource objects
  const isString = typeof source === 'string'
  const rawUrl = isString ? source : source?.url || ''
  const url = rawUrl.trim()

  // Extract domain safely
  let extractedDomain = 'Web Source'
  if (url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      extractedDomain = parsed.hostname.replace(/^www\./, '')
    } catch {
      extractedDomain = url.replace(/^https?:\/\//, '').split('/')[0] || 'Web Source'
    }
  }

  const domain = isString
    ? extractedDomain
    : (source?.domain || extractedDomain)

  const title = isString ? domain : (source?.title || domain)
  const rawTier = isString ? undefined : source?.tier
  const category = isString ? undefined : source?.category
  const score = isString ? undefined : source?.relevance_score

  const tierLabel = mapTierLabel(rawTier)
  const signalStrength = getSignalStrength(score)
  const safeHref = url ? (url.startsWith('http') ? url : `https://${url}`) : '#'

  return (
    <a
      href={safeHref}
      target={url ? '_blank' : undefined}
      rel="noreferrer"
      className="group flex flex-col gap-2 p-3 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 dark:hover:border-brand-primary/50 rounded-xl shadow-card hover:shadow-elevated transition-all duration-200 text-left"
    >
      {/* Domain row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe size={12} className="text-brand-primary flex-shrink-0" />
          <span className="text-2xs font-semibold text-neutral-500 dark:text-neutral-400 truncate">
            {domain}
          </span>
        </div>
        <ExternalLink size={12} className="text-neutral-300 dark:text-neutral-600 group-hover:text-brand-primary flex-shrink-0 transition-colors" />
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-brand-primary leading-snug line-clamp-2 transition-colors">
        {title}
      </h4>

      {/* Footer row: tier label + signal strength dot */}
      {(tierLabel || category || signalStrength) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 mt-auto border-t border-neutral-100 dark:border-[#1E293B]">
          {/* Source type label — clean product language, not raw tier codes */}
          {tierLabel && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-light dark:bg-brand-primary/10 text-brand-primary dark:text-[#AEC3B0] border border-brand-primary/15">
              {tierLabel}
            </span>
          )}
          {/* Category label if no tier label */}
          {!tierLabel && category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-[#1E293B] text-neutral-500 dark:text-neutral-400">
              {category}
            </span>
          )}
          {/* Signal strength dot — subtle, no raw percentage */}
          {signalStrength && (
            <span className="ml-auto flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  signalStrength === 'strong'
                    ? 'bg-brand-primary'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
                title={signalStrength === 'strong' ? 'Strong signal' : 'Moderate signal'}
              />
            </span>
          )}
        </div>
      )}
    </a>
  )
}
