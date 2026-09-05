import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { companyApi, resumeApi, careerApi } from '@/api'
import { useNavigationStore } from '@/store/navigationStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ResearchSourceCard } from '@/components/ui/ResearchSourceCard'
import type { ResearchSource } from '@/types'
import {
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Layers,
  Building2,
  MessageSquare,
  Globe,
  RefreshCw,
  FileText,
  Mic,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Target,
  Check,
  Zap,
  MapPin
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the initials avatar letter(s) for a company name */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0 || !words[0]) return 'C'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

/** Parses raw tier strings to classify source counts dynamically */
function getSourceBreakdown(sources: (string | ResearchSource)[]): { official: number; technical: number; candidate: number; hiring: number } {
  let official = 0
  let technical = 0
  let candidate = 0
  let hiring = 0

  sources.forEach((s) => {
    if (typeof s === 'string') {
      technical++
      return
    }
    const tier = (s.tier || '').toLowerCase()
    if (tier.includes('official company') || tier.includes('official code')) official++
    else if (tier.includes('candidate') || tier.includes('anecdotal')) candidate++
    else if (tier.includes('hiring') || tier.includes('job')) hiring++
    else technical++
  })

  return { official, technical, candidate, hiring }
}

/** Helper to extract candidate interview stages from text for visual timeline */
function extractInterviewStages(text: string): string[] {
  if (!text) return []
  const stages: string[] = []
  
  // Look for numbered or common keywords
  const sentences = text.split(/(?:\.\s+|\n+)/)
  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    if (/(?:initial|hr|recruiter|screening)/i.test(trimmed) && !stages.some(st => /screening/i.test(st))) {
      stages.push('Screening')
    } else if (/(?:technical|coding|dsa|problem solving)/i.test(trimmed) && !stages.some(st => /technical/i.test(st))) {
      stages.push('Technical Loop')
    } else if (/(?:system design|architecture)/i.test(trimmed) && !stages.some(st => /design/i.test(st))) {
      stages.push('System Design')
    } else if (/(?:managerial|behavioral|hr interview|culture|fit)/i.test(trimmed) && !stages.some(st => /behavioral|fit/i.test(st))) {
      stages.push('Behavioral & Fit')
    }
  }

  return stages.length >= 2 ? stages : ['Screening', 'Technical Evaluation', 'Final Loop']
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface IntelCardProps {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage: string
  emptySubtext: string
  onResearch?: () => void
}

const IntelCard: React.FC<IntelCardProps> = ({
  icon, label, children, isEmpty, emptyMessage, emptySubtext, onResearch
}) => (
  <Card hoverable className="flex flex-col min-h-[220px]">
    <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
      {icon}
      {label}
    </h3>
    {isEmpty ? (
      <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
          {emptyMessage}
        </p>
        <p className="text-2xs text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-[200px]">
          {emptySubtext}
        </p>
        {onResearch && (
          <button
            onClick={onResearch}
            className="mt-3 inline-flex items-center gap-1 text-2xs font-semibold text-brand-primary hover:text-brand-hover transition-colors underline underline-offset-2"
          >
            <RefreshCw size={11} />
            Research again
          </button>
        )}
      </div>
    ) : (
      <div className="flex-1 flex flex-col justify-between">{children}</div>
    )}
  </Card>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const navigate = useNavigate()
  const {
    companySearchInput: searchTerm,
    activeSearchCompany,
    setCompanySearchInput: setSearchTerm,
    setActiveSearchCompany
  } = useNavigationStore()
  const [showAllTech, setShowAllTech] = useState(false)

  // 1. Query live company insights
  const { data: insights, isLoading, isError, refetch } = useQuery({
    queryKey: ['companyInsights', activeSearchCompany],
    queryFn: async () => {
      if (!activeSearchCompany) return null
      const res = await companyApi.getInsights(activeSearchCompany)
      return res.data
    },
    enabled: activeSearchCompany !== ''
  })

  // 2. Query latest user resume for candidate readiness alignment
  const { data: resume } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false,
    staleTime: 60_000
  })

  // 3. Query career intelligence for verified skills
  const { data: careerIntel } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false,
    staleTime: 60_000
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    setActiveSearchCompany(searchTerm.trim())
    setShowAllTech(false)
  }

  const handleResearchAgain = () => {
    refetch()
  }

  // Derived company data
  const companyName    = insights?.company_name    || activeSearchCompany
  const techStack: string[]  = insights?.tech_stack        || []
  const interviewProcess: string = insights?.interview_process  || ''
  const hiringTrends: string     = insights?.hiring_trends      || ''
  const candidateExperience: string = insights?.candidate_experience_signals || ''
  const sourcesList: (string | ResearchSource)[]  = insights?.sources || []

  // Backend failure check
  const isBackendError = insights?.status === 'error'

  // Data existence flags
  const hasTechStack       = techStack.length > 0
  const hasHiringTrends    = !!hiringTrends.trim()
  const hasInterviewProcess = !!interviewProcess.trim()
  const sourceCount        = sourcesList.length

  // Source breakdown counts
  const sourceBreakdown = useMemo(() => getSourceBreakdown(insights?.sources || []), [insights?.sources])

  // Extract candidate tech stack & compute readiness alignment
  const userSkills: string[] = useMemo(() => {
    const resumeSkills = resume?.parsed_data?.skills || []
    const intelSkills = careerIntel?.profile?.verified_skills || []
    const combined = Array.from(new Set([...resumeSkills, ...intelSkills]))
    return combined.map(s => s.toLowerCase())
  }, [resume?.parsed_data?.skills, careerIntel?.profile?.verified_skills])

  const readinessAnalysis = useMemo(() => {
    const currentTech = insights?.tech_stack || []
    if (currentTech.length === 0 || userSkills.length === 0) return null

    const matched: string[] = []
    const missing: string[] = []

    currentTech.forEach((tech: string) => {
      const tLower = tech.toLowerCase()
      const isMatch = userSkills.some(us => us === tLower || us.includes(tLower) || tLower.includes(us))
      if (isMatch) matched.push(tech)
      else missing.push(tech)
    })

    const total = currentTech.length
    const score = total > 0 ? Math.round((matched.length / total) * 100) : 0

    return {
      score,
      matched,
      missing,
      priorities: missing.slice(0, 4)
    }
  }, [insights?.tech_stack, userSkills])

  // Interview timeline stages
  const interviewStages = useMemo(() => extractInterviewStages(interviewProcess), [interviewProcess])

  // Progressive tech stack display
  const TECH_LIMIT = 10
  const visibleTechStack = showAllTech ? techStack : techStack.slice(0, TECH_LIMIT)
  const remainingTechCount = techStack.length - TECH_LIMIT

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#12362b] via-[#336659] to-[#6B8F71] bg-clip-text text-transparent tracking-tight mb-1">
            Company Intelligence
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">
            Research engineering stacks, hiring signals, and interview patterns before you apply.
          </p>
        </div>
        <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => navigate('/career')}>
          Ask A.C.E. Agent
        </Button>
      </div>

      {/* ── Search Form ─────────────────────────────────────────── */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 shadow-card flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search target company (e.g. Google, Razorpay, Swiggy, Netflix)..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg text-xs text-neutral-800 dark:text-white placeholder-neutral-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
          />
        </div>
        <Button type="submit" disabled={isLoading} icon={<Search size={16} />}>
          Research Company
        </Button>
      </form>

      {/* ── Initial Empty State ──────────────────────────────────── */}
      {!activeSearchCompany ? (
        <Card className="text-center py-8 px-6 border-dashed">
          <div className="w-12 h-12 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-brand-primary" />
          </div>
          <h3 className="text-sm font-bold text-neutral-700 dark:text-white mb-1">
            Search any company to begin research
          </h3>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5 leading-relaxed">
            A.C.E. synthesizes live engineering signals across official sources, hiring feeds,
            and candidate discussions to give you a verified intelligence briefing.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {['Razorpay', 'Swiggy', 'Atlassian', 'Google'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSearchTerm(c)
                  setActiveSearchCompany(c)
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#1E293B] text-2xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-brand-primary hover:text-white transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>

      ) : isLoading ? (
        /* ── Research Loading State ───────────────────────────── */
        <div className="flex flex-col gap-6">
          <div className="p-3.5 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center gap-3 text-xs font-semibold text-brand-primary">
            <span className="ai-pulse bg-brand-primary" />
            <span className="animate-pulse">
              Researching <strong>{activeSearchCompany}</strong> — synthesizing live engineering signals&hellip;
            </span>
          </div>
          <Skeleton className="h-[92px] rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[220px]" />
            <Skeleton className="h-[220px]" />
            <Skeleton className="h-[220px]" />
          </div>
          <Skeleton className="h-[160px]" />
          <Skeleton className="h-[240px]" />
        </div>

      ) : isError ? (
        /* ── Error State ────────────────────────────────────────── */
        <Card className="text-center py-10 px-6 border-danger/20 bg-danger-light/30">
          <AlertTriangle size={32} className="mx-auto mb-3 text-danger" />
          <h3 className="font-bold text-sm text-neutral-800 dark:text-white mb-1">
            Research unavailable
          </h3>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400 mb-5 max-w-md mx-auto">
            A.C.E. was unable to retrieve intelligence for <strong>{activeSearchCompany}</strong>.
            This may be a temporary service issue. Please try again.
          </p>
          <Button size="sm" icon={<RefreshCw size={14} />} onClick={handleResearchAgain}>
            Try Again
          </Button>
        </Card>

      ) : isBackendError ? (
        /* ── Insufficient Evidence State ────────────────────────── */
        <Card className="text-center py-10 px-6 border-brand-primary/15 bg-brand-light/20 dark:bg-brand-primary/5">
          <div className="w-10 h-10 rounded-full bg-brand-light dark:bg-brand-primary/15 border border-brand-primary/20 flex items-center justify-center mx-auto mb-3">
            <Globe size={20} className="text-brand-primary" />
          </div>
          <h3 className="font-bold text-sm text-neutral-800 dark:text-white mb-1">
            Insufficient research coverage
          </h3>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400 mb-5 max-w-md mx-auto leading-relaxed">
            Live sources did not return enough verified evidence for <strong>{activeSearchCompany}</strong> at this time.
            Try researching again or search a related company name.
          </p>
          <Button size="sm" icon={<RefreshCw size={14} />} onClick={handleResearchAgain}>
            Research Again
          </Button>
        </Card>

      ) : (
        /* ── Main Insights View ─────────────────────────────────── */
        <div className="space-y-5">

          {/* ── Company Briefing Header ──────────────────────────── */}
          <Card className="border-l-[3px] border-l-brand-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

              {/* Company Identity */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-light dark:bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-extrabold text-brand-primary leading-none">
                    {getInitials(companyName)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-neutral-800 dark:text-white tracking-tight leading-tight">
                    {companyName}
                  </h2>
                  <p className="text-2xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">
                    Engineering Intelligence Briefing
                  </p>
                </div>
              </div>

              {/* Provenance Metadata & Actions */}
              <div className="flex flex-col items-start sm:items-end gap-2.5 sm:flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap text-2xs">
                  <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-brand-primary text-white uppercase tracking-wider text-[10px]">
                    <CheckCircle size={9} />
                    Verified Live
                  </span>
                  {sourceCount > 0 && (
                    <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                      {sourceCount} sources ({sourceBreakdown.official > 0 ? `${sourceBreakdown.official} Official · ` : ''}{sourceBreakdown.technical} Technical{sourceBreakdown.candidate > 0 ? ` · ${sourceBreakdown.candidate} Candidate` : ''})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    iconRight={<ArrowRight size={12} />}
                    onClick={() => navigate('/resume')}
                  >
                    Compare Resume Match
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    icon={<Mic size={12} />}
                    onClick={() => navigate('/interviews')}
                  >
                    Mock Practice
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Three Core Intelligence Cards ───────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1. Verified Tech Stack */}
            <IntelCard
              icon={<Layers size={14} className="text-brand-primary" />}
              label="Verified Tech Stack"
              isEmpty={!hasTechStack}
              emptyMessage="Insufficient verified signal"
              emptySubtext="Current sources do not provide reliable technology evidence for this company."
              onResearch={handleResearchAgain}
            >
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleTechStack.map((tech: string, idx: number) => (
                    <Badge key={idx} variant="blue" size="xs" className="font-semibold">
                      {tech}
                    </Badge>
                  ))}
                </div>

                {/* Progressive disclosure toggle */}
                {techStack.length > TECH_LIMIT && (
                  <button
                    onClick={() => setShowAllTech(!showAllTech)}
                    className="mt-3 flex items-center gap-1 text-2xs font-bold text-brand-primary hover:text-brand-hover transition-colors"
                  >
                    {showAllTech ? (
                      <>
                        <span>Show top {TECH_LIMIT}</span>
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        <span>+ {remainingTechCount} more technologies</span>
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </IntelCard>

            {/* 2. Active Hiring Signals */}
            <IntelCard
              icon={<TrendingUp size={14} className="text-brand-primary" />}
              label="Active Hiring Signals"
              isEmpty={!hasHiringTrends}
              emptyMessage="Hiring direction not yet determined"
              emptySubtext="Available sources do not include sufficient hiring signal for this company."
              onResearch={handleResearchAgain}
            >
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                {hiringTrends}
              </p>
            </IntelCard>

            {/* 3. Technical Interview Stages */}
            <IntelCard
              icon={<BookOpen size={14} className="text-brand-primary" />}
              label="Technical Interview Stages"
              isEmpty={!hasInterviewProcess}
              emptyMessage="Interview process not yet synthesized"
              emptySubtext="Interview evidence was not detected in current research sources."
              onResearch={handleResearchAgain}
            >
              <div className="space-y-3">
                {/* Structured step indicator */}
                {interviewStages.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {interviewStages.map((stage, idx) => (
                      <React.Fragment key={idx}>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#1E293B] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {idx + 1}. {stage}
                        </span>
                        {idx < interviewStages.length - 1 && (
                          <span className="text-neutral-300 dark:text-neutral-600 text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div className="text-2xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line leading-relaxed font-medium">
                  {interviewProcess}
                </div>
              </div>
            </IntelCard>

          </div>

          {/* ── Candidate Readiness ("What This Means for Me") ───── */}
          <Card className="border border-brand-primary/20 bg-gradient-to-br from-brand-light/30 via-white to-transparent dark:from-brand-primary/10 dark:via-[#0D1117] dark:to-transparent">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                  <Target size={16} className="text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-white">
                    Candidate Readiness Alignment
                  </h3>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 font-medium">
                    What A.C.E.'s company research means for your specific profile
                  </p>
                </div>
              </div>
              {readinessAnalysis && (
                <div className="text-right">
                  <span className="text-lg font-extrabold text-brand-primary">
                    {readinessAnalysis.score}%
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                    Stack Match
                  </span>
                </div>
              )}
            </div>

            {readinessAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                {/* Matched Skills */}
                <div className="p-3 bg-white dark:bg-[#18291E] rounded-lg border border-neutral-200 dark:border-[#345635]/60">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> Matched Technologies ({readinessAnalysis.matched.length})
                  </h4>
                  {readinessAnalysis.matched.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {readinessAnalysis.matched.map((m, i) => (
                        <Badge key={i} variant="success" size="xs">{m}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xs text-neutral-400 italic">No direct stack overlaps detected.</p>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="p-3 bg-white dark:bg-[#18291E] rounded-lg border border-neutral-200 dark:border-[#345635]/60">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap size={12} className="text-amber-500" /> Technology Gaps ({readinessAnalysis.missing.length})
                  </h4>
                  {readinessAnalysis.missing.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {readinessAnalysis.missing.slice(0, 6).map((m, i) => (
                        <Badge key={i} variant="warning" size="xs">{m}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xs text-emerald-600 font-medium">Fully aligned with verified stack!</p>
                  )}
                </div>

                {/* Actionable Priorities & Cross-module CTAs */}
                <div className="p-3 bg-white dark:bg-[#18291E] rounded-lg border border-neutral-200 dark:border-[#345635]/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPin size={12} className="text-brand-primary" /> Preparation Focus
                    </h4>
                    {readinessAnalysis.priorities.length > 0 ? (
                      <p className="text-2xs text-neutral-600 dark:text-neutral-300 font-medium leading-normal">
                        Prioritize <strong>{readinessAnalysis.priorities.join(', ')}</strong> before applying to {companyName}.
                      </p>
                    ) : (
                      <p className="text-2xs text-neutral-600 dark:text-neutral-300 font-medium">
                        Focus on mock practice for target interview stages.
                      </p>
                    )}
                  </div>
                  <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <button
                      onClick={() => navigate('/resume')}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      Compare Resume <ArrowRight size={11} />
                    </button>
                    <button
                      onClick={() => navigate('/skills')}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      View Roadmap <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state when no resume uploaded */
              <div className="p-4 bg-white dark:bg-[#18291E] rounded-lg border border-dashed border-neutral-200 dark:border-[#345635] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-white">
                    Candidate alignment unavailable
                  </p>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Upload or update your resume to map your profile against {companyName}'s engineering requirements.
                  </p>
                </div>
                <Button size="xs" icon={<FileText size={12} />} onClick={() => navigate('/resume')}>
                  Upload Resume
                </Button>
              </div>
            )}
          </Card>

          {/* ── Candidate Experience Signals (conditional) ────────── */}
          {candidateExperience && (
            <Card className="border-l-[3px] border-l-brand-primary/40 bg-brand-light/30 dark:bg-brand-primary/5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-2xs font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={13} />
                  Candidate Experience Signals
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  Candidate-reported · Community
                </span>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                {candidateExperience}
              </p>
            </Card>
          )}

          {/* ── Research Evidence Sources ──────────────────────────── */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Globe size={14} className="text-brand-primary" />
                Research Evidence
                {sourceCount > 0 && (
                  <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 normal-case tracking-normal ml-1">
                    · {sourceCount} sources
                  </span>
                )}
              </h3>
              <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold">
                Supporting signals
              </span>
            </div>

            {sourceCount === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-neutral-400 italic">
                  No research sources were retrieved for this query.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sourcesList.map((src, idx) => (
                  <ResearchSourceCard key={idx} source={src} />
                ))}
              </div>
            )}
          </Card>

          {/* ── Preparation CTA Footer ───────────────────────────── */}
          <Card className="bg-brand-light/40 dark:bg-brand-primary/5 border-brand-primary/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText size={15} className="text-brand-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-800 dark:text-white">
                  Ready to prepare for {companyName}?
                </h4>
                <p className="text-2xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                  Practice role-specific STAR technical interview questions with A.C.E.'s real-time voice studio.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              iconRight={<ArrowRight size={14} />}
              onClick={() => navigate('/interviews')}
              className="flex-shrink-0"
            >
              Start Mock Practice
            </Button>
          </Card>

        </div>
      )}

    </div>
  )
}
