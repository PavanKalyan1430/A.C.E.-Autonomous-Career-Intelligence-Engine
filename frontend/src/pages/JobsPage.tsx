import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi, resumeApi, companyApi, careerApi } from '@/api'
import { normalizePercentage } from '@/utils/error'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { ResearchSourceCard } from '@/components/ui/ResearchSourceCard'
import type { ResearchSource } from '@/types'
import {
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  X,
  Target,
  Briefcase,
  MapPin,
  Clock,
  Compass,
  CheckCircle,
  Building2,
  Globe,
  Layers
} from 'lucide-react'

export default function JobsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Drawer states
  const [activeJobId, setActiveJobId] = useState<number | null>(null)

  // Track New Opportunity Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCompany, setNewCompany] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newJdText, setNewJdText] = useState('')

  // 1. Fetch latest resume status (checks if empty uploader needed)
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch real career intelligence for skills & alignment
  const { data: careerIntel } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false
  })

  // 3. Fetch tracked applications
  const { data: applications, isLoading: isAppsLoading } = useQuery({
    queryKey: ['applicationsList'],
    queryFn: async () => {
      const res = await applicationsApi.list()
      return res.data
    }
  })

  // 4. Mutation to create tracked opportunity
  const createOpportunityMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_name: newCompany,
        role_title: newRole,
        status: 'applied',
        jd_text: newJdText
      }
      const res = await applicationsApi.create(payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setShowAddModal(false)
      setNewCompany('')
      setNewRole('')
      setNewJdText('')
    }
  })

  // Normalize real application data into opportunity items
  const liveJobs = (applications || []).map((app: any) => {
    const analysis = app.analysis || {}
    const rawCoverage = careerIntel?.skill_alignment?.coverage_percentage
    const matchScore = analysis.match_percentage ? normalizePercentage(analysis.match_percentage) : normalizePercentage(rawCoverage)

    const missing = analysis.required_keyphrases || careerIntel?.skill_alignment?.missing_skills || []
    const userSkills = resume?.skills || careerIntel?.profile?.verified_skills || []

    return {
      id: app.id,
      company: app.company_name,
      role: app.role_title,
      location: 'Remote/Hybrid',
      type: 'Full-time',
      status: app.status || 'applied',
      match: matchScore,
      matchedSkills: userSkills.slice(0, 5),
      missingSkills: missing,
      description: app.jd_text || 'Tracked career opportunity.',
      whyMatch: `Profile aligns with key role parameters. Matching computed via semantic NLP cosine analysis.`,
      nextStep: missing.length > 0 ? `Focus on learning ${missing[0]} to close candidate gap.` : 'Prepare for technical interview rounds.'
    }
  })

  const filteredJobs = liveJobs.filter((job: any) => {
    const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'All' || job.role.toLowerCase().includes(selectedRole.toLowerCase())
    const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const selectedJob = liveJobs.find((j: any) => j.id === activeJobId)

  // Render loading state
  if (isResumeLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex justify-between mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE (No Resume Uploaded) ──────────────────────────────────
  if (!resume) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
          <Compass size={32} className="text-brand-primary animate-pulse-dot" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-white mb-2">
          Upload resume to unlock job discovery
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed max-w-md mx-auto">
          Job matching requires 384-dimensional technical experience vectors. Upload your resume to map compatibility instantly.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={16} />}>
          Upload Resume to Begin
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-6 relative min-h-[calc(100vh-80px)] text-neutral-700 dark:text-neutral-300 animate-fade-in">
      
      {/* ── MAIN CONTENT LIST PANEL ────────────────────────────────────────── */}
      <div className="flex-1 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Job Intelligence</h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Discover and track job opportunities aligned with your candidate profile.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => navigate('/career')}>
              Ask A.C.E.
            </Button>
            <Button icon={<Target size={16} />} onClick={() => setShowAddModal(true)}>
              Track Opportunity
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 shadow-card space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tracked opportunities by company or role title..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg text-xs text-neutral-800 dark:text-white placeholder-neutral-400 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="flex gap-3 flex-wrap items-center text-xs font-semibold pt-1">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 dark:text-neutral-500 text-2xs uppercase">Role</span>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-md px-2.5 py-1.5 outline-none text-2xs font-semibold text-neutral-700 dark:text-white"
              >
                <option value="All">All Roles</option>
                <option value="Backend">Backend</option>
                <option value="Engineer">Engineer</option>
                <option value="Developer">Developer</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 dark:text-neutral-500 text-2xs uppercase">Status</span>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-md px-2.5 py-1.5 outline-none text-2xs font-semibold text-neutral-700 dark:text-white"
              >
                <option value="All">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunity List Rows */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card className="text-center py-12 text-neutral-400">
              <Compass size={36} className="mx-auto mb-3 text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-white mb-1">No tracked job opportunities yet</p>
              <p className="text-xs text-neutral-400 mb-4 max-w-sm mx-auto">
                Track custom target opportunities to generate semantic match scores and prerequisite skill gap maps.
              </p>
              <Button size="sm" icon={<Target size={16} />} onClick={() => setShowAddModal(true)}>
                Track Opportunity
              </Button>
            </Card>
          ) : (
            filteredJobs.map((job: any) => (
              <div 
                key={job.id} 
                className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-5 hover:border-brand-primary/40 dark:hover:border-brand-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex justify-between items-start md:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#3d3d3d] dark:text-white leading-tight">{job.role}</h3>
                      <div className="flex items-center gap-2 text-2xs font-semibold text-neutral-400 dark:text-neutral-500 mt-1">
                        <span className="text-brand-primary font-bold">{job.company}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {job.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="blue" className="font-bold bg-brand-light border-brand-primary/20 text-brand-primary px-2.5 py-1 text-xs">
                        {job.match}% MATCH
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed font-medium">
                    {job.description}
                  </p>

                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {job.matchedSkills.map((sk: string, idx: number) => (
                      <Badge key={idx} variant="blue" size="xs" className="font-semibold">✓ {sk}</Badge>
                    ))}
                    {job.missingSkills.map((sk: string, idx: number) => (
                      <Badge key={idx} variant="warning" size="xs" className="font-semibold">! {sk}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 items-stretch flex-shrink-0">
                  <Button 
                    size="xs" 
                    variant="secondary"
                    onClick={() => setActiveJobId(job.id)}
                  >
                    View Match Analysis
                  </Button>
                  <Button 
                    size="xs" 
                    variant="primary"
                    onClick={() => navigate('/interviews')}
                  >
                    Practice Interview
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MATCH ANALYSIS SIDE OVERLAY DRAWER ──────────────────────────────── */}
      {selectedJob && (
        <aside className="w-80 sm:w-96 bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-[#1E293B] p-6 flex flex-col justify-between z-40 transition-all shadow-dropdown flex-shrink-0">
          <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar pr-1">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-[#1E293B]">
              <div>
                <h3 className="font-bold text-sm text-[#3d3d3d] dark:text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-brand-primary" /> Match Diagnosis
                </h3>
                <p className="text-2xs text-neutral-400 font-semibold">{selectedJob.company} · {selectedJob.role}</p>
              </div>
              <button onClick={() => setActiveJobId(null)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-700">
                <X size={16} />
              </button>
            </div>

            {/* Match score progress widget */}
            <div className="p-4 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
              <div className="flex justify-between items-end text-xs font-semibold mb-2">
                <span>Semantic Vector Compatibility</span>
                <span className="text-brand-primary font-bold">{selectedJob.match}%</span>
              </div>
              <ProgressBar value={selectedJob.match} variant="blue" />
            </div>

            {/* Why You Match */}
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-brand-primary" /> Why you match
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                  {selectedJob.whyMatch}
                </p>
              </div>

              {/* Gaps */}
              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" /> Skill Gaps
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.missingSkills.map((sk: string, i: number) => (
                    <Badge key={i} variant="warning" size="xs" className="font-semibold">{sk}</Badge>
                  ))}
                </div>
              </div>

              {/* Next Step */}
              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-[#0891B2]" /> Recommended Action
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                  {selectedJob.nextStep}
                </p>
              </div>

              {/* Company Web Research Sources */}
              {selectedJob.sources && selectedJob.sources.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Globe size={14} className="text-brand-primary" /> Research Sources
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.sources.map((src: any, i: number) => (
                      <ResearchSourceCard key={i} source={src} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-6 pt-4 border-t border-neutral-100 dark:border-[#1E293B]">
            <Button 
              fullWidth 
              variant="secondary"
              iconRight={<ArrowRight size={14} />} 
              onClick={() => navigate('/skills')}
            >
              View Skill Roadmap
            </Button>
            <Button 
              fullWidth 
              variant="primary"
              onClick={() => navigate('/interviews')}
            >
              Prepare Interview
            </Button>
          </div>
        </aside>
      )}

      {/* ── TRACK OPPORTUNITY MODAL ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-[#0D1117] border-neutral-200 dark:border-[#1E293B] shadow-dropdown flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-[#1E293B] flex items-center justify-between">
              <h3 className="font-bold text-sm dark:text-white flex items-center gap-2">
                <Target size={16} className="text-brand-primary" /> Track New Opportunity
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={16} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault()
                if (newCompany.trim() && newRole.trim()) {
                  createOpportunityMutation.mutate()
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Razorpay, Swiggy, Atlassian"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg outline-none focus:border-brand-primary text-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg outline-none focus:border-brand-primary text-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Job Description / Requirements (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Paste job description text to trigger backend semantic match scoring and gap analysis..."
                  value={newJdText}
                  onChange={(e) => setNewJdText(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg outline-none focus:border-brand-primary text-neutral-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" fullWidth loading={createOpportunityMutation.isPending}>
                  Save & Track
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
