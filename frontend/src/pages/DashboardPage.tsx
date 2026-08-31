import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi, resumeApi, authApi } from '@/api'
import { formatApiError } from '@/utils/error'
import { getScoreVisuals } from '@/utils/scoreTheme'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Award,
  Target,
  TrendingUp,
  Briefcase,
  Sparkles,
  Calendar,
  Building2,
  ArrowRight,
  MessageSquare,
  UploadCloud,
  FileText,
  Activity,
  Lightbulb,
  Search,
  Plus,
  Play,
  BriefcaseIcon,
  RefreshCw
} from 'lucide-react'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Redirect to Resume page to trigger upload flow
  const handleTriggerUpload = () => {
    console.log('[Diagnostic] "Update Resume" action triggered from Dashboard. Redirecting to /resume with triggerUpload state.');
    navigate('/resume', { state: { triggerUpload: true } });
  }

  // 1. Fetch live metrics from /analytics/dashboard
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['analyticsDashboard'],
    queryKeyHashFn: () => 'analyticsDashboard',
    queryFn: async () => {
      const res = await analyticsApi.getDashboard()
      return res.data
    },
    retry: false
  })

  // 2. Check if a resume is already uploaded
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryKeyHashFn: () => 'latestResume',
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 3. Fetch Profile for target role
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryKeyHashFn: () => 'userProfile',
    queryFn: async () => {
      const res = await authApi.getProfile()
      return res.data
    },
    retry: false
  })

  const targetRole = userProfile?.target_role || ''

  // 4. Fetch ATS analysis dynamically to align career score
  const { data: atsAnalysis, isLoading: isAtsLoading, isFetching: isAtsFetching } = useQuery({
    queryKey: ['atsAnalysis', targetRole],
    queryKeyHashFn: () => `atsAnalysis-${targetRole}`,
    queryFn: async () => {
      if (!targetRole) return null
      const res = await resumeApi.getAtsAnalysis(targetRole)
      return res.data
    },
    enabled: !!resume && !!targetRole,
    retry: false
  })

  // Derived user details or defaults
  const userName = userProfile?.full_name || user?.profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Candidate')
  const displayGreeting = `Greetings ${userName.charAt(0).toUpperCase() + userName.slice(1)} :)`

  // Calculate live values based on backend API schema responses
  const overview = analytics?.overview
  const skillAnalytics = analytics?.skill_analytics
  const companyAnalytics = analytics?.company_analytics
  const insightsList = analytics?.insights || []
  const recommendationsList = analytics?.recommendations || []
  const activityList = analytics?.recent_activity || []
  const skillProgress = skillAnalytics?.skill_progress || []
  const jobMatches = companyAnalytics?.top_job_matches || []
  const missingSkills = skillAnalytics?.missing_skills || []
  const weakAreas = analytics?.interview_analytics?.weak_areas || []

  // Check analysis running status
  const isAtsRunning = isAtsLoading || (isAtsFetching && !atsAnalysis)
  const hasAtsAnalysis = atsAnalysis && atsAnalysis.overall_ats_score !== null && atsAnalysis.status !== 'analysis_unavailable'

  // Keep dashboard and resume score strictly synchronized
  const careerScore = hasAtsAnalysis ? atsAnalysis.overall_ats_score : (overview?.career_score > 0 ? overview.career_score : 0)
  const jobMatchPercentage = overview?.job_match_percentage ?? 0
  const activeApplications = overview?.active_applications ?? 0
  const interviewReadiness = overview?.interview_score ?? 0
  const totalSessions = overview?.completed_interviews ?? 0

  const isLoading = isAnalyticsLoading || isResumeLoading || isProfileLoading

  // ─── ERROR STATE (API Failure handling) ──────────────────────────────────
  if (isAnalyticsError) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <Card className="p-8 text-center border-danger/30 bg-danger-light/10 dark:bg-danger/10">
          <div className="w-12 h-12 bg-danger/10 text-danger rounded-xl flex items-center justify-center mx-auto mb-4 border border-danger/20">
            <Activity size={24} />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-white mb-2">
            Unable to Load Analytics Diagnostics
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            {formatApiError(analyticsError, 'Failed to fetch candidate analytics. Please ensure the backend connection is active.')}
          </p>
          <Button icon={<RefreshCw size={16} />} onClick={() => refetchAnalytics()}>
            Retry Diagnostics
          </Button>
        </Card>
      </div>
    )
  }

  // ─── LOADING STATE (Premium Skeletons) ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex justify-between items-end mb-2">
          <div>
            <Skeleton className="h-9 w-60 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-32">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>

        {/* Hero Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="col-span-2 h-[340px]">
            <Skeleton className="h-6 w-40 mb-6" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-4 w-4/5 mb-8" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-28" />
            </div>
          </Card>
          <Card className="col-span-1 h-[340px]">
            <Skeleton className="h-6 w-32 mb-6" />
            <Skeleton className="h-12 w-full mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE (Resume Upload Prompt) ──────────────────────────────────
  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-brand-primary/20">
            <UploadCloud size={32} className="text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
            Let's build your Career Command Center
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
            Upload your resume to unlock personalized career score diagnostics, target job matches, skill roadmaps, and mock interviews.
          </p>
        </div>

        <Card
          className="border-2 border-dashed p-10 text-center transition-all cursor-pointer hover:border-brand-primary/60 dark:hover:border-brand-primary/60 border-neutral-200 dark:border-[#4E6243]"
          onClick={handleTriggerUpload}
        >
          <div className="flex flex-col items-center">
            <FileText size={48} className="text-neutral-400 dark:text-neutral-500 mb-4 animate-pulse-dot" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-white mb-1">
              Click to upload your resume
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6">
              Supports PDF, Word (DOCX) or plain TXT up to 10MB
            </p>

            <Button
              icon={<UploadCloud size={16} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleTriggerUpload();
              }}
            >
              Select File to Upload
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Determine Dynamic Next Best Career Action
  let nextActionConfig = {
    title: "Complete First Mock Interview",
    desc: "Simulate real role-specific interview rounds to evaluate performance",
    buttonText: "Start Practice Session",
    action: () => navigate('/interviews'),
    icon: <Target size={24} />
  }

  if (totalSessions === 0) {
    nextActionConfig = {
      title: "Complete First Mock Interview",
      desc: "Simulate technical interview rounds to unlock performance analytics",
      buttonText: "Start Practice Session",
      action: () => navigate('/interviews'),
      icon: <Target size={24} />
    }
  } else if (weakAreas.length > 0) {
    nextActionConfig = {
      title: `Practice Weak Area: ${weakAreas[0]}`,
      desc: "Focus practice sessions on your lowest-scoring technical areas",
      buttonText: "Practice Area",
      action: () => navigate('/interviews'),
      icon: <Target size={24} />
    }
  } else if (missingSkills.length > 0) {
    nextActionConfig = {
      title: `Learn Priority Skill: ${missingSkills[0]}`,
      desc: `Bridge skill gap in ${missingSkills[0]} identified for target roles`,
      buttonText: "View Skill Roadmap",
      action: () => navigate('/skills'),
      icon: <Sparkles size={24} />
    }
  } else if (activeApplications > 0) {
    nextActionConfig = {
      title: "Review Application Pipeline",
      desc: `Track progress and response status across ${activeApplications} applications`,
      buttonText: "Review Applications",
      action: () => navigate('/applications'),
      icon: <BriefcaseIcon size={24} />
    }
  }

  // ─── POPULATED STATE ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 font-sans">
            <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] via-[#336659] to-[#047857] bg-clip-text text-transparent drop-shadow-2xs">
              Greetings {userName.charAt(0).toUpperCase() + userName.slice(1)}
            </span>
            <span className="bg-gradient-to-r from-[#10B981] to-[#336659] bg-clip-text text-transparent font-extrabold ml-1.5 inline-block font-mono text-3xl hover:scale-110 transition-transform cursor-default">
              :)
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[#334155] dark:text-neutral-400 font-semibold">Here is your career intelligence overview.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<UploadCloud size={16} />} onClick={handleTriggerUpload}>
            Update Resume
          </Button>
          <Button icon={<Sparkles size={16} />} onClick={() => navigate('/career')}>
            Ask A.C.E.
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Career Score */}
        <Card hoverable className={`relative group border-t-4 ${hasAtsAnalysis ? getScoreVisuals(careerScore).border : 'border-t-neutral-300 dark:border-t-neutral-700'}`} onClick={() => navigate('/resume')}>
          <div className={`absolute top-5 right-5 p-2 rounded-lg transition-colors duration-300 ${hasAtsAnalysis
              ? `${getScoreVisuals(careerScore).bg} ${getScoreVisuals(careerScore).text} group-hover:bg-brand-primary group-hover:text-white`
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
            }`}>
            <Award size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Career Score</h3>
          {isAtsRunning ? (
            <div className="flex items-center gap-2 py-1">
              <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-neutral-500 font-semibold">Running analysis...</span>
            </div>
          ) : hasAtsAnalysis ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tracking-tight ${getScoreVisuals(careerScore).text}`}>
                  {careerScore}
                </span>
                <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 100</span>
              </div>
              <div className="mt-3 text-2xs font-medium flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getScoreVisuals(careerScore).indicator}`} />
                <span className={`${getScoreVisuals(careerScore).text} font-semibold`}>Diagnostics synced</span>
              </div>
            </>
          ) : (
            <div className="text-2xs text-neutral-400 dark:text-neutral-500 leading-normal py-1">
              Complete your first analysis to unlock this.
            </div>
          )}
        </Card>

        {/* Job Match */}
        <Card hoverable className={`relative group border-t-4 ${jobMatchPercentage > 0 ? getScoreVisuals(jobMatchPercentage).border : 'border-t-neutral-300 dark:border-t-neutral-700'}`} onClick={() => navigate('/companies')}>
          <div className={`absolute top-5 right-5 p-2 rounded-lg transition-colors duration-300 ${jobMatchPercentage > 0
              ? `${getScoreVisuals(jobMatchPercentage).bg} ${getScoreVisuals(jobMatchPercentage).text} group-hover:bg-brand-primary group-hover:text-white`
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
            }`}>
            <Target size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Job Match</h3>
          {jobMatchPercentage > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tracking-tight ${getScoreVisuals(jobMatchPercentage).text}`}>
                  {jobMatchPercentage}%
                </span>
              </div>
              <div className="mt-3 text-2xs font-medium text-neutral-600 dark:text-neutral-400">
                Match across tracked applications
              </div>
            </>
          ) : (
            <div className="text-2xs text-neutral-400 dark:text-neutral-500 leading-normal py-1">
              No matches yet. Complete your first analysis to unlock this.
            </div>
          )}
        </Card>

        {/* Interview Score */}
        <Card hoverable className={`relative group border-t-4 ${totalSessions > 0 ? getScoreVisuals(interviewReadiness).border : 'border-t-neutral-300 dark:border-t-neutral-700'}`} onClick={() => navigate('/interviews')}>
          <div className={`absolute top-5 right-5 p-2 rounded-lg transition-colors duration-300 ${totalSessions > 0
              ? `${getScoreVisuals(interviewReadiness).bg} ${getScoreVisuals(interviewReadiness).text} group-hover:bg-brand-primary group-hover:text-white`
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
            }`}>
            <MessageSquare size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Interview Score</h3>
          {totalSessions > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tracking-tight ${getScoreVisuals(interviewReadiness).text}`}>
                  {interviewReadiness}
                </span>
                <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 100</span>
              </div>
              <div className="mt-3 text-2xs font-medium flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getScoreVisuals(interviewReadiness).indicator}`} />
                <span className={`${getScoreVisuals(interviewReadiness).text} font-semibold`}>{totalSessions} sessions completed</span>
              </div>
            </>
          ) : (
            <div className="text-2xs text-neutral-400 dark:text-neutral-500 leading-normal py-1">
              No sessions yet. Complete your first analysis to unlock this.
            </div>
          )}
        </Card>

        {/* Applications */}
        <Card hoverable className="relative group border-t-4 border-t-brand-primary" onClick={() => navigate('/applications')}>
          <div className="absolute top-5 right-5 text-brand-primary bg-brand-light dark:bg-brand-primary/10 p-2 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
            <Briefcase size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Applications</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">{activeApplications}</span>
          </div>
          <div className="mt-3 text-2xs font-medium text-neutral-600 dark:text-neutral-400">
            {activeApplications > 0 ? 'Active tracking dashboard' : 'No active applications tracked'}
          </div>
        </Card>
      </div>

      {/* Middle Row (2:1 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ACE Intelligence Hero */}
        <Card className="lg:col-span-2 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-brand-primary bg-gradient-to-br from-white to-brand-sage/20 dark:from-[#18291E] dark:to-[#0D2B1D]">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-brand-primary animate-pulse-dot" />
                <h2 className="text-lg font-bold text-[#3d3d3d] dark:text-white tracking-tight">ACE Intelligence</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-sage/40 border border-brand-primary/20">
                <span className="ai-pulse"></span>
                <span className="text-[10px] font-semibold text-brand-primary uppercase tracking-wide">Live Synthesis</span>
              </div>
            </div>

            <h3 className="text-2xs font-bold text-brand-primary uppercase tracking-widest mb-2">Your Strongest Next Move</h3>

            {recommendationsList.length > 0 ? (
              <div className="mb-6">
                <p className="text-md font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mb-1">
                  {recommendationsList[0].title}: <span className="text-brand-primary font-normal">{recommendationsList[0].reason}</span>
                </p>
              </div>
            ) : missingSkills.length > 0 ? (
              <p className="text-md font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mb-6">
                Focus on acquiring <span className="text-brand-primary font-bold">{missingSkills.slice(0, 2).join(' & ')}</span> to expand your match score across target engineering positions.
              </p>
            ) : (
              <p className="text-md font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mb-6 font-semibold text-neutral-500">
                Complete a mock interview session or upload a resume to unlock tailored career recommendations.
              </p>
            )}

            <div className="flex gap-2 flex-wrap mb-8">
              {missingSkills.slice(0, 3).map((sk: string, i: number) => (
                <Badge key={i} variant="blue" className="bg-white dark:bg-neutral-800 border-brand-primary/30 text-brand-primary shadow-sm px-3 py-1 text-xs">
                  {sk} • High Impact
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <Button iconRight={<ArrowRight size={16} />} onClick={() => navigate('/skills')}>
              View Skill Roadmap
            </Button>
            <Button variant="secondary" onClick={() => navigate('/career')}>
              Ask ACE Agent
            </Button>
          </div>
        </Card>

        {/* Action Quick Launch Card */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest">Next Best Career Action</h3>
              <Badge variant="blue" size="xs">Active Session</Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-brand-light dark:bg-brand-primary/20 rounded-xl flex items-center justify-center border border-brand-primary/30 text-brand-primary">
                {nextActionConfig.icon}
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 dark:text-white text-base">{nextActionConfig.title}</h3>
                <p className="text-xs text-neutral-500 font-medium">{nextActionConfig.desc}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary" />
                <span>Simulate real role-specific interview rounds</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary" />
                <span>Get immediate action verb & clarity metrics</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
            <Button variant="primary" fullWidth iconRight={<ArrowRight size={16} />} onClick={nextActionConfig.action}>
              {nextActionConfig.buttonText}
            </Button>
          </div>
        </Card>
      </div>


      {/* Lower Row (Top Job Matches & Skill Progress) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Top Job Matches */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white">Top Job Matches</h2>
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover" onClick={() => navigate('/jobs')}>
              View all jobs →
            </button>
          </div>

          {jobMatches.length > 0 ? (
            <div className="space-y-1">
              {jobMatches.map((job: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-all duration-200 group cursor-pointer"
                  onClick={() => navigate('/companies')}
                >
                  <div className="flex items-center gap-3 transform group-hover:translate-x-1 transition-transform">
                    <div className={`w-10 h-10 ${job.bg || 'bg-brand-primary'} rounded-lg flex items-center justify-center text-white font-bold shadow-sm`}>
                      {job.initial || job.company?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#3d3d3d] dark:text-white text-sm">{job.company}</h4>
                      <p className="text-xs font-medium text-neutral-500">{job.role} · {job.location || 'Remote'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getScoreVisuals(job.match).bg} ${getScoreVisuals(job.match).text} ${getScoreVisuals(job.match).border}`}>
                      {job.match}% Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No tracked job matches yet. Research company intelligence or add applications to view alignment scores.
            </div>
          )}
        </Card>

        {/* Skill Progress */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white">Skill Progress</h2>
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover" onClick={() => navigate('/skills')}>
              View full roadmap →
            </button>
          </div>

          {skillProgress.length > 0 ? (
            <div className="space-y-4">
              {skillProgress.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.skill}</span>
                      {item.badge && (
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${item.ai
                            ? 'bg-[#E3EFD3]/50 text-[#4E6243] border-[#AEC3B0]/30'
                            : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                          }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-neutral-500">{item.val}%</span>
                  </div>
                  <ProgressBar value={item.val} variant="score" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No verified skill progress available. Upload your resume or check the skill roadmap to populate analysis.
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row (Insights & Activity Timeline) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

        {/* Career Insights */}
        <Card>
          <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white mb-6">Career Insights</h2>
          {insightsList.length > 0 ? (
            <div className="space-y-4">
              {insightsList.map((insight: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-100 dark:border-[#1E293B]">
                  <div className="p-1.5 bg-white dark:bg-[#0D1117] rounded-md shadow-sm">
                    <Lightbulb size={16} className="text-brand-primary" />
                  </div>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {insight.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No insights generated yet. Complete an interview or upload a resume to generate AI career insights.
            </div>
          )}
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white mb-6">Recent Activity</h2>
          {activityList.length > 0 ? (
            <div className="relative pl-4 border-l border-neutral-200 dark:border-neutral-800 space-y-5">
              {activityList.map((activity: any, idx: number) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-primary border-2 border-white dark:border-[#0D1117]" />
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-xs font-semibold text-[#3d3d3d] dark:text-white leading-none">{activity.desc}</p>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
              No recent activity recorded yet.
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
