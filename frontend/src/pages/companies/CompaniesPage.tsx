import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Building2, Loader2, Code, TrendingUp, MessageSquare, DollarSign, Sparkles } from 'lucide-react'
import { companyApi } from '@/api'
import type { Company } from '@/types'

const QUICK_COMPANIES = ['Google', 'OpenAI', 'Observe.ai', 'Razorpay', 'Atlassian', 'Stripe']

export default function CompaniesPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<string | null>(null)

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['company', search],
    queryFn: () => companyApi.getInsights(search!).then(r => r.data),
    enabled: !!search,
  })

  const handleSearch = () => { if (query.trim()) setSearch(query.trim()) }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Company Intelligence</h1>
        <p className="page-subtitle">Research hiring trends, tech stacks, and interview insights for any company.</p>
      </div>

      {/* Search bar */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search any company (e.g. Observe.ai, Stripe, OpenAI)..."
              className="input pl-10"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">
            <Search size={15} /> Research
          </button>
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs text-text-muted">Quick:</span>
          {QUICK_COMPANIES.map(c => (
            <button key={c} onClick={() => { setQuery(c); setSearch(c) }}
              className="badge-muted hover:badge-accent cursor-pointer transition-all">
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-accent animate-spin" />
            <p className="text-sm text-text-muted">Gathering company intelligence...</p>
          </div>
        </div>
      )}

      {company && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Header */}
          <div className="card flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={26} className="text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{company.company_name}</h2>
              <p className="text-sm text-text-muted mt-0.5">{company.hiring_trends}</p>
            </div>
            <div className="ml-auto">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">82%</p>
                <p className="text-xs text-text-muted">Your Match</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tech Stack */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Code size={15} className="text-accent" /> Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.tech_stack.map(t => <span key={t} className="badge-accent">{t}</span>)}
              </div>
            </div>

            {/* Interview Process */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <MessageSquare size={15} className="text-violet" /> Interview Process
              </h3>
              <div className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                {company.interview_process}
              </div>
            </div>

            {/* Hiring Trends */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-success" /> Hiring Trends
              </h3>
              <p className="text-sm text-text-secondary">{company.hiring_trends}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Backend', 'ML Engineer', 'DevOps', 'Product Manager'].map(r => (
                  <span key={r} className="badge-success text-[11px]">{r}</span>
                ))}
              </div>
            </div>

            {/* Salary */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <DollarSign size={15} className="text-warning" /> Salary Insights
              </h3>
              {[
                { role: 'Software Engineer', range: '₹18L – ₹32L' },
                { role: 'Senior Engineer', range: '₹32L – ₹55L' },
                { role: 'Staff Engineer', range: '₹55L – ₹90L' },
              ].map(s => (
                <div key={s.role} className="flex justify-between py-2 border-b border-bg-border last:border-0">
                  <span className="text-xs text-text-secondary">{s.role}</span>
                  <span className="text-xs font-medium text-warning">{s.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="card border-accent/30 bg-accent/5">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">AI Recommendation</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  You have an <strong className="text-accent">82% compatibility</strong> with {company.company_name}.
                  Your Python and FastAPI experience are highly relevant. Bridge the gap by strengthening
                  System Design and cloud deployment skills before applying.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!company && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 size={48} className="text-text-muted mb-4 opacity-40" />
          <p className="text-base font-medium text-text-primary">Search a company to see intelligence</p>
          <p className="text-sm text-text-muted mt-1">We'll pull hiring trends, tech stacks & interview insights</p>
        </div>
      )}
    </div>
  )
}
