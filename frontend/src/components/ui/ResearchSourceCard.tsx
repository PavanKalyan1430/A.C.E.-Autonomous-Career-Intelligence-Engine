import React from 'react'
import { ExternalLink, ShieldCheck, Globe } from 'lucide-react'
import type { ResearchSource } from '@/types'

interface ResearchSourceCardProps {
  source: string | ResearchSource | null | undefined
}

export const ResearchSourceCard: React.FC<ResearchSourceCardProps> = ({ source }) => {
  if (!source) return null

  // Defensive normalization to safely handle string URLs or ResearchSource objects
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
  const category = isString ? undefined : source?.category
  const tier = isString ? undefined : source?.tier
  const score = isString ? undefined : source?.relevance_score

  const safeHref = url ? (url.startsWith('http') ? url : `https://${url}`) : '#'

  return (
    <a
      href={safeHref}
      target={url ? "_blank" : undefined}
      rel="noreferrer"
      className="group flex flex-col gap-2 p-3 bg-white dark:bg-[#18291E] border border-neutral-200 dark:border-[#345635]/60 hover:border-brand-primary/50 dark:hover:border-brand-primary rounded-xl shadow-card hover:shadow-elevated transition-all duration-200 text-left block"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe size={13} className="text-brand-primary flex-shrink-0" />
          <span className="text-2xs font-bold text-neutral-600 dark:text-[#AEC3B0] truncate">
            {domain}
          </span>
        </div>
        <ExternalLink size={13} className="text-neutral-400 group-hover:text-brand-primary flex-shrink-0 transition-colors" />
      </div>

      <h4 className="text-xs font-bold text-[#3d3d3d] dark:text-white group-hover:text-brand-primary leading-snug line-clamp-2 transition-colors">
        {title}
      </h4>

      {(tier || category || (score !== undefined && score > 0)) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 mt-auto border-t border-neutral-100 dark:border-[#18291E]">
          {tier && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-sage/40 dark:bg-[#0D2B1D] text-brand-primary dark:text-[#AEC3B0] border border-brand-primary/20">
              <ShieldCheck size={10} />
              {tier}
            </span>
          )}
          {category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
              {category}
            </span>
          )}
          {score !== undefined && score > 0 && (
            <span className="text-[10px] font-semibold text-neutral-400 ml-auto">
              Match: {Math.round(score * 100)}%
            </span>
          )}
        </div>
      )}
    </a>
  )
}
