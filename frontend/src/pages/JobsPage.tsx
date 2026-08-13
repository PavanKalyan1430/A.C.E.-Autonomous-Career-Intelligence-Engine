import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi, resumeApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  X,
  Target,
  Briefcase,
  MapPin,
  Clock,
  Compass,
  CheckCircle,
  HelpCircle
} from 'lucide-react'

// --- Mock/Adapter Data representing job discovery records ---
const MOCK_JOBS = [
  {
    id: 101,
    company: 'Razorpay',
    role: 'Senior Backend Engineer',
    location: 'Remote',
    type: 'Full-time',
    match: 92,
    matchedSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Distributed Systems'],
    missingSkills: ['Kubernetes'],
    description: 'Lead design of Razorpay core payments pipelines using distributed cache logic.',
    whyMatch: 'Excellent experience with high-traffic SQL optimization and FastAPI development.',
    nextStep: 'Complete a System Design mock practice session before scheduling interviews.'
  },
  {
    id: 102,
    company: 'Swiggy',
    role: 'Senior Backend Engineer',
    location: 'Bangalore',
    type: 'Full-time',
    match: 87,
    matchedSkills: ['Python', 'SQL', 'FastAPI'],
    missingSkills: ['Kubernetes', 'gRPC'],
    description: 'Scale delivery logistics calculations and topological routing APIs.',
    whyMatch: 'Strong matching for Python POS linguistic structures and parsed back-end verbs.',
    nextStep: 'Strengthen Kubernetes and topological routing prerequisite graphs.'
  },
  {
    id: 103,
    company: 'Atlassian',
    role: 'Backend Engineer',
    location: 'Hybrid',
    type: 'Full-time',
    match: 84,
    matchedSkills: ['Python', 'Distributed Systems'],
    missingSkills: ['AWS', 'Kubernetes'],
    description: 'Work on Jira cloud infrastructure and real-time event streaming systems.',
    whyMatch: 'Demonstrated experience working on cloud scale products and system design.',
    nextStep: 'Acquire AWS Cloud Practitioner badge to offset cloud prerequisite gap.'
  },
  {
    id: 104,
    company: 'Razorpay',
    role: 'Junior Backend Developer',
    location: 'Remote',
    type: 'Full-time',
    match: 75,
    matchedSkills: ['Python', 'PostgreSQL'],
    missingSkills: ['FastAPI', 'Distributed Systems'],
    description: 'Maintain merchant onboarding pipelines and transactional database tables.',
    whyMatch: 'Solid foundation in relational databases and Python programming.',
    nextStep: 'Build a FastAPI project to showcase microservice architecture patterns.'
  }
]

export default function JobsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')
  const [selectedLoc, setSelectedLoc] = useState('All')
  const [selectedRemote, setSelectedRemote] = useState('All')
  const [minMatch, setMinMatch] = useState(0)

  // Drawer states
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  
  // 1. Fetch latest resume status (checks if empty uploader needed)
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch already tracked applications to show custom badge
  const { data: applications } = useQuery({
    queryKey: ['applicationsList'],
    queryFn: async () => {
      const res = await applicationsApi.list()
      return res.data
    }
  })

  // 3. Mutation to create application directly from Jobs page CTA
  const applyMutation = useMutation({
    mutationFn: async (job: typeof MOCK_JOBS[0]) => {
      const payload = {
        company_name: job.company,
        role_title: job.role,
        status: 'applied',
        jd_text: job.description
      }
      const res = await applicationsApi.create(payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
    }
  })

  // Filter logic
  const filteredJobs = MOCK_JOBS.filter(job => {
    const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'All' || job.role.includes(selectedRole)
    const matchesLoc = selectedLoc === 'All' || job.location.includes(selectedLoc)
    const matchesRemote = selectedRemote === 'All' || 
                          (selectedRemote === 'Remote' && job.location === 'Remote') ||
                          (selectedRemote === 'On-site/Hybrid' && job.location !== 'Remote')
    const matchesScore = job.match >= minMatch
    
    return matchesSearch && matchesRole && matchesLoc && matchesRemote && matchesScore
  })

  const selectedJob = MOCK_JOBS.find(j => j.id === activeJobId)

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
      <div className="max-w-md mx-auto text-center py-16 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
          <Compass size={32} className="text-brand-primary animate-pulse-dot" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
          Upload resume to unlock discovery
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
          Job matching requires technical experience vectors. Upload your resume to map compatibility instantly.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={16} />}>
          Upload Resume
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-6 relative min-h-[calc(100vh-80px)] -m-8 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
      
      {/* ── MAIN CONTENT LIST PANEL ────────────────────────────────────────── */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Job Intelligence</h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Discover opportunities aligned with your career profile.</p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 shadow-card space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company or role..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="flex gap-3 flex-wrap items-center text-xs font-semibold">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 dark:text-neutral-500 text-2xs uppercase">Role</span>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-md px-2 py-1 outline-none text-2xs"
              >
                <option value="All">All Roles</option>
                <option value="Senior">Senior Backend</option>
                <option value="Staff">Staff Software</option>
                <option value="Junior">Junior Backend</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 dark:text-neutral-500 text-2xs uppercase">Location</span>
              <select 
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-md px-2 py-1 outline-none text-2xs"
              >
                <option value="All">All Locations</option>
                <option value="Remote">Remote</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Match Score Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 dark:text-neutral-500 text-2xs uppercase">Min Match</span>
              <select 
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-md px-2 py-1 outline-none text-2xs"
              >
                <option value={0}>All matches</option>
                <option value={80}>&gt; 80% match</option>
                <option value={90}>&gt; 90% match</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunity List Rows */}
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              No matching opportunities found. Try relaxing your filters.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isTracked = applications?.some((app: any) => app.company_name === job.company && app.role_title === job.role)
              
              return (
                <div 
                  key={job.id} 
                  className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-5 hover:border-brand-primary/30 dark:hover:border-brand-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between items-start md:items-center gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#3d3d3d] dark:text-white leading-tight">{job.role}</h3>
                        <div className="flex items-center gap-2 text-2xs font-semibold text-neutral-400 dark:text-neutral-500 mt-1">
                          <span>{job.company}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {job.type}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="blue" className="font-bold bg-brand-light border-brand-primary/20 text-brand-primary">
                          {job.match}% MATCH
                        </Badge>
                      </div>
                    </div>

                    <p className="text-2xs text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-normal font-medium">
                      {job.description}
                    </p>

                    <div className="flex gap-1.5 flex-wrap">
                      {job.matchedSkills.map((sk, idx) => (
                        <Badge key={idx} variant="blue" size="xs">✓ {sk}</Badge>
                      ))}
                      {job.missingSkills.map((sk, idx) => (
                        <Badge key={idx} variant="warning" size="xs">! {sk}</Badge>
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
                      variant={isTracked ? 'secondary' : 'primary'}
                      disabled={isTracked || applyMutation.isPending}
                      icon={isTracked ? <CheckCircle size={14} className="text-brand-primary" /> : undefined}
                      onClick={() => applyMutation.mutate(job)}
                    >
                      {isTracked ? 'Tracked' : 'Quick Apply'}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── MATCH ANALYSIS SIDE OVERLAY DRAWER ──────────────────────────────── */}
      {selectedJob && (
        <aside className="w-80 bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-[#1E293B] p-6 flex flex-col justify-between z-40 transition-all shadow-dropdown flex-shrink-0">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-xs dark:text-white flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#0891B2]" /> Fit Diagnosis
              </span>
              <button onClick={() => setActiveJobId(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={16} />
              </button>
            </div>

            {/* Match score progress widget */}
            <div className="mb-6 p-4 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
              <div className="flex justify-between items-end text-xs font-semibold mb-2">
                <span>Semantic Match Score</span>
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
                <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  {selectedJob.whyMatch}
                </p>
              </div>

              {/* Gaps */}
              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" /> Skill Gaps
                </h4>
                <div className="flex flex-wrap gap-1">
                  {selectedJob.missingSkills.map((sk, i) => (
                    <Badge key={i} variant="warning" size="xs">{sk}</Badge>
                  ))}
                </div>
              </div>

              {/* Next Step */}
              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-[#0891B2]" /> Recommended Action
                </h4>
                <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  {selectedJob.nextStep}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-6">
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
              variant="ghost"
              onClick={() => navigate('/career')}
            >
              Ask ACE
            </Button>
          </div>
        </aside>
      )}

    </div>
  )
}
