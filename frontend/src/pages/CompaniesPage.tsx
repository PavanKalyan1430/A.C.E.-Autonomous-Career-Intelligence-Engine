import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { companyApi } from '@/api'
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
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Building2,
  MessageSquare,
  ShieldCheck,
  Globe
} from 'lucide-react'

export default function CompaniesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchCompany, setActiveSearchCompany] = useState('')

  // Query live insights from /api/v1/company/{company_name}
  const { data: insights, isLoading, isError, error } = useQuery({
    queryKey: ['companyInsights', activeSearchCompany],
    queryFn: async () => {
      if (!activeSearchCompany) return null
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
  const techStack: string[] = insights?.tech_stack || []
  const interviewProcess: string = insights?.interview_process || ''
  const hiringTrends: string = insights?.hiring_trends || ''
  const candidateExperience: string = insights?.candidate_experience_signals || ''
  const sourcesList: (string | ResearchSource)[] = insights?.sources || []

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Company Intelligence</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Research company tech stacks, hiring signals, and interview loops before you apply.</p>
        </div>
        <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => navigate('/career')}>
          Ask A.C.E. Agent
        </Button>
      </div>

      {/* Search Input Container */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 shadow-card flex gap-3">
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

      {/* Live Search Status Banner */}
      {!activeSearchCompany ? (
        <Card className="text-center py-12 px-6 border-dashed">
          <Building2 size={40} className="mx-auto mb-3 text-brand-primary/60" />
          <h3 className="text-lg font-bold text-[#3d3d3d] dark:text-white mb-1">Company Intelligence Research</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mb-6 leading-relaxed">
            Search any target technology company above to extract engineering tech stacks, hiring trends, candidate experience signals, and live web research sources.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {['Razorpay', 'Swiggy', 'Atlassian', 'Google'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSearchTerm(c)
                  setActiveSearchCompany(c)
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-brand-primary hover:text-white transition-colors"
              >
                Search {c}
              </button>
            ))}
          </div>
        </Card>
      ) : isLoading ? (
        <div className="p-4 bg-brand-cyan10 border border-brand-cyan/20 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#0891B2]">
          <span className="ai-pulse bg-[#0891B2]" />
          <span className="animate-pulse">Researching {activeSearchCompany} live engineering signals & web sources...</span>
        </div>
      ) : (
        <div className="p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-between text-xs font-semibold text-brand-primary">
          <span className="flex items-center gap-2"><CheckCircle size={15} /> Real-time intelligence synthesized for <strong>{companyName}</strong>.</span>
          <span className="uppercase tracking-wider font-bold text-2xs px-2 py-0.5 bg-brand-primary text-white rounded">Verified Live</span>
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
        <div className="p-8 bg-danger-light border border-danger/20 rounded-xl text-center text-danger">
          <AlertTriangle size={32} className="mx-auto mb-3 text-danger" />
          <h3 className="font-bold text-base">Failed to retrieve company intelligence</h3>
          <p className="text-xs mt-1 max-w-md mx-auto">{(error as any)?.response?.data?.detail || 'An unexpected server error occurred while searching company feeds.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Company Briefing Banner Card */}
          <Card className="border-l-4 border-l-brand-primary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={22} className="text-brand-primary" />
                <h2 className="text-2xl font-extrabold text-[#3d3d3d] dark:text-white tracking-tight">{companyName}</h2>
              </div>
              <p className="text-2xs text-neutral-500 font-semibold uppercase tracking-wider">Engineering Intelligence Briefing</p>
            </div>
            <div className="flex gap-2">
              <Button size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/resume')}>
                Compare Resume Match
              </Button>
            </div>
          </Card>

          {/* Core Synthesis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tech Stack */}
            <Card hoverable className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Layers size={15} className="text-brand-primary" /> Verified Tech Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.length === 0 ? (
                    <span className="text-xs text-neutral-400 italic">No specific technologies detected.</span>
                  ) : (
                    techStack.map((tech: string, idx: number) => (
                      <Badge key={idx} variant="blue" size="xs" className="font-semibold">{tech}</Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Hiring Signals */}
            <Card hoverable className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#0891B2]" /> Active Hiring Signals
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                  {hiringTrends || 'No active hiring trends detected in recent engineering feeds.'}
                </p>
              </div>
            </Card>

            {/* Interview Process */}
            <Card hoverable className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-amber-500" /> Technical Interview Stages
                </h3>
                <div className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed font-medium">
                  {interviewProcess || 'Interview loops are under synthesis. Run search again.'}
                </div>
              </div>
            </Card>

          </div>

          {/* Candidate Experience Signals (if available) */}
          {candidateExperience && (
            <Card className="border-t-4 border-t-amber-500 bg-amber-50/40 dark:bg-amber-950/10">
              <h3 className="text-2xs font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MessageSquare size={14} /> Candidate Experience Feedback Signals
              </h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                {candidateExperience}
              </p>
            </Card>
          )}

          {/* Research Sources Section */}
          <Card className="border-t-4 border-t-[#0891B2]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Globe size={15} className="text-[#0891B2]" /> Live Web Research Sources ({sourcesList.length})
              </h3>
              <span className="text-2xs text-neutral-400 font-semibold">Source-Classified Index</span>
            </div>

            {sourcesList.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No web sources mapped for this query.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sourcesList.map((src, idx) => (
                  <ResearchSourceCard key={idx} source={src} />
                ))}
              </div>
            )}
          </Card>

          {/* Action Footer Banner */}
          <Card className="bg-gradient-to-r from-brand-primary/10 via-brand-light to-transparent dark:from-[#18291E] dark:to-[#0D2B1D] border-brand-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-[#3d3d3d] dark:text-white">Ready to prepare for {companyName}?</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Practice role-specific STAR technical interview questions with our real-time voice studio.</p>
            </div>
            <Button iconRight={<ArrowRight size={16} />} onClick={() => navigate('/interviews')}>
              Start Mock Practice
            </Button>
          </Card>

        </div>
      )}

    </div>
  )
}
