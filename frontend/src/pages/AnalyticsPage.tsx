import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, applicationsApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  TrendingUp,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react'

export default function AnalyticsPage() {
  const [dateFilter, setDateFilter] = useState('Last 30 Days')

  // 1. Fetch live metrics from dashboard API
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analyticsDashboard'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard()
      return res.data
    }
  })

  // 2. Fetch applications to count for cards
  const { data: applications, isLoading: isAppsLoading } = useQuery({
    queryKey: ['applicationsList'],
    queryFn: async () => {
      const res = await applicationsApi.list()
      return res.data
    }
  })

  const isLoading = isAnalyticsLoading || isAppsLoading

  // Calculate live values based on schemas
  const appliedCount = applications?.length || 0
  const responsesCount = applications?.filter((app: any) => app.status === 'interviewing' || app.status === 'offer').length || 0
  const interviewsCount = applications?.filter((app: any) => app.status === 'interviewing').length || 0
  const avgMatch = appliedCount > 0 
    ? Math.round(applications.reduce((acc: number, app: any) => acc + (app.analysis?.match_percentage || 80), 0) / appliedCount)
    : 82

  const funnel = analytics?.funnel || { applied: 0, interviewing: 0, offer: 0, rejected: 0 }
  
  // Custom SVG Trend Line points representing Mock Interview Score progression (72, 75, 78, 82)
  const scoreTrendPoints = [72, 75, 74, 78, 81, 82]
  const svgWidth = 500
  const svgHeight = 150
  
  // Calculate SVG Path for trend line
  const pointsPath = scoreTrendPoints.map((score, idx) => {
    const x = (idx / (scoreTrendPoints.length - 1)) * svgWidth
    const y = svgHeight - ((score - 60) / (90 - 60)) * svgHeight // Map score range 60-90 to height
    return `${x},${y}`
  }).join(' ')

  const pathD = `M ${pointsPath}`

  // Loading indicator skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex justify-between items-end mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in text-neutral-700 dark:text-neutral-300 space-y-6">
      
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Career Analytics</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Understand how your career preparation is progressing.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase">Range</span>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-lg px-3 py-2 outline-none text-xs font-semibold shadow-sm"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        
        {/* Applied */}
        <Card className="flex flex-col justify-between py-4 px-5">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Applied</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-[#3d3d3d] dark:text-white leading-none">{appliedCount}</span>
            <span className="text-2xs text-neutral-400 font-medium">roles</span>
          </div>
        </Card>

        {/* Responses */}
        <Card className="flex flex-col justify-between py-4 px-5">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Responses</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-[#3d3d3d] dark:text-white leading-none">{responsesCount}</span>
            <span className="text-2xs text-success font-medium">~{appliedCount > 0 ? Math.round((responsesCount / appliedCount) * 100) : 0}% rate</span>
          </div>
        </Card>

        {/* Interviews */}
        <Card className="flex flex-col justify-between py-4 px-5">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Interviews</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-[#3d3d3d] dark:text-white leading-none">{interviewsCount}</span>
            <span className="text-2xs text-neutral-400 font-medium">scheduled</span>
          </div>
        </Card>

        {/* Avg Match */}
        <Card className="flex flex-col justify-between py-4 px-5">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Avg Match</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-[#3d3d3d] dark:text-white leading-none">{avgMatch}%</span>
            <span className="text-2xs text-brand-primary font-medium">compatibility</span>
          </div>
        </Card>

      </div>

      {/* Application Funnel Chart */}
      <Card>
        <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-1.5">
          <Layers size={14} className="text-brand-primary" /> Application Funnel
        </h3>
        
        <div className="space-y-4 font-semibold text-xs max-w-2xl">
          {/* Applied */}
          <div>
            <div className="flex justify-between text-2xs mb-1">
              <span>Applied</span>
              <span className="text-neutral-400">{appliedCount}</span>
            </div>
            <ProgressBar value={100} variant="blue" />
          </div>

          {/* Screening */}
          <div>
            <div className="flex justify-between text-2xs mb-1">
              <span>Screening / Response</span>
              <span className="text-neutral-400">{responsesCount}</span>
            </div>
            <ProgressBar value={appliedCount > 0 ? (responsesCount / appliedCount) * 100 : 0} variant="blue" />
          </div>

          {/* Interview */}
          <div>
            <div className="flex justify-between text-2xs mb-1">
              <span>Interview</span>
              <span className="text-neutral-400">{interviewsCount}</span>
            </div>
            <ProgressBar value={appliedCount > 0 ? (interviewsCount / appliedCount) * 100 : 0} variant="blue" />
          </div>

          {/* Offer */}
          <div>
            <div className="flex justify-between text-2xs mb-1">
              <span>Offer</span>
              <span className="text-neutral-400">{funnel.offer || 0}</span>
            </div>
            <ProgressBar value={appliedCount > 0 ? ((funnel.offer || 0) / appliedCount) * 100 : 0} variant="blue" />
          </div>
        </div>
      </Card>

      {/* Grid: Trend Line (Left) vs Activity feed (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Interview Score Trend */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-brand-primary" /> Interview Score Trend
            </h3>

            {/* Custom Responsive SVG Chart Line */}
            <div className="w-full h-40 relative border-b border-neutral-100 dark:border-neutral-800">
              <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                {/* Gradient area under path */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path 
                  d={`${pathD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`}
                  fill="url(#chartGradient)"
                />
                
                {/* Actual Line Path */}
                <path 
                  d={pathD}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Score dots */}
                {scoreTrendPoints.map((score, idx) => {
                  const x = (idx / (scoreTrendPoints.length - 1)) * svgWidth
                  const y = svgHeight - ((score - 60) / (90 - 60)) * svgHeight
                  return (
                    <circle 
                      key={idx}
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )
                })}
              </svg>
            </div>
            
            <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2.5">
              <span>Session 1</span>
              <span>Session 3</span>
              <span>Latest Session</span>
            </div>
          </div>
        </Card>

        {/* Application Activity */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-1.5">
              <BarChart3 size={14} className="text-brand-primary" /> Application Activity
            </h3>

            {/* Custom activity flex block representing daily volume */}
            <div className="flex items-end justify-between h-40 gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <div className="bg-brand-primary/20 dark:bg-brand-primary/10 w-full h-8 rounded-sm" title="2 applications" />
              <div className="bg-brand-primary/20 dark:bg-brand-primary/10 w-full h-12 rounded-sm" title="3 applications" />
              <div className="bg-brand-primary/40 w-full h-20 rounded-sm" title="5 applications" />
              <div className="bg-brand-primary/60 w-full h-28 rounded-sm" title="7 applications" />
              <div className="bg-brand-primary w-full h-36 rounded-sm" title="9 applications" />
              <div className="bg-brand-primary/50 w-full h-24 rounded-sm" title="6 applications" />
            </div>

            <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2.5">
              <span>Week 1</span>
              <span>Week 3</span>
              <span>Active Week</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Career Insight Panel */}
      <Card className="border-t-4 border-t-brand-primary bg-gradient-to-r from-white to-brand-sage/5 dark:from-[#0D1117] dark:to-[#18291E]/10">
        <h3 className="text-2xs font-bold text-brand-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Sparkles size={14} className="text-brand-primary animate-pulse-dot" /> Career Insight
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
          Your mock interview performance has improved consistently over the last 30 days. Your response score has climbed from 72 to 82. System Design remains your highest-impact area; practice topological container routing before your upcoming Swiggy interview round.
        </p>
      </Card>

    </div>
  )
}
