import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeApi, jobsApi, applicationsApi } from '@/api'
import { useNavigationStore } from '@/store/navigationStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
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
  Globe,
  DollarSign,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
  ArrowUpRight,
  Layers,
  RotateCcw,
  Loader2
} from 'lucide-react'

export default function JobsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const {
    jobInputs,
    jobSearchParams: searchParams,
    hasSearchedJobs: hasSearched,
    selectedJobId,
    setJobInputs,
    setJobSearchParams,
    setHasSearchedJobs: setHasSearched,
    setSelectedJobId,
    resetJobsState
  } = useNavigationStore()

  // Convenience state getters & setters mapped to store
  const keyword = jobInputs.keyword
  const location = jobInputs.location
  const role = jobInputs.role
  const jobType = jobInputs.job_type
  const experience = jobInputs.experience
  const remoteOnsite = jobInputs.remote_onsite
  const skills = jobInputs.skills
  const salaryMin = jobInputs.salary_min
  const page = searchParams.page

  const setKeyword = (val: string) => setJobInputs({ keyword: val })
  const setLocation = (val: string) => setJobInputs({ location: val })
  const setRole = (val: string) => setJobInputs({ role: val })
  const setJobType = (val: string) => setJobInputs({ job_type: val })
  const setExperience = (val: string) => setJobInputs({ experience: val })
  const setRemoteOnsite = (val: string) => setJobInputs({ remote_onsite: val })
  const setSkills = (val: string) => setJobInputs({ skills: val })
  const setSalaryMin = (val: string) => setJobInputs({ salary_min: val })

  // Track search progress for animated loading bar
  const [searchProgress, setSearchProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)

  // External Apply Handoff Modal State & Feedback Notifications
  const [handoffModalJob, setHandoffModalJob] = useState<any>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Selected job local object for sticky right-pane details view
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const handleSetSelectedJob = (job: any) => {
    setSelectedJob(job)
    setSelectedJobId(job ? job.id : null)
  }

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
  // 1. Fetch latest resume/profile status
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch user applications list to correlate real-time job application states
  const { data: userApplications } = useQuery({
    queryKey: ['applicationsList'],
    queryFn: async () => {
      const res = await applicationsApi.list()
      return res.data
    }
  })

  // Helper to determine exact application status for any job
  const getJobApplicationStatus = (job: any) => {
    if (!job || !userApplications || !Array.isArray(userApplications)) return null
    const found = userApplications.find(
      (app: any) => app.company_name?.trim().toLowerCase() === job.company_name?.trim().toLowerCase() &&
                    app.role_title?.trim().toLowerCase() === job.title?.trim().toLowerCase()
    )
    return found ? found.status : null
  }

  const getJobApplicationRecord = (job: any) => {
    if (!job || !userApplications || !Array.isArray(userApplications)) return null
    return userApplications.find(
      (app: any) => app.company_name?.trim().toLowerCase() === job.company_name?.trim().toLowerCase() &&
                    app.role_title?.trim().toLowerCase() === job.title?.trim().toLowerCase()
    )
  }

  // 3. Fetch live job discovery — strictly enabled ONLY after user clicks Search
  const { data: discoveryData, isLoading: isJobsLoading, isError, error, refetch } = useQuery({
    queryKey: ['discoveredJobs', searchParams],
    queryFn: async () => {
      const res = await jobsApi.discover({
        keyword: searchParams.keyword || undefined,
        location: searchParams.location || undefined,
        role: searchParams.role || undefined,
        job_type: searchParams.job_type || undefined,
        experience: searchParams.experience || undefined,
        remote_onsite: searchParams.remote_onsite || undefined,
        skills: searchParams.skills || undefined,
        salary_min: searchParams.salary_min || undefined,
        sort_by: searchParams.sort_by || undefined,
        page: searchParams.page,
        limit: 10
      })
      return res.data
    },
    enabled: hasSearched,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    retry: false
  })

  // Auto-select first job on load or restore selected job from navigation store
  useEffect(() => {
    if (discoveryData?.jobs?.length > 0) {
      const targetId = selectedJobId !== null ? selectedJobId : selectedJob?.id
      const found = discoveryData.jobs.find((j: any) => j.id === targetId)
      if (found) {
        setSelectedJob(found)
      } else {
        setSelectedJob(discoveryData.jobs[0])
        setSelectedJobId(discoveryData.jobs[0].id)
      }
    } else {
      setSelectedJob(null)
      setSelectedJobId(null)
    }
  }, [discoveryData, selectedJobId])

  // ─── MUTATIONS ────────────────────────────────────────────────────────────
  const trackJobMutation = useMutation({
    mutationFn: async (job: any) => {
      const res = await jobsApi.track({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_industry: job.company_industry,
        company_website: job.company_website,
        description: job.description,
        requirements: (job.matched_skills || []).concat(job.missing_skills || []),
        location: job.location,
        experience: job.experience,
        job_type: job.job_type,
        remote_onsite: job.remote_onsite,
        salary_range: job.salary_range,
        external_apply_url: job.external_apply_url
      })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setFeedbackToast(data.message || "Job tracked successfully!")
      setTimeout(() => setFeedbackToast(null), 4000)
    },
    onError: (err: any) => {
      setErrorToast(`Error tracking job: ${err?.response?.data?.detail || err.message}`)
      setTimeout(() => setErrorToast(null), 4000)
    }
  })

  const confirmApplyMutation = useMutation({
    mutationFn: async (job: any) => {
      const res = await jobsApi.confirmApply({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_industry: job.company_industry,
        company_website: job.company_website,
        description: job.description,
        requirements: (job.matched_skills || []).concat(job.missing_skills || []),
        location: job.location,
        experience: job.experience,
        job_type: job.job_type,
        remote_onsite: job.remote_onsite,
        salary_range: job.salary_range,
        external_apply_url: job.external_apply_url
      })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setHandoffModalJob(null)
      setFeedbackToast("Application tracked — ACE recorded this application based on your confirmation.")
      setTimeout(() => setFeedbackToast(null), 5000)
    },
    onError: (err: any) => {
      setErrorToast(`Error recording confirmation: ${err?.response?.data?.detail || err.message}`)
      setTimeout(() => setErrorToast(null), 5000)
    }
  })

  const handleInitiateApply = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!job.external_apply_url || !job.external_apply_url.trim().startsWith('http')) {
      setErrorToast("Application link unavailable: ACE cannot open an external application page for this position.")
      setTimeout(() => setErrorToast(null), 5000)
      return
    }
    setHandoffModalJob(job)
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setHasSearched(true)
    setJobSearchParams({
      keyword,
      location,
      role,
      job_type: jobType,
      experience,
      remote_onsite: remoteOnsite,
      skills,
      salary_min: salaryMin,
      page: 1
    })
    setSearchProgress(0)
    setShowProgress(true)
  }

  const handleReset = () => {
    resetJobsState()
    setShowProgress(false)
    setSearchProgress(0)
    setSelectedJob(null)
  }

  const removeFilter = (key: string) => {
    setJobInputs({ [key]: '' })
    setJobSearchParams({ [key]: '', page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setJobSearchParams({ page: newPage })
    setSearchProgress(0)
    setShowProgress(true)
  }

  // Matching badge styling — ACE Green Semantic System
  // LOW (0–39%): light green | MEDIUM (40–69%): medium green | HIGH (70–100%): dark green
  const getMatchBadgeStyle = (score: number | null) => {
    if (score === null || score === undefined) {
      return { bg: 'bg-[#E3EFD3]/60', text: 'text-[#4E6243]', label: 'No Profile', level: 'none' }
    }
    if (score < 40) {
      return { bg: 'bg-[#E3EFD3]', text: 'text-[#4E6243]', label: 'Low Fit', level: 'low' }
    }
    if (score < 70) {
      return { bg: 'bg-[#AEC3B0]', text: 'text-[#0D2B1D]', label: 'Moderate Fit', level: 'medium' }
    }
    return { bg: 'bg-[#234F45]', text: 'text-white', label: 'High Fit', level: 'high' }
  }

  // Progress bar animation effect
  React.useEffect(() => {
    if (!showProgress) return
    if (isJobsLoading) {
      setSearchProgress(20)
      const t1 = setTimeout(() => setSearchProgress(50), 300)
      const t2 = setTimeout(() => setSearchProgress(75), 800)
      const t3 = setTimeout(() => setSearchProgress(90), 1500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    } else {
      setSearchProgress(100)
      const t = setTimeout(() => setShowProgress(false), 400)
      return () => clearTimeout(t)
    }
  }, [isJobsLoading, showProgress])

  const activeChips = [
    searchParams.keyword && { key: 'keyword', label: `Keyword: ${searchParams.keyword}` },
    searchParams.location && { key: 'location', label: `Location: ${searchParams.location}` },
    searchParams.role && { key: 'role', label: `Role: ${searchParams.role}` },
    searchParams.job_type && { key: 'job_type', label: `Type: ${searchParams.job_type}` },
    searchParams.experience && { key: 'experience', label: `Exp: ${searchParams.experience}` },
    searchParams.remote_onsite && { key: 'remote_onsite', label: `Workplace: ${searchParams.remote_onsite}` },
    searchParams.salary_min && { key: 'salary_min', label: `Min Salary: ${Number(searchParams.salary_min) / 100000}+ LPA` }
  ].filter(Boolean) as { key: string; label: string }[]

  if (isResumeLoading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto bg-[#faf9f6] min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48 bg-[#E3EFD3]" />
          <Skeleton className="h-10 w-28 bg-[#E3EFD3]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full bg-[#E3EFD3]/50 col-span-1" />
          <Skeleton className="h-96 w-full bg-[#E3EFD3]/50 col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 text-[#1e293b] min-h-screen bg-[#FAF9F6] max-w-7xl mx-auto px-6 py-8 font-sans antialiased">

      {/* ─── ANIMATED TOP PROGRESS BAR ──────────────────────────────────────── */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#E3EFD3]">
          <div
            className="h-full bg-[#234F45] transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${searchProgress}%` }}
          />
        </div>
      )}

      {/* ─── 1. COMMERCIAL HERO HEADER ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#AEC3B0]/60 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] via-[#336659] to-[#047857] bg-clip-text text-transparent">
              Job Intelligence
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[#334155] font-semibold mt-1">
            Discover opportunities aligned with your candidate profile and technical experience vectors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="border-[#336659]/30 text-[#336659] hover:bg-[#E3EFD3] font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all"
            onClick={() => navigate('/career')}
          >
            <Sparkles size={15} className="text-[#336659]" /> Ask A.C.E.
          </Button>
          <Button
            className="bg-[#285A4F] hover:bg-[#1A3E36] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-xs transition-all"
            onClick={() => navigate('/applications')}
          >
            <Target size={15} /> Tracked Applications
          </Button>
        </div>
      </div>

      {/* ─── 2. PROFESSIONAL UNIFIED SEARCH & FILTER BAR ───────────────────── */}
      <form onSubmit={handleSearch} className="space-y-3">
        {/* Single Seamless Search Pill Container */}
        <div className="flex items-center bg-white border border-[#AEC3B0] focus-within:border-[#336659] focus-within:ring-2 focus-within:ring-[#336659]/20 rounded-2xl p-2 shadow-sm transition-all">
          {/* Keyword Search Input */}
          <div className="relative flex-1 flex items-center px-3 py-1">
            <Search className="text-[#336659] flex-shrink-0 mr-3" size={20} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job title, keywords, or company (e.g. Developer, Python, AI)..."
              className="w-full bg-transparent text-sm font-semibold text-[#0D2B1D] placeholder-[#334155]/50 outline-none border-none focus:outline-none focus:ring-0"
            />
          </div>



          {/* Embedded Search Button inside Pill */}
          <Button
            type="submit"
            disabled={isJobsLoading}
            className="bg-[#285A4F] hover:bg-[#1A3E36] disabled:bg-[#234F45]/70 text-white font-extrabold px-7 py-3 text-sm rounded-xl flex items-center justify-center gap-2 flex-shrink-0 shadow-xs transition-all ml-1"
          >
            {isJobsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" /> Searching...
              </>
            ) : (
              <>
                <Search size={16} /> Search Jobs
              </>
            )}
          </Button>
        </div>

        {/* Filter Controls Row — all in one line */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="" className="bg-[#0D2B1D] text-white">Role (Any)</option>
              <option value="Backend" className="bg-[#0D2B1D] text-white">Backend Engineer</option>
              <option value="Frontend" className="bg-[#0D2B1D] text-white">Frontend Developer</option>
              <option value="Fullstack" className="bg-[#0D2B1D] text-white">Fullstack Developer</option>
              <option value="DevOps" className="bg-[#0D2B1D] text-white">DevOps / SRE</option>
              <option value="Data" className="bg-[#0D2B1D] text-white">Data / AI Engineer</option>
            </select>

            <select
              value={remoteOnsite}
              onChange={(e) => setRemoteOnsite(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="" className="bg-[#0D2B1D] text-white">Workplace (Any)</option>
              <option value="Remote" className="bg-[#0D2B1D] text-white">Remote</option>
              <option value="On-site" className="bg-[#0D2B1D] text-white">On-site</option>
            </select>

            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="" className="bg-[#0D2B1D] text-white">Type (Any)</option>
              <option value="Full-time" className="bg-[#0D2B1D] text-white">Full-time</option>
              <option value="Part-time" className="bg-[#0D2B1D] text-white">Part-time</option>
              <option value="Contract" className="bg-[#0D2B1D] text-white">Contract</option>
            </select>

            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="" className="bg-[#0D2B1D] text-white">Experience (Any)</option>
              <option value="Internship" className="bg-[#0D2B1D] text-white">Internship</option>
              <option value="Entry" className="bg-[#0D2B1D] text-white">Entry Level</option>
              <option value="Intermediate" className="bg-[#0D2B1D] text-white">Intermediate</option>
              <option value="Senior" className="bg-[#0D2B1D] text-white">Senior Level</option>
              <option value="Lead" className="bg-[#0D2B1D] text-white">Lead / Architect</option>
            </select>

            <select
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="" className="bg-[#0D2B1D] text-white">Min Salary (Any)</option>
              <option value="100000" className="bg-[#0D2B1D] text-white">1+ LPA</option>
              <option value="300000" className="bg-[#0D2B1D] text-white">3+ LPA</option>
              <option value="500000" className="bg-[#0D2B1D] text-white">5+ LPA</option>
              <option value="1000000" className="bg-[#0D2B1D] text-white">10+ LPA</option>
              <option value="1500000" className="bg-[#0D2B1D] text-white">15+ LPA</option>
              <option value="2000000" className="bg-[#0D2B1D] text-white">20+ LPA</option>
            </select>
            {/* Location input — same row as other filters */}
            <div className="relative flex items-center bg-[#285A4F] hover:bg-[#1A3E36] transition-all rounded-xl px-3.5 py-2 gap-2 shadow-xs">
              <MapPin className="text-white flex-shrink-0" size={13} />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location..."
                className="bg-transparent text-white text-xs font-bold placeholder:text-white placeholder:opacity-100 outline-none border-none focus:outline-none focus:ring-0 w-24"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#AEC3B0]/30">
            <span className="text-xs font-bold text-[#334155]">Active Filters:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E3EFD3] text-[#0D2B1D] text-xs font-bold border border-[#336659]/20"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeFilter(chip.key)}
                  className="hover:text-rose-700 p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="text-2xs text-[#336659] hover:underline font-bold ml-1 flex items-center gap-1"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        )}
      </form>

      {/* ─── 3. MAIN DUAL-COLUMN WORKSPACE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: JOB RESULTS FEED (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {hasSearched && (
            <div className="flex items-center justify-between text-xs uppercase font-extrabold tracking-widest text-[#0D2B1D] px-1">
              <span>Opportunities {discoveryData?.total_count ? `(${discoveryData.total_count.toLocaleString()})` : ''}</span>
              {searchParams.sort_by === 'date' && (
                <span className="flex items-center gap-1 text-[#336659]">
                  <Clock size={13} /> Sorted by Freshness
                </span>
              )}
            </div>
          )}

          {!hasSearched ? (
            <Card className="text-center py-20 text-[#334155] border border-[#AEC3B0]/60 bg-white rounded-2xl shadow-xs">
              <Search size={48} className="mx-auto mb-4 text-[#336659]" />
              <p className="text-base font-extrabold text-[#0D2B1D] mb-1">Search to discover opportunities</p>
              <p className="text-xs text-[#334155] max-w-sm mx-auto font-medium leading-relaxed">
                Enter a job title, keyword, or location in the search container above to query live opportunities tailored to your candidate vectors.
              </p>
            </Card>
          ) : isJobsLoading ? (
            <div className="space-y-4">
              {/* Prominent Loading Status Banner */}
              <Card className="p-6 text-center bg-white border border-[#AEC3B0]/60 rounded-2xl shadow-xs space-y-3">
                <Loader2 size={36} className="animate-spin text-[#336659] mx-auto" />
                <h3 className="text-sm font-extrabold text-[#0D2B1D]">Discovering Matching Opportunities...</h3>
                <p className="text-xs text-[#334155] font-medium max-w-xs mx-auto">
                  Fetching live listings and calculating NLP semantic match scores against your candidate vectors.
                </p>
              </Card>

              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-5 space-y-3 bg-white border border-[#AEC3B0]/60 rounded-2xl">
                  <div className="flex gap-4">
                    <Skeleton className="h-11 w-11 rounded-xl bg-[#E3EFD3]" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 bg-[#E3EFD3]" />
                      <Skeleton className="h-3 w-1/2 bg-[#E3EFD3]" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full bg-[#E3EFD3]" />
                  <Skeleton className="h-6 w-2/3 bg-[#E3EFD3]/60" />
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="text-center py-12 border-rose-500/20 bg-rose-500/5 text-rose-700 rounded-2xl">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              <h3 className="font-bold text-sm">Failed to retrieve job listings</h3>
              <p className="text-xs mt-1 text-[#3d3d3d]">
                {(error as any)?.message || 'Network timeout or service unavailable. Please try again.'}
              </p>
              <Button
                size="sm"
                className="mt-4 bg-[#234F45] text-white font-bold"
                onClick={() => refetch()}
              >
                Retry Search
              </Button>
            </Card>
          ) : !discoveryData?.jobs || discoveryData.jobs.length === 0 ? (
            <Card className="text-center py-16 text-[#0D2B1D] border border-[#AEC3B0]/60 bg-white rounded-2xl shadow-xs">
              <Compass size={40} className="mx-auto mb-3 text-[#336659]" />
              <p className="text-sm font-bold mb-1">No matching opportunities found</p>
              <p className="text-xs text-[#334155] max-w-xs mx-auto mb-4 font-medium">
                Try broadening your search — remove filters or use a different keyword.
              </p>
              <Button size="sm" variant="secondary" onClick={handleReset} className="font-bold">
                Reset Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {discoveryData.jobs.map((job: any) => {
                const badge = getMatchBadgeStyle(job.match_score)
                const isSelected = selectedJob?.id === job.id

                return (
                  <div
                    key={job.id}
                    onClick={() => { handleSetSelectedJob(job); setIsDescriptionExpanded(false); }}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden bg-white shadow-xs ${
                      isSelected
                        ? 'border-[#336659] ring-2 ring-[#336659]/20 shadow-md'
                        : 'border-[#AEC3B0]/60 hover:border-[#336659]/60 hover:shadow-md'
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Gradient Company Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#336659] to-[#0D2B1D] text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                        {job.company_name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-extrabold text-base text-[#0D2B1D] truncate leading-snug">
                            {job.title}
                          </h3>
                          
                          <span className={`${badge.bg} ${badge.text} border-none font-extrabold text-[10px] py-0.5 px-2.5 flex-shrink-0 rounded-lg inline-flex items-center gap-1 tracking-wide`}>
                            {job.match_score !== null ? (
                              <>{Math.round(job.match_score)}%<span className="font-semibold opacity-80 text-[9px]">FIT</span></>
                            ) : 'N/A'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-[#336659]">
                          {job.company_name}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-[#334155] pt-0.5">
                          <span className="flex items-center gap-1"><MapPin size={13} /> {job.location}</span>
                          <span className="text-[#AEC3B0]">•</span>
                          <span className="flex items-center gap-1"><Clock size={13} /> {job.job_type}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#3d3d3d]/80 line-clamp-2 mt-3 leading-relaxed font-normal">
                      {job.description}
                    </p>

                    {job.matched_skills && job.matched_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.matched_skills.slice(0, 4).map((sk: string, i: number) => (
                          <Badge key={i} className="bg-[#E3EFD3] text-[#336659] text-3xs border-none font-semibold py-0.5 px-2 rounded-md">
                            ✓ {sk}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#E3EFD3]">
                      <span className="text-xs font-bold text-[#0D2B1D]">
                        {job.salary_range.includes('Estimated')
                          ? job.salary_range.replace('Estimated market range: ', '')
                          : 'Salary on request'}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedJob(job)
                            const detailEl = document.getElementById('job-detail-panel')
                            if (detailEl) {
                              detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                          }}
                          className="text-xs font-bold text-[#336659] hover:bg-[#E3EFD3]/80 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View Details
                        </button>
                        {getJobApplicationStatus(job) === 'applied' ? (
                          <span className="px-3.5 py-1.5 bg-[#234F45] text-white text-xs font-extrabold rounded-lg flex items-center gap-1 shadow-xs">
                            <CheckCircle size={13} /> ✓ Applied
                          </span>
                        ) : getJobApplicationStatus(job) === 'tracked' ? (
                          <button
                            type="button"
                            onClick={(e) => handleInitiateApply(job, e)}
                            className="px-3.5 py-1.5 bg-[#E3EFD3] text-[#336659] hover:bg-[#336659] hover:text-white text-xs font-extrabold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                          >
                            Apply <ArrowUpRight size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleInitiateApply(job, e)}
                            className="px-4 py-1.5 bg-[#285A4F] hover:bg-[#1A3E36] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                          >
                            Apply <ArrowUpRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination Controls */}
              {discoveryData?.total_count > 10 && (
                <div className="flex items-center justify-between pt-4 text-xs font-bold">
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="px-4 py-2 bg-white border border-[#AEC3B0]/60 rounded-xl disabled:opacity-40 hover:bg-[#E3EFD3] text-[#336659] transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-[#334155] font-bold">
                    Page {page} of {Math.ceil(discoveryData.total_count / 10)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(discoveryData.total_count / 10)}
                    onClick={() => handlePageChange(page + 1)}
                    className="px-4 py-2 bg-white border border-[#AEC3B0]/60 rounded-xl disabled:opacity-40 hover:bg-[#E3EFD3] text-[#336659] transition-colors"
                  >
                    Next Page
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI SUITE DETAIL PANEL (5 Cols) */}
        <div id="job-detail-panel" className="lg:col-span-5">
          {selectedJob ? (
            <Card className="bg-white border border-[#AEC3B0]/60 shadow-xs p-6 space-y-5 animate-fade-in sticky top-6 rounded-2xl">
              
              {/* Header Info */}
              <div className="flex justify-between items-start gap-3 pb-4 border-b border-[#E3EFD3]">
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#336659] to-[#0D2B1D] text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-xs">
                    {selectedJob.company_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-extrabold text-[#0D2B1D] leading-tight">
                      {selectedJob.title}
                    </h2>
                    <p className="text-xs font-bold text-[#336659]">
                      {selectedJob.company_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#334155] pt-0.5">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {selectedJob.location}</span>
                      <span className="text-[#AEC3B0]">•</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {selectedJob.job_type}</span>
                    </div>
                  </div>
                </div>

                {selectedJob.match_score !== null && (
                  <div className={`${getMatchBadgeStyle(selectedJob.match_score).bg} ${getMatchBadgeStyle(selectedJob.match_score).text} font-extrabold px-3 py-1.5 text-sm border-none rounded-xl flex-shrink-0 flex items-center gap-1.5 shadow-sm`}>
                    <span className="text-base leading-none">{Math.round(selectedJob.match_score)}%</span>
                    <span className="text-[10px] font-bold opacity-80 uppercase">Fit</span>
                  </div>
                )}
              </div>

              {/* Primary Actions */}
              <div className="flex gap-2.5">
                {getJobApplicationStatus(selectedJob) === 'applied' ? (
                  <div className="flex-1 bg-[#234F45] text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs">
                    <CheckCircle size={15} /> ✓ Applied
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleInitiateApply(selectedJob, e)}
                    className="flex-1 bg-[#285A4F] hover:bg-[#1A3E36] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-center text-xs transition-colors shadow-xs"
                  >
                    Apply <ArrowUpRight size={13} />
                  </button>
                )}
                {getJobApplicationStatus(selectedJob) === 'applied' ? (
                  <div className="bg-[#E3EFD3] text-[#0D2B1D] font-bold py-2.5 px-3 rounded-xl border border-[#336659]/20 text-xs flex items-center">
                    Confirmed
                  </div>
                ) : getJobApplicationStatus(selectedJob) === 'tracked' ? (
                  <div className="bg-[#E3EFD3] text-[#336659] font-bold py-2.5 px-3 rounded-xl border border-[#336659]/20 text-xs flex items-center">
                    ✓ Tracked
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="border-[#336659]/30 text-[#336659] hover:bg-[#E3EFD3] font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs"
                    loading={trackJobMutation.isPending}
                    onClick={() => trackJobMutation.mutate(selectedJob)}
                  >
                    <Target size={14} /> Track Opp
                  </Button>
                )}
              </div>

              {/* Compensation Box */}
              <div className="p-3.5 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#0D2B1D]">
                  <span className="flex items-center gap-1 text-[#336659]">
                    <DollarSign size={14} /> Compensation
                  </span>
                  <span className="text-[#336659]">
                    {selectedJob.salary_range}
                  </span>
                </div>
                <p className="text-xs text-[#334155] font-medium">
                  {selectedJob.salary_range !== "Salary estimate unavailable"
                    ? "*Market estimate based on role, location & industry benchmark data."
                    : "Salary details not specified in posting."}
                </p>
              </div>

              {/* AI Compatibility Report */}
              {selectedJob.match_score !== null ? (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#0D2B1D] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#336659]" /> AI Compatibility Report
                  </h3>
                  
                  <div className="p-4 bg-[#FAF9F6] border border-[#AEC3B0]/40 rounded-xl space-y-3">
                    <div className="flex justify-between items-end text-xs font-bold text-[#0D2B1D]">
                      <span>NLP Semantic Vector Coverage</span>
                      <span className="text-[#336659]">{Math.round(selectedJob.match_score)}%</span>
                    </div>
                    <ProgressBar value={selectedJob.match_score} variant="score" />
                    
                    <div className="space-y-3 text-xs pt-2">
                      <div>
                        <span className="font-bold text-[#0D2B1D] block">Why You Match:</span>
                        <p className="text-[#1e293b] mt-0.5 leading-relaxed font-medium">{selectedJob.why_match}</p>
                      </div>
                      <div>
                        <span className="font-bold text-[#0D2B1D] block">Key Gap Areas:</span>
                        <p className="text-[#1e293b] mt-0.5 leading-relaxed font-medium">{selectedJob.weakness_reasons}</p>
                      </div>
                      <div>
                        <span className="font-bold text-[#0D2B1D] block">Experience Alignment:</span>
                        <p className="text-[#1e293b] mt-0.5 leading-relaxed font-medium">{selectedJob.experience_alignment}</p>
                      </div>
                    </div>
                  </div>

                  {/* Skills Mapping — ACE Green Semantic System */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[#E3EFD3]/40 border border-[#AEC3B0]/40 rounded-xl">
                      <h4 className="text-[10px] font-extrabold text-[#336659] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <CheckCircle size={11} /> Matched Skills ({selectedJob.matched_skills?.length || 0})
                      </h4>
                      {selectedJob.matched_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedJob.matched_skills.map((sk: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-[#E3EFD3] text-[#0D2B1D] text-[10px] font-bold px-2 py-0.5 rounded-md">
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#4E6243] font-medium italic">No exact skill matches detected</p>
                      )}
                    </div>

                    <div className="p-3.5 bg-[#AEC3B0]/15 border border-[#336659]/15 rounded-xl">
                      <h4 className="text-[10px] font-extrabold text-[#234F45] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <TrendingUp size={11} /> Recommended ({selectedJob.missing_skills?.length || 0})
                      </h4>
                      {selectedJob.missing_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedJob.missing_skills.map((sk: string, i: number) => (
                            <span key={i} className="inline-flex items-center bg-[#AEC3B0]/30 text-[#0D2B1D] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#336659]/15">
                              {sk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#4E6243] font-medium italic">No additional skills recommended</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl flex items-center gap-2.5 text-xs text-[#0D2B1D] font-medium">
                  <Info size={18} className="text-[#336659]" />
                  <span>Personalized match diagnostics are locked. Upload your resume to map compatibility.</span>
                </div>
              )}

              {/* Complete Job Description — Progressive Disclosure */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#0D2B1D]">
                    Job Description
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-[10px] font-bold text-[#336659] hover:text-[#234F45] flex items-center gap-1 transition-colors"
                  >
                    {isDescriptionExpanded ? (
                      <><ChevronUp size={12} /> Collapse</>
                    ) : (
                      <><ChevronDown size={12} /> Show full description</>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <div
                    className={`text-xs text-[#1e293b] leading-relaxed font-medium whitespace-pre-line bg-[#FAF9F6] p-4 rounded-xl border border-[#AEC3B0]/40 overflow-hidden transition-all duration-300 ${
                      isDescriptionExpanded ? 'max-h-[600px] overflow-y-auto' : 'max-h-32'
                    }`}
                  >
                    {selectedJob.description}
                  </div>
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#FAF9F6] to-transparent rounded-b-xl pointer-events-none" />
                  )}
                </div>
              </div>

              {/* AI Recommended Next Step — Roadmap Bridge CTA */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#E3EFD3]/40 to-[#AEC3B0]/20 border border-[#336659]/15 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#336659]/10 flex items-center justify-center flex-shrink-0">
                    <Lightbulb size={16} className="text-[#336659]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0D2B1D]">Bridge missing skill requirements</p>
                    <p className="text-[10px] text-[#4E6243] font-medium mt-0.5">Explore custom study roadmaps for this role.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/skills')}
                  className="text-[11px] font-extrabold text-[#336659] hover:text-[#0D2B1D] flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#E3EFD3]/60 transition-colors flex-shrink-0"
                >
                  Skill Roadmap <ArrowRight size={12} />
                </button>
              </div>

            </Card>
          ) : (
            <Card className="text-center py-24 text-[#334155] border border-[#AEC3B0]/60 bg-white rounded-2xl shadow-xs">
              <Briefcase size={40} className="mx-auto mb-3 text-[#336659]" />
              <p className="text-sm font-bold text-[#0D2B1D]">
                {hasSearched ? 'Select a job from the feed to view AI compatibility report.' : 'Search for jobs to get started.'}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ─── EXTERNAL APPLICATION HANDOFF MODAL ────────────────────────────── */}
      {handoffModalJob && (
        <div 
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setHandoffModalJob(null) }}
          className="fixed inset-0 bg-[#0D2B1D]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className="bg-white border border-[#AEC3B0] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setHandoffModalJob(null)}
              className="absolute top-4 right-4 text-[#334155] hover:text-[#0D2B1D] p-1 rounded-lg hover:bg-[#E3EFD3] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#336659] bg-[#E3EFD3] px-2.5 py-0.5 rounded-md inline-block">
                External Application Handoff
              </span>
              <h2 className="text-lg font-extrabold text-[#0D2B1D] leading-snug">
                Apply to {handoffModalJob.title}
              </h2>
              <p className="text-xs font-bold text-[#336659]">{handoffModalJob.company_name}</p>
            </div>

            <div className="p-4 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl space-y-2 text-xs text-[#1e293b] font-medium leading-relaxed">
              <p>
                You're being redirected to the external application page for this position.
              </p>
              <p className="text-[#4E6243] font-semibold text-[11px]">
                ACE can't verify whether the application was submitted on the external site.
              </p>
            </div>

            <div className="pt-1">
              <a
                href={handoffModalJob.external_apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#285A4F] hover:bg-[#1A3E36] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
              >
                Open Application <ArrowUpRight size={15} />
              </a>
            </div>

            <div className="pt-2 border-t border-[#E3EFD3] space-y-2">
              <p className="text-[11px] font-bold text-[#0D2B1D] text-center">After you finish applying:</p>
              <div className="flex gap-2.5">
                <Button
                  className="flex-1 bg-[#234F45] hover:bg-[#0D2B1D] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  loading={confirmApplyMutation.isPending}
                  onClick={() => confirmApplyMutation.mutate(handoffModalJob)}
                >
                  <CheckCircle size={14} /> ✓ I Applied
                </Button>
                <Button
                  variant="secondary"
                  className="border-[#AEC3B0] text-[#334155] hover:bg-[#FAF9F6] font-bold py-2.5 px-4 rounded-xl text-xs"
                  onClick={() => setHandoffModalJob(null)}
                >
                  Not Yet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0D2B1D] text-white border border-[#10B981]/40 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-xs font-bold max-w-sm animate-slide-up">
          <CheckCircle className="text-[#10B981] flex-shrink-0" size={20} />
          <span>{feedbackToast}</span>
          <button onClick={() => setFeedbackToast(null)} className="ml-auto text-white/60 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-900 text-white border border-rose-500/40 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-xs font-bold max-w-sm animate-slide-up">
          <AlertTriangle className="text-rose-300 flex-shrink-0" size={20} />
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-auto text-white/60 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  )
}
