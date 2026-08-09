import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Briefcase, TrendingUp, Target, Brain, ArrowRight,
  FileText, Building2, Sparkles, CheckCircle2, Clock,
  BarChart3, Award
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { analyticsApi, resumeApi } from '@/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import { useAuthStore } from '@/store/authStore'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
}

const FUNNEL_COLORS: Record<string, string> = {
  applied: '#6366f1', oa: '#8b5cf6', interview: '#f59e0b', offer: '#10b981', rejected: '#ef4444',
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => analyticsApi.getDashboard().then(r => r.data) })
  const { data: resume } = useQuery({ queryKey: ['resume-latest'], queryFn: () => resumeApi.getLatest().then(r => r.data), retry: false })

  const funnel = analytics?.funnel ?? { applied: 0, oa: 0, interview: 0, offer: 0, rejected: 0 }
  const funnelData = Object.entries(funnel).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
  const timeline = analytics?.activity_timeline ?? []

  const skills: string[] = resume?.skills?.slice(0, 8) ?? []
  const name = resume?.personal_info?.name ?? user?.email?.split('@')[0] ?? 'there'

  const recentActivities = [
    { icon: FileText, text: 'Resume analyzed', time: 'Just now', color: 'text-accent' },
    { icon: Building2, text: 'Company insights fetched', time: '2h ago', color: 'text-violet' },
    { icon: Award, text: 'Mock interview completed', time: 'Yesterday', color: 'text-success' },
  ]

  const aiInsights = [
    { text: 'Your resume lacks quantifiable impact metrics. Add numbers to 3+ bullet points.', type: 'warning' },
    { text: 'You are a strong match for Backend Engineer roles at early-stage AI startups.', type: 'success' },
    { text: 'Focus on System Design — it appears in 78% of your target company JDs.', type: 'accent' },
  ]

  const insightColors: Record<string, string> = {
    warning: 'border-warning/30 bg-warning/5',
    success: 'border-success/30 bg-success/5',
    accent: 'border-accent/30 bg-accent/5',
  }
  const insightTextColors: Record<string, string> = {
    warning: 'text-warning', success: 'text-success', accent: 'text-accent',
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-end justify-between">
        <div>
          <h1 className="page-title">
            Good morning, <span className="gradient-text capitalize">{name}</span> 👋
          </h1>
          <p className="page-subtitle">Here's your career intelligence overview for today.</p>
        </div>
        <Link to="/assistant" className="btn-primary">
          <Sparkles size={15} /> Ask A.C.E.
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Applications', value: funnel.applied ?? 0, icon: Briefcase, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Interviews', value: funnel.interview ?? 0, icon: TrendingUp, color: 'text-violet', bg: 'bg-violet/10' },
          { label: 'Offers', value: funnel.offer ?? 0, icon: Target, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Avg Mock Score', value: `${analytics?.average_interview_score ?? 75}%`, icon: Brain, color: 'text-warning', bg: 'bg-warning/10' },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={cardVariants} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-text-muted">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={15} className={s.color} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts + AI Insights row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Application Funnel */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants} className="card col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Application Funnel</h3>
              <p className="text-xs text-text-muted mt-0.5">Conversion across stages</p>
            </div>
            <span className="badge-muted">All time</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={funnelData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Insights */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants} className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {aiInsights.map((ins, i) => (
              <div key={i} className={`border rounded-xl p-3 ${insightColors[ins.type]}`}>
                <p className={`text-xs font-medium leading-relaxed ${insightTextColors[ins.type]}`}>{ins.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Monthly trend + Skills + Recent activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly trends */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants} className="card col-span-1">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Activity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, fontSize: 11 }} />
              <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Skills */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={cardVariants} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Your Top Skills</h3>
            <Link to="/resume" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => <span key={s} className="badge-accent">{s}</span>)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText size={28} className="text-text-muted mb-2" />
              <p className="text-xs text-text-muted">Upload your resume to extract skills</p>
              <Link to="/resume" className="btn-primary mt-3 text-xs">Upload Resume</Link>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div custom={8} initial="hidden" animate="visible" variants={cardVariants} className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center flex-shrink-0">
                  <a.icon size={14} className={a.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">{a.text}</p>
                  <p className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
