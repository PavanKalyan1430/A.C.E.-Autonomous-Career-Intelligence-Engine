import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Map, Target, BookOpen, Building2, Sparkles, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { resumeApi } from '@/api'
import type { ParsedResume } from '@/types'

const TARGET_ROLES = [
  { role: 'Backend Engineer', match: 85, color: 'text-accent', bg: 'bg-accent/10' },
  { role: 'AI Engineer', match: 72, color: 'text-violet', bg: 'bg-violet/10' },
  { role: 'Full Stack Engineer', match: 68, color: 'text-success', bg: 'bg-success/10' },
]

const ROADMAP_PHASES = [
  { phase: 'Foundation', weeks: '2–3 weeks', done: true, topics: ['Data Structures', 'System Design Basics', 'SQL Mastery'] },
  { phase: 'Core Skills', weeks: '3–4 weeks', done: true, topics: ['Distributed Systems', 'Caching with Redis', 'API Design'] },
  { phase: 'Advanced Topics', weeks: '2–3 weeks', done: false, topics: ['Kubernetes', 'LLM Integration', 'MLOps Basics'] },
  { phase: 'Interview Prep', weeks: '2 weeks', done: false, topics: ['Mock Interviews', 'System Design Practice', 'Behavioral Prep'] },
]

export default function CareerPage() {
  const { data: resume } = useQuery<ParsedResume>({
    queryKey: ['resume-latest'],
    queryFn: () => resumeApi.getLatest().then(r => r.data),
    retry: false,
  })

  const skills = resume?.skills ?? []
  const TARGET_SKILLS = ['Kubernetes', 'System Design', 'Kafka', 'GraphQL', 'AWS', 'LLMs']
  const missing = TARGET_SKILLS.filter(s => !skills.map(sk => sk.toLowerCase()).includes(s.toLowerCase()))

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Career Planner</h1>
        <p className="page-subtitle">Your AI-powered career mentor — skill gaps, roadmaps, and recommendations.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Role Recommendations */}
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Target size={15} className="text-accent" /> Recommended Roles
            </h3>
            <div className="space-y-3">
              {TARGET_ROLES.map((r, i) => (
                <motion.div key={r.role} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-bg-elevated rounded-xl border border-bg-border hover:border-accent/30 transition-all">
                  <div className={`w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center`}>
                    <Building2 size={18} className={r.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{r.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${r.match}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${r.color}`}>{r.match}% match</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-muted" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Learning Roadmap */}
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-5 flex items-center gap-2">
              <Map size={15} className="text-violet" /> Personalized Roadmap
            </h3>
            <div className="space-y-4">
              {ROADMAP_PHASES.map((phase, i) => (
                <div key={phase.phase} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${phase.done ? 'bg-success/10' : 'bg-bg-elevated border border-bg-border'}`}>
                      {phase.done
                        ? <CheckCircle2 size={16} className="text-success" />
                        : <Circle size={16} className="text-text-muted" />}
                    </div>
                    {i < ROADMAP_PHASES.length - 1 && <div className="w-px flex-1 bg-bg-border mt-2 mb-2 min-h-[20px]" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${phase.done ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {phase.phase}
                      </p>
                      <span className="badge-muted text-[10px]">{phase.weeks}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {phase.topics.map(t => (
                        <span key={t} className={phase.done ? 'badge-success' : 'badge-muted'}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Skill Gap */}
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-warning" /> Skill Gap Analysis
            </h3>
            <div>
              <p className="text-xs text-text-muted mb-3">Your skills vs. market demand</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-success mb-1">✓ You Have</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {skills.slice(0, 5).map(s => <span key={s} className="badge-success text-[10px]">{s}</span>)}
                </div>
                <p className="text-xs font-medium text-warning mb-1">⚠ Missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map(s => <span key={s} className="badge-warning text-[10px]">{s}</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* Learning Recommendations */}
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-accent" /> Learn Next
            </h3>
            <div className="space-y-3">
              {[
                { topic: 'System Design Fundamentals', source: 'bytebytego.com', type: 'Course' },
                { topic: 'LLM Application Development', source: 'deeplearning.ai', type: 'Course' },
                { topic: 'Build a RAG Pipeline Project', source: 'Project', type: 'Project' },
              ].map((l, i) => (
                <div key={i} className="flex gap-3 p-3 bg-bg-elevated rounded-xl border border-bg-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{l.topic}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{l.source}</p>
                  </div>
                  <span className={l.type === 'Project' ? 'badge-violet text-[10px]' : 'badge-accent text-[10px]'}>{l.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
