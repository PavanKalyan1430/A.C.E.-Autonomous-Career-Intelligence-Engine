import React from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import {
  Award,
  Target,
  TrendingUp,
  Briefcase,
  Sparkles,
  Calendar,
  Building2,
  ArrowRight,
  MessageSquare
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Greetings Pavan</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1 font-medium">Here is your career intelligence overview.</p>
        </div>
        <Button icon={<Sparkles size={16} />} className="shadow-card">
          Ask A.C.E.
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-5">
        <Card hoverable className="relative group border-t-4 border-t-brand-primary">
          <div className="absolute top-5 right-5 text-brand-primary bg-brand-primary/10 p-2 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
            <Award size={20} />
          </div>
          <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Career Score</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">85</span>
            <span className="text-sm font-medium text-neutral-400">/ 100</span>
          </div>
          <div className="mt-3 text-sm font-medium text-success flex items-center gap-1">
            <TrendingUp size={14} />
            8% vs last month
          </div>
        </Card>

        <Card hoverable className="relative group border-t-4 border-t-brand-ai">
          <div className="absolute top-5 right-5 text-brand-ai bg-brand-ai/10 p-2 rounded-lg group-hover:bg-brand-ai group-hover:text-white transition-colors duration-300">
            <Target size={20} />
          </div>
          <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Job Match</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">82%</span>
          </div>
          <div className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Strong match overall
          </div>
        </Card>

        <Card hoverable className="relative group border-t-4 border-t-purple-500">
          <div className="absolute top-5 right-5 text-purple-600 bg-purple-50 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Interview Score</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">78</span>
            <span className="text-sm font-medium text-neutral-400">/ 100</span>
          </div>
          <div className="mt-3 text-sm font-medium text-success flex items-center gap-1">
            <TrendingUp size={14} />
            6pts improvement
          </div>
        </Card>

        <Card hoverable className="relative group border-t-4 border-t-orange-500">
          <div className="absolute top-5 right-5 text-orange-600 bg-orange-50 p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
            <Briefcase size={20} />
          </div>
          <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Applications</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">23</span>
          </div>
          <div className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            4 active interviews
          </div>
        </Card>
      </div>

      {/* Middle Row (2:1) */}
      <div className="grid grid-cols-3 gap-5">
        {/* ACE Intelligence Hero */}
        <Card className="col-span-2 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-brand-ai bg-gradient-to-br from-white to-brand-sage/20 dark:from-neutral-800 dark:to-neutral-800">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-brand-ai" />
                <h2 className="text-xl font-bold text-[#3d3d3d] dark:text-white tracking-tight">ACE Intelligence</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-ai/10 border border-brand-ai/20">
                <span className="ai-pulse"></span>
                <span className="text-[10px] font-semibold text-brand-ai uppercase tracking-wide">Updated recently</span>
              </div>
            </div>

            <h3 className="text-[11px] font-bold text-brand-ai uppercase tracking-widest mb-2">Your Strongest Next Move</h3>

            <p className="text-lg font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mb-2">
              Strengthen <span className="font-bold text-brand-primary">System Design</span> and <span className="font-bold text-brand-primary">Kubernetes</span> to improve your match for Senior Backend Engineer roles.
            </p>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mb-6">
              Based on your resume, target roles, interview history and recent career signals in the market.
            </p>

            <div className="flex gap-2 flex-wrap mb-8">
              <Badge variant="blue" className="bg-white border-brand-primary/30 text-brand-primary shadow-sm px-3 py-1 text-xs">
                System Design • High Impact
              </Badge>
              <Badge variant="blue" className="bg-white border-brand-primary/30 text-brand-primary shadow-sm px-3 py-1 text-xs">
                Kubernetes • High Impact
              </Badge>
              <Badge variant="neutral" className="bg-white shadow-sm px-3 py-1 text-xs">
                Distributed Systems • Medium
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <Button iconRight={<ArrowRight size={16} />}>View Skill Roadmap</Button>
            <Button variant="secondary">Ask ACE why</Button>
          </div>
        </Card>

        {/* Upcoming Interview */}
        <Card className="col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Upcoming Interview</h3>
            <Badge variant="warning" size="xs">Interview Stage</Badge>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30">
              <span className="font-bold text-orange-500 text-xl">S</span>
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 dark:text-white text-base">Swiggy</h3>
              <p className="text-sm text-neutral-500 font-medium">Senior Backend Engineer</p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
              <Calendar className="text-neutral-400" size={16} />
              <span className="font-medium">22 May, 10:00 AM IST</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
              <Building2 className="text-neutral-400" size={16} />
              <span className="font-medium">System Design Round</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-neutral-500">Interview Readiness</span>
              <span className="font-bold text-brand-primary">78%</span>
            </div>
            <ProgressBar value={78} variant="blue" className="mb-4" />
            <Button variant="secondary" fullWidth iconRight={<ArrowRight size={16} />}>
              Prepare with ACE
            </Button>
          </div>
        </Card>
      </div>

      {/* Lower Row (2 columns) */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        {/* Top Job Matches */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-[#3d3d3d] dark:text-white">Top Job Matches</h2>
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover">View all jobs →</button>
          </div>

          <div className="space-y-1">
            {[
              { company: 'Razorpay', role: 'Senior Backend Engineer', location: 'Remote', initial: 'R', bg: 'bg-brand-primary', match: 92 },
              { company: 'Swiggy', role: 'Staff Software Engineer', location: 'Bangalore', initial: 'S', bg: 'bg-orange-500', match: 87 },
              { company: 'Atlassian', role: 'Backend Engineer', location: 'Hybrid', initial: 'A', bg: 'bg-blue-600', match: 84 },
            ].map((job, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-brand-sage/40 dark:hover:bg-neutral-800/80 transition-all duration-200 group cursor-pointer hover:shadow-sm">
                <div className="flex items-center gap-3 transform group-hover:translate-x-1 transition-transform">
                  <div className={`w-10 h-10 ${job.bg} rounded-lg flex items-center justify-center text-white font-bold shadow-sm`}>
                    {job.initial}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#3d3d3d] dark:text-white text-sm">{job.company}</h4>
                    <p className="text-[13px] font-medium text-neutral-500">{job.role} · {job.location}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="blue" className="font-bold border-brand-primary/20 bg-brand-sage text-brand-primary">
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
            <h2 className="text-lg font-bold text-[#3d3d3d] dark:text-white">Skill Progress</h2>
            <button className="text-xs font-bold text-brand-primary hover:text-brand-hover">View full roadmap →</button>
          </div>

          <div className="space-y-5">
            {[
              { skill: 'System Design', val: 80, badge: 'Recommended' },
              { skill: 'Python', val: 90 },
              { skill: 'AWS', val: 75 },
              { skill: 'Kubernetes', val: 60, ai: true, badge: 'AI Suggested' },
              { skill: 'Go', val: 45 },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.skill}</span>
                    {item.badge && (
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${item.ai ? 'bg-brand-ai/10 text-brand-ai border-brand-ai/20' : 'bg-brand-sage/50 text-brand-primary border-brand-primary/20'
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

    </div>
  )
}
