import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { analyticsApi, resumeApi } from '@/api'
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
  BriefcaseIcon
} from 'lucide-react'

// --- Mock/Adapter Layer for UI Elements not yet returned by Backend API ---
const MOCK_JOB_MATCHES = [
  { company: 'Razorpay', role: 'Senior Backend Engineer', location: 'Remote', initial: 'R', bg: 'bg-brand-primary', match: 92 },
  { company: 'Swiggy', role: 'Staff Software Engineer', location: 'Bangalore', initial: 'S', bg: 'bg-orange-500', match: 87 },
  { company: 'Atlassian', role: 'Backend Engineer', location: 'Hybrid', initial: 'A', bg: 'bg-blue-600', match: 84 },
]

const MOCK_SKILLS = [
  { skill: 'System Design', val: 80, badge: 'Recommended' },
  { skill: 'Python', val: 90 },
  { skill: 'AWS', val: 75 },
  { skill: 'Kubernetes', val: 60, ai: true, badge: 'AI Suggested' },
  { skill: 'Go', val: 45 },
]

const MOCK_INSIGHTS = [
  { text: 'Your resume match for backend roles improved by 12% recently.', icon: <TrendingUp size={16} className="text-brand-primary" /> },
  { text: 'Kubernetes appears frequently across 82% of your target roles.', icon: <Lightbulb size={16} className="text-[#0891B2]" /> },
  { text: 'System Design is currently your highest-impact interview improvement area.', icon: <Award size={16} className="text-amber-500" /> },
]

const MOCK_ACTIVITIES = [
  { desc: 'Resume updated and parsed', time: '2 hours ago' },
  { desc: 'Mock interview completed (System Design)', time: 'Yesterday' },
  { desc: 'Applied for Senior Backend Engineer at Razorpay', time: '2 days ago' },
  { desc: 'New skill added: System Design', time: '3 days ago' },
]

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // File upload state for empty state resume upload
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // 1. Fetch live metrics from /analytics/dashboard
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
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

  // 3. Mutation for resume upload
  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestResume'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setUploadError('')
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.detail || 'Failed to upload or parse resume. Make sure it is a valid PDF, DOCX, or TXT.')
    }
  })

  // Handle drag and drop logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadMutation.mutate(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0])
    }
  }

  const handleQuickUpload = () => {
    document.getElementById('quick-resume-file-input')?.click()
  }

  // Derived user details or defaults
  const userName = user?.email ? user.email.split('@')[0] : 'Pavan'
  const displayGreeting = `Greetings ${userName.charAt(0).toUpperCase() + userName.slice(1)}`

  // Calculate live values based on backend API schema responses
  const activeApplications = analytics?.funnel ? (
    (analytics.funnel.applied || 0) + 
    (analytics.funnel.interviewing || 0) + 
    (analytics.funnel.offer || 0)
  ) : 0
  const interviewReadiness = analytics?.average_interview_score || 78
  const totalSessions = analytics?.total_sessions || 0

  const isLoading = isAnalyticsLoading || isResumeLoading

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
          className={`border-2 border-dashed p-10 text-center transition-all cursor-pointer hover:border-brand-primary/60 dark:hover:border-brand-primary/60 ${
            dragActive 
              ? 'border-brand-primary bg-brand-light dark:bg-[#18291E]/40' 
              : 'border-neutral-200 dark:border-[#4E6243]'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('resume-file-input')?.click()}
        >
          <input 
            type="file" 
            id="resume-file-input" 
            className="hidden" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
          />
          
          <div className="flex flex-col items-center">
            <FileText size={48} className="text-neutral-400 dark:text-neutral-500 mb-4 animate-pulse-dot" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-white mb-1">
              Drag and drop your resume file here, or click to browse
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6">
              Supports PDF, Word (DOCX) or plain TXT up to 10MB
            </p>
            
            <Button 
              loading={uploadMutation.isPending}
              icon={<UploadCloud size={16} />}
              onClick={() => document.getElementById('resume-file-input')?.click()}
            >
              Select File to Upload
            </Button>
          </div>
        </Card>

        {uploadError && (
          <div className="mt-4 p-4 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm text-center">
            {uploadError}
          </div>
        )}
      </div>
    )
  }

  // ─── POPULATED STATE ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">{displayGreeting}</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Here is your career intelligence overview.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            id="quick-resume-file-input" 
            className="hidden" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
          />
          <Button variant="secondary" icon={<UploadCloud size={16} />} onClick={handleQuickUpload} loading={uploadMutation.isPending}>
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
        <Card hoverable className="relative group border-t-4 border-t-brand-primary">
          <div className="absolute top-5 right-5 text-brand-primary bg-brand-light dark:bg-brand-primary/10 p-2 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
            <Award size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Career Score</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">85</span>
            <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 100</span>
          </div>
          <div className="mt-3 text-2xs font-medium text-success flex items-center gap-1">
            <TrendingUp size={14} />
            8% vs last month
          </div>
        </Card>

        {/* Job Match */}
        <Card hoverable className="relative group border-t-4 border-t-[#0891B2]">
          <div className="absolute top-5 right-5 text-[#0891B2] bg-brand-cyan10 p-2 rounded-lg group-hover:bg-[#0891B2] group-hover:text-white transition-colors duration-300">
            <Target size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Job Match</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">82%</span>
          </div>
          <div className="mt-3 text-2xs font-medium text-neutral-600 dark:text-neutral-400">
            Strong match overall
          </div>
        </Card>

        {/* Interview Score */}
        <Card hoverable className="relative group border-t-4 border-t-purple-500">
          <div className="absolute top-5 right-5 text-purple-600 bg-purple-50 dark:bg-purple-950/20 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Interview Score</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">{interviewReadiness}</span>
            <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/ 100</span>
          </div>
          <div className="mt-3 text-2xs font-medium text-success flex items-center gap-1">
            <TrendingUp size={14} />
            {totalSessions} mock sessions completed
          </div>
        </Card>

        {/* Applications */}
        <Card hoverable className="relative group border-t-4 border-t-orange-500">
          <div className="absolute top-5 right-5 text-orange-600 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
            <Briefcase size={20} />
          </div>
          <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Applications</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">{activeApplications}</span>
          </div>
          <div className="mt-3 text-2xs font-medium text-neutral-600 dark:text-neutral-400">
            Active tracking dashboard
          </div>
        </Card>
      </div>

      {/* Middle Row (2:1 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* ACE Intelligence Hero */}
        <Card className="lg:col-span-2 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-[#0891B2] bg-gradient-to-br from-white to-brand-sage/20 dark:from-[#18291E] dark:to-[#0D2B1D]">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#0891B2] animate-pulse-dot" />
                <h2 className="text-lg font-bold text-[#3d3d3d] dark:text-white tracking-tight">ACE Intelligence</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cyan10 border border-brand-cyan/20">
                <span className="ai-pulse"></span>
                <span className="text-[10px] font-semibold text-[#0891B2] uppercase tracking-wide">Updated recently</span>
              </div>
            </div>

            <h3 className="text-2xs font-bold text-[#0891B2] uppercase tracking-widest mb-2">Your Strongest Next Move</h3>

            <p className="text-md font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mb-2">
              Strengthen <span className="text-brand-primary font-bold">System Design</span> and <span className="text-brand-primary font-bold">Kubernetes</span> to improve your match for Senior Backend Engineer roles.
            </p>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl mb-6">
              Based on your resume, target roles, interview history and recent career signals in the market.
            </p>

            <div className="flex gap-2 flex-wrap mb-8">
              <Badge variant="blue" className="bg-white dark:bg-neutral-800 border-brand-primary/30 text-brand-primary shadow-sm px-3 py-1 text-xs">
                System Design • High Impact
              </Badge>
              <Badge variant="blue" className="bg-white dark:bg-neutral-800 border-brand-primary/30 text-brand-primary shadow-sm px-3 py-1 text-xs">
                Kubernetes • High Impact
              </Badge>
              <Badge variant="neutral" className="bg-white dark:bg-neutral-800 shadow-sm px-3 py-1 text-xs">
                Distributed Systems • Medium
              </Badge>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <Button iconRight={<ArrowRight size={16} />} onClick={() => navigate('/skills')}>
              View Skill Roadmap
            </Button>
            <Button variant="secondary" onClick={() => navigate('/career')}>
              Ask ACE why
            </Button>
          </div>
        </Card>

        {/* Upcoming Interview */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest">Upcoming Interview</h3>
              <Badge variant="warning" size="xs">Interview Stage</Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30">
                <span className="font-bold text-orange-500 text-xl">S</span>
              </div>
              <div>
                <h3 className="font-bold text-neutral-800 dark:text-white text-base">Swiggy</h3>
                <p className="text-sm text-neutral-500 font-medium">Senior Backend Engineer</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <Calendar className="text-neutral-400" size={16} />
                <span className="font-medium">22 May, 10:00 AM IST</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <Building2 className="text-neutral-400" size={16} />
                <span className="font-medium">System Design Round</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-neutral-500">Interview Readiness</span>
              <span className="font-bold text-brand-primary">78%</span>
            </div>
            <ProgressBar value={78} variant="blue" className="mb-4" />
            <Button variant="secondary" fullWidth iconRight={<ArrowRight size={16} />} onClick={() => navigate('/interviews')}>
              Prepare with ACE
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
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover" onClick={() => navigate('/companies')}>
              View all jobs →
            </button>
          </div>

          <div className="space-y-1">
            {MOCK_JOB_MATCHES.map((job, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-all duration-200 group cursor-pointer"
                onClick={() => navigate('/companies')}
              >
                <div className="flex items-center gap-3 transform group-hover:translate-x-1 transition-transform">
                  <div className={`w-10 h-10 ${job.bg} rounded-lg flex items-center justify-center text-white font-bold shadow-sm`}>
                    {job.initial}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#3d3d3d] dark:text-white text-sm">{job.company}</h4>
                    <p className="text-xs font-medium text-neutral-500">{job.role} · {job.location}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="blue" className="font-bold border-brand-primary/20 bg-brand-light text-brand-primary">
                    {job.match}% Match
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Skill Progress */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white">Skill Progress</h2>
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover" onClick={() => navigate('/skills')}>
              View full roadmap →
            </button>
          </div>

          <div className="space-y-4">
            {MOCK_SKILLS.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.skill}</span>
                    {item.badge && (
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                        item.ai 
                          ? 'bg-brand-cyan10 text-[#0891B2] border-brand-cyan/20' 
                          : 'bg-brand-light text-brand-primary border-brand-primary/20'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-neutral-500">{item.val}%</span>
                </div>
                <ProgressBar value={item.val} variant={item.ai ? 'cyan' : 'blue'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row (Insights & Activity Timeline) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        
        {/* Career Insights */}
        <Card>
          <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white mb-6">Career Insights</h2>
          <div className="space-y-4">
            {MOCK_INSIGHTS.map((insight, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-100 dark:border-[#1E293B]">
                <div className="p-1.5 bg-white dark:bg-[#0D1117] rounded-md shadow-sm">
                  {insight.icon}
                </div>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white mb-6">Recent Activity</h2>
          <div className="relative pl-4 border-l border-neutral-200 dark:border-neutral-800 space-y-5">
            {MOCK_ACTIVITIES.map((activity, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-primary border-2 border-white dark:border-[#0D1117]" />
                <div className="flex justify-between items-start gap-4">
                  <p className="text-xs font-semibold text-[#3d3d3d] dark:text-white leading-none">{activity.desc}</p>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}
