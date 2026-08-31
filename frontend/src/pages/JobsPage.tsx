import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeApi, jobsApi } from '@/api'
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
  
  // ─── SEARCH & FILTER INPUT STATES ──────────────────────────────────────────
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [role, setRole] = useState('')
  const [jobType, setJobType] = useState('')
  const [experience, setExperience] = useState('')
  const [remoteOnsite, setRemoteOnsite] = useState('')
  const [skills, setSkills] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [page, setPage] = useState(1)

  // Track whether user has triggered a search — default false prevents automatic API calls on mount
  const [hasSearched, setHasSearched] = useState(false)

  // Track search progress for animated loading bar
  const [searchProgress, setSearchProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)

  // Applied search parameters (sent to API)
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    location: '',
    role: '',
    job_type: '',
    experience: '',
    remote_onsite: '',
    skills: '',
    salary_min: '',
    sort_by: 'relevance',
    page: 1
  })

  // Selected job for sticky right-pane details view
  const [selectedJob, setSelectedJob] = useState<any>(null)

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

  // 2. Fetch live job discovery — strictly enabled ONLY after user clicks Search
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
    enabled: hasSearched, // Prevents firing API calls until user explicitly submits a search query
    staleTime: 1000 * 60 * 15, // Keeps results cached when switching tabs
    gcTime: 1000 * 60 * 30, // Persists query cache across unmounts
    retry: false
  })

  // Auto-select first job on load
  useEffect(() => {
    if (discoveryData?.jobs?.length > 0) {
      const stillExists = discoveryData.jobs.find((j: any) => j.id === selectedJob?.id)
      if (!stillExists) {
        setSelectedJob(discoveryData.jobs[0])
      } else {
        setSelectedJob(stillExists)
      }
    } else {
      setSelectedJob(null)
    }
  }, [discoveryData])

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
      alert(data.message || "Job tracked successfully!")
    },
    onError: (err: any) => {
      alert(`Error tracking job: ${err?.response?.data?.detail || err.message}`)
    }
  })

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setHasSearched(true)
    setSearchParams({
      keyword,
      location,
      role,
      job_type: jobType,
      experience,
      remote_onsite: remoteOnsite,
      skills,
      salary_min: salaryMin,
      sort_by: sortBy,
      page: 1
    })
    setPage(1)
    setSearchProgress(0)
    setShowProgress(true)
  }

  const handleReset = () => {
    setKeyword('')
    setLocation('')
    setRole('')
    setJobType('')
    setExperience('')
    setRemoteOnsite('')
    setSkills('')
    setSalaryMin('')
    setSortBy('relevance')
    setPage(1)
    setHasSearched(false)
    setShowProgress(false)
    setSearchProgress(0)
    setSearchParams({
      keyword: '',
      location: '',
      role: '',
      job_type: '',
      experience: '',
      remote_onsite: '',
      skills: '',
      salary_min: '',
      sort_by: 'relevance',
      page: 1
    })
  }

  const removeFilter = (key: string) => {
    if (key === 'keyword') setKeyword('')
    if (key === 'location') setLocation('')
    if (key === 'role') setRole('')
    if (key === 'job_type') setJobType('')
    if (key === 'experience') setExperience('')
    if (key === 'remote_onsite') setRemoteOnsite('')
    if (key === 'skills') setSkills('')
    if (key === 'salary_min') setSalaryMin('')
    
    setSearchParams(prev => ({ ...prev, [key]: '', page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSearchParams(prev => ({ ...prev, page: newPage }))
    setSearchProgress(0)
    setShowProgress(true)
  }

  // Matching badge styling
  const getMatchBadgeStyle = (score: number | null) => {
    if (score === null || score === undefined) {
      return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'No Profile' }
    }
    if (score < 40) {
      return { bg: 'bg-[#E3EFD3]', text: 'text-[#336659]', label: 'Low Fit' }
    }
    if (score < 70) {
      return { bg: 'bg-[#AEC3B0]', text: 'text-[#0D2B1D]', label: 'Moderate Fit' }
    }
    if (score < 85) {
      return { bg: 'bg-[#234F45]', text: 'text-white', label: 'High Fit' }
    }
    return { bg: 'bg-[#0D2B1D]', text: 'text-white', label: 'Exceptional Fit' }
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

          <div className="hidden md:block w-px h-8 bg-[#AEC3B0]/40 mx-2" />

          {/* Location Input */}
          <div className="hidden md:flex relative w-64 items-center px-3 py-1">
            <MapPin className="text-[#336659] flex-shrink-0 mr-2.5" size={18} />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or 'Remote'..."
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

        {/* Filter Controls Row — Solid Green Pill Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
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
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#285A4F] hover:bg-[#1A3E36] text-white border-none rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-all shadow-xs"
            >
              <option value="relevance" className="bg-[#0D2B1D] text-white">Sort: Most Relevant</option>
              <option value="date" className="bg-[#0D2B1D] text-white">Sort: Most Recent</option>
            </select>

            <button
              type="button"
              onClick={() => handleSearch()}
              className="px-4 py-2 bg-[#285A4F] hover:bg-[#1A3E36] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Filter size={13} /> Apply
            </button>
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
                    onClick={() => setSelectedJob(job)}
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
                          
                          <Badge className={`${badge.bg} ${badge.text} border-none font-bold text-3xs py-0.5 px-2 flex-shrink-0 rounded-md`}>
                            {job.match_score !== null ? `${Math.round(job.match_score)}% FIT` : 'NO PROFILE'}
                          </Badge>
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
                        <a
                          href={job.external_apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-1.5 bg-[#285A4F] hover:bg-[#1A3E36] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                        >
                          Apply <ArrowUpRight size={13} />
                        </a>
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
                  <Badge className={`${getMatchBadgeStyle(selectedJob.match_score).bg} ${getMatchBadgeStyle(selectedJob.match_score).text} font-extrabold px-2.5 py-1 text-xs border-none rounded-md flex-shrink-0`}>
                    {Math.round(selectedJob.match_score)}% FIT
                  </Badge>
                )}
              </div>

              {/* Primary Actions */}
              <div className="flex gap-2.5">
                <a
                  href={selectedJob.external_apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#285A4F] hover:bg-[#1A3E36] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-center text-xs transition-colors shadow-xs"
                >
                  Apply Now <ArrowUpRight size={13} />
                </a>
                <Button
                  variant="secondary"
                  className="border-[#336659]/30 text-[#336659] hover:bg-[#E3EFD3] font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs"
                  loading={trackJobMutation.isPending}
                  onClick={() => trackJobMutation.mutate(selectedJob)}
                >
                  <Target size={14} /> Track Opp
                </Button>
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
                  
                  <div className="p-4 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl space-y-3">
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

                  {/* Skills Mapping */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#E3EFD3]/50 border border-[#AEC3B0]/40 rounded-xl">
                      <h4 className="text-3xs font-extrabold text-[#336659] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <CheckCircle size={10} /> Matched Skills ({selectedJob.matched_skills?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedJob.matched_skills?.map((sk: string, i: number) => (
                          <Badge key={i} className="bg-[#E3EFD3] text-[#0D2B1D] text-3xs border-none font-bold">
                            {sk}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <h4 className="text-3xs font-extrabold text-amber-900 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <AlertTriangle size={10} /> Recommended ({selectedJob.missing_skills?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedJob.missing_skills?.map((sk: string, i: number) => (
                          <Badge key={i} className="bg-amber-500/10 text-amber-900 text-3xs border-none font-bold">
                            {sk}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl flex items-center gap-2.5 text-xs text-[#0D2B1D] font-medium">
                  <Info size={18} className="text-[#336659]" />
                  <span>Personalized match diagnostics are locked. Upload your resume to map compatibility.</span>
                </div>
              )}

              {/* Complete Job Description Section */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#0D2B1D]">
                  Complete Job Description
                </h3>
                <p className="text-xs text-[#1e293b] leading-relaxed font-medium whitespace-pre-line bg-[#FAF9F6] p-4 rounded-xl border border-[#AEC3B0]/40 max-h-60 overflow-y-auto custom-scrollbar">
                  {selectedJob.description}
                </p>
              </div>

              {/* AI Recommended Next Step */}
              <div className="flex items-center justify-between p-3.5 bg-[#FAF9F6] border border-[#AEC3B0]/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-[#336659]" />
                  <div className="text-2xs">
                    <p className="font-bold text-[#0D2B1D]">Bridge missing skill requirements</p>
                    <p className="text-[#334155] font-semibold mt-0.5">Explore custom study roadmaps for this role.</p>
                  </div>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  className="text-3xs font-extrabold flex items-center gap-0.5 border-[#336659]/30 text-[#336659]"
                  onClick={() => navigate('/skills')}
                >
                  Roadmap <ArrowRight size={10} />
                </Button>
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

    </div>
  )
}
