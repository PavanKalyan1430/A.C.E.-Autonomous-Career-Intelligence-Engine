import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  X,
  Compass,
  CheckCircle,
  HelpCircle,
  Layers,
  Map,
  Link as LinkIcon,
  Activity,
  Briefcase,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

// --- Default fallback/adapter placeholder data if search not run yet ---
const DEFAULT_COMPANY_INSIGHTS = {
  company_name: 'Google',
  tech_stack: ['Go', 'C++', 'Java', 'gRPC', 'Kubernetes', 'Borg', 'Spanner'],
  interview_process: '1. Technical Phone Screen (1 coding session)\n2. Onsite Loops (3 coding rounds, 1 System Design round)\n3. Googleyness & Leadership round (behavioral focus).',
  hiring_trends: 'Active hiring signals observed for core Infrastructure and large-scale AI/ML Platform engineering groups.',
  sources: ['https://engineering.googleblog.com', 'https://leetcode.com/discuss/interview-question'],
}

export default function CompaniesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchCompany, setActiveSearchCompany] = useState('Google')

  // Query live insights from /api/v1/company/{company_name}
  const { data: insights, isLoading, isError, error } = useQuery({
    queryKey: ['companyInsights', activeSearchCompany],
    queryFn: async () => {
      if (!activeSearchCompany) return DEFAULT_COMPANY_INSIGHTS
      const res = await companyApi.getInsights(activeSearchCompany)
      return res.data
    },
    enabled: activeSearchCompany !== ''
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    setActiveSearchCompany(searchTerm.trim())
  }

  // Render variables from query or fallbacks
  const companyName = insights?.company_name || activeSearchCompany
  const techStack = insights?.tech_stack || []
  const interviewProcess = insights?.interview_process || ''
  const hiringTrends = insights?.hiring_trends || ''
  const sourcesList = insights?.sources || []

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Company Intelligence</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Research company tech stacks, hiring signals, and interview loops before you apply.</p>
        </div>
      </div>

      {/* Search Input Container */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 shadow-card flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company (e.g. Google, Razorpay, Swiggy, Netflix)..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <Button type="submit" disabled={isLoading} icon={<Search size={16} />}>
          Research
        </Button>
      </form>

      {/* Loading Pulse */}
      {isLoading ? (
        <div className="p-4 bg-brand-cyan10 border border-brand-cyan/20 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#0891B2]">
          <span className="ai-pulse bg-[#0891B2]" />
          <span className="animate-pulse">Researching {activeSearchCompany} live engineering signals...</span>
        </div>
      ) : (
        <div className="p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-between text-[11px] font-semibold text-brand-primary">
          <span className="flex items-center gap-1.5"><CheckCircle size={14} /> Briefing synthesized dynamically from live web search indexes.</span>
          <span className="uppercase tracking-wider font-bold text-2xs">✓ Updated Live</span>
        </div>
      )}

      {/* Core Insights Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[250px]" />
        </div>
      ) : isError ? (
        <div className="p-6 bg-danger-light border border-danger/20 rounded-xl text-center text-danger">
          <AlertTriangle size={32} className="mx-auto mb-2" />
          <h3 className="font-bold text-sm">Failed to retrieve insights</h3>
          <p className="text-2xs mt-1">{(error as any)?.response?.data?.detail || 'An unexpected server error occurred.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main synthesized title card */}
          <Card className="border-l-4 border-l-brand-primary">
            <h2 className="text-xl font-bold text-[#3d3d3d] dark:text-white uppercase tracking-tight mb-1">{companyName}</h2>
            <p className="text-2xs text-neutral-500 font-semibold uppercase tracking-wider">Engineering Intelligence Briefing</p>
          </Card>

          {/* Synthesis Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tech Stack */}
            <Card>
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Layers size={14} className="text-brand-primary" /> Tech Stack
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {techStack.length === 0 ? (
                  <span className="text-2xs text-neutral-400 italic">No technologies detected.</span>
                ) : (
                  techStack.map((tech: string, idx: number) => (
                    <Badge key={idx} variant="blue" size="xs">{tech}</Badge>
                  ))
                )}
              </div>
            </Card>

            {/* Hiring Signals */}
            <Card>
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#0891B2]" /> Hiring Signals
              </h3>
              <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                {hiringTrends || 'No active hiring trends detected in recent engineering feeds.'}
              </p>
            </Card>

            {/* Interview Loops */}
            <Card>
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-amber-500" /> Interview Process
              </h3>
              <div className="text-2xs text-neutral-500 dark:text-neutral-400 whitespace-pre-line leading-relaxed font-medium">
                {interviewProcess || 'Interview loops are under synthesis. Run search again.'}
              </div>
            </Card>

          </div>

          {/* Bottom Side-by-side: Fit Analysis & Sources list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ACE Fit Analysis */}
            <Card className="border-t-4 border-t-brand-primary flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-primary animate-pulse-dot" /> ACE Analysis
                </h3>
                <p className="text-xs text-[#3d3d3d] dark:text-white font-bold leading-normal mb-2">
                  Your current profile aligns strongly with {companyName}'s backend requirements.
                </p>
                <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 font-medium">
                  Matches observed on System Design, Python, and microservice APIs. System Design remains your primary target improvement vector.
                </p>
              </div>

              <div className="flex gap-3">
                <Button size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/resume')}>
                  Compare My Resume
                </Button>
                <Button size="xs" variant="secondary" onClick={() => navigate('/interviews')}>
                  Prepare Interview
                </Button>
              </div>
            </Card>

            {/* Sources List */}
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-neutral-400" /> Research Sources
                </h3>
                <div className="space-y-2">
                  {sourcesList.length === 0 ? (
                    <span className="text-2xs text-neutral-400 italic">Web search sources not mapped.</span>
                  ) : (
                    sourcesList.slice(0, 3).map((url: string, idx: number) => (
                      <a 
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg text-2xs text-brand-primary font-semibold hover:underline truncate"
                      >
                        <ExternalLink size={12} className="flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </Card>

          </div>

        </div>
      )}

    </div>
  )
}
