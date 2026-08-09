import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Target, Award } from 'lucide-react'
import { analyticsApi } from '@/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

const SKILL_EVOLUTION = [
  { month: 'Mar', python: 70, sql: 60, system_design: 30 },
  { month: 'Apr', python: 72, sql: 65, system_design: 38 },
  { month: 'May', python: 76, sql: 70, system_design: 45 },
  { month: 'Jun', python: 80, sql: 74, system_design: 55 },
  { month: 'Jul', python: 85, sql: 78, system_design: 62 },
]

export default function AnalyticsPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  })

  const funnelData = Object.entries(analytics?.funnel ?? {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value,
  }))

  const conversionRate = analytics?.funnel
    ? Math.round(((analytics.funnel.offer ?? 0) / Math.max(analytics.funnel.applied ?? 1, 1)) * 100)
    : 0

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Your career performance metrics and growth trends over time.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Offer Rate', value: `${conversionRate}%`, icon: Target, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Avg Interview Score', value: `${analytics?.average_interview_score ?? 75}/100`, icon: Award, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Mock Sessions', value: analytics?.total_sessions ?? 0, icon: BarChart3, color: 'text-violet', bg: 'bg-violet/10' },
          { label: 'Skill Growth', value: '+24%', icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-text-muted">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={15} className={s.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Skill Evolution */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-5">Skill Proficiency Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={SKILL_EVOLUTION}>
              <defs>
                {['python', 'sql', 'system_design'].map((key, i) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Area type="monotone" dataKey="python" stroke={COLORS[0]} fill={`url(#grad-python)`} strokeWidth={2} name="Python" />
              <Area type="monotone" dataKey="sql" stroke={COLORS[1]} fill={`url(#grad-sql)`} strokeWidth={2} name="SQL" />
              <Area type="monotone" dataKey="system_design" stroke={COLORS[2]} fill={`url(#grad-system_design)`} strokeWidth={2} name="System Design" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Application Funnel Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-5">Application Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={funnelData.length > 0 ? funnelData : [{ name: 'No data', value: 1 }]}
                cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly activity */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-primary mb-5">Monthly Activity</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={analytics?.activity_timeline ?? []} barSize={22} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} name="Applications" />
            <Bar dataKey="interviews" fill="#10b981" radius={[4, 4, 0, 0]} name="Interviews" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
