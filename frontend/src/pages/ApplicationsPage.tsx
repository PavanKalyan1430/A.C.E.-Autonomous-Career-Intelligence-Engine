import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Plus,
  Briefcase,
  Layers,
  Sparkles,
  X,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  AlertTriangle,
  Map
} from 'lucide-react'

// Define the Kanban columns matching the backend status mapping
const COLUMNS = [
  { id: 'applied', label: 'Applied', color: 'border-t-brand-primary' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-t-[#0891B2]' },
  { id: 'offer', label: 'Offer', color: 'border-t-success' },
  { id: 'rejected', label: 'Rejected', color: 'border-t-danger' }
]

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Modal and sidebar states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null)
  
  // Mobile active tab filter
  const [mobileTab, setMobileTab] = useState<'all' | 'applied' | 'interviewing' | 'offer' | 'rejected'>('all')

  // Form states for creating a new application
  const [newCompany, setNewCompany] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newJdText, setNewJdText] = useState('')
  const [newStatus, setNewStatus] = useState('applied')

  // 1. Fetch live applications list from database
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applicationsList'],
    queryFn: async () => {
      const res = await applicationsApi.list()
      return res.data
    }
  })

  // 2. Mutation: Create Application
  const createMutation = useMutation({
    mutationFn: async (payload: { company_name: string; role_title: string; status: string; jd_text?: string }) => {
      const res = await applicationsApi.create(payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setIsAddModalOpen(false)
      // Reset form
      setNewCompany('')
      setNewRole('')
      setNewJdText('')
      setNewStatus('applied')
    }
  })

  // 3. Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: async (vars: { id: number; status: string }) => {
      const res = await applicationsApi.update(vars.id, { status: vars.status })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
    }
  })

  // 4. Mutation: Delete Application
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await applicationsApi.delete(id)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationsList'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setSelectedAppId(null)
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompany.trim() || !newRole.trim()) return
    createMutation.mutate({
      company_name: newCompany.trim(),
      role_title: newRole.trim(),
      status: newStatus,
      jd_text: newJdText.trim() || undefined
    })
  }

  // Active selected application for detail sidebar
  const activeApp = applications?.find((app: any) => app.id === selectedAppId)

  // Counts for summary metrics header
  const totalCount = applications?.length || 0
  const counts = {
    applied: applications?.filter((app: any) => app.status === 'applied').length || 0,
    interviewing: applications?.filter((app: any) => app.status === 'interviewing').length || 0,
    offer: applications?.filter((app: any) => app.status === 'offer').length || 0,
    rejected: applications?.filter((app: any) => app.status === 'rejected').length || 0
  }

  return (
    <div className="flex gap-6 relative min-h-[calc(100vh-80px)] -m-8 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
      
      {/* ── MAIN PIPELINE PANELS ────────────────────────────────────────────── */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        
        {/* Header and Add Button */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
              <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] via-[#336659] to-[#047857] bg-clip-text text-transparent">
                Applications Pipeline
              </span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Track your career pipeline in one place.</p>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
            Add Application
          </Button>
        </div>

        {/* Tab Filters (Visible always, useful for Mobile & quick queries) */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-2xs font-bold uppercase tracking-wider pb-1 flex-wrap gap-2">
          <button 
            onClick={() => setMobileTab('all')}
            className={`px-3 py-1.5 transition-all border-b-2 ${
              mobileTab === 'all' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-400'
            }`}
          >
            All ({totalCount})
          </button>
          {COLUMNS.map((col) => (
            <button 
              key={col.id}
              onClick={() => setMobileTab(col.id as any)}
              className={`px-3 py-1.5 transition-all border-b-2 ${
                mobileTab === col.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-neutral-400'
              }`}
            >
              {col.label} ({counts[col.id as keyof typeof counts]})
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        ) : totalCount === 0 ? (
          // Empty State
          <div className="max-w-md mx-auto text-center py-16 px-4 animate-fade-in">
            <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
              <Briefcase size={32} className="text-brand-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
              No applications yet
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Start tracking your applications to build your career pipeline and unlock comparative similarity analytics.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={16} />}>
              Add Application
            </Button>
          </div>
        ) : (
          /* Kanban Board layout (Desktop / Tablet grid) */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
            {COLUMNS.map((col) => {
              // Get applications belonging to this column, matching search tab filters
              const colApps = applications?.filter((app: any) => {
                if (mobileTab !== 'all' && mobileTab !== col.id) return false
                return app.status === col.id
              }) || []

              // Hide column entirely on mobile viewports if tab filter is set to another column
              if (mobileTab !== 'all' && mobileTab !== col.id) return null

              return (
                <div key={col.id} className="space-y-4">
                  {/* Column Header */}
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-500 pb-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="uppercase tracking-widest">{col.label}</span>
                    <Badge size="xs" variant="neutral">{colApps.length}</Badge>
                  </div>

                  {/* Column Cards stack */}
                  <div className="space-y-3">
                    {colApps.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 dark:text-neutral-600 text-2xs border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                        Empty column
                      </div>
                    ) : (
                      colApps.map((app: any) => {
                        const matchScore = app.analysis?.match_percentage

                        return (
                          <div 
                            key={app.id}
                            onClick={() => setSelectedAppId(app.id)}
                            className={`bg-white dark:bg-[#0D1117] border-t-2 ${col.color} border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 hover:border-brand-primary/40 dark:hover:border-brand-primary/40 cursor-pointer shadow-card transition-all space-y-3`}
                          >
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold text-[#3d3d3d] dark:text-white leading-tight">{app.role_title}</h3>
                              <div className="text-2xs text-neutral-400 font-semibold">{app.company_name}</div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] text-neutral-400 font-semibold uppercase">Match</span>
                              {matchScore ? (
                                <Badge variant="blue" size="xs" className="font-bold">{matchScore}%</Badge>
                              ) : (
                                <span className="text-2xs text-neutral-400">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DETAIL SIDE OVERDRAWER ─────────────────────────────────────────── */}
      {activeApp && (
        <aside className="w-80 bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-[#1E293B] p-6 flex flex-col justify-between z-40 transition-all shadow-dropdown flex-shrink-0">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-xs dark:text-white flex items-center gap-1.5">
                <Briefcase size={16} className="text-brand-primary" /> Application CRM
              </span>
              <button onClick={() => setSelectedAppId(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={16} />
              </button>
            </div>

            <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white">{activeApp.role_title}</h2>
            <div className="text-xs text-neutral-400 font-semibold mb-6">{activeApp.company_name}</div>

            <div className="space-y-5 text-2xs font-semibold">
              {/* Move Status Selector */}
              <div>
                <span className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Pipeline Status</span>
                <select 
                  value={activeApp.status}
                  onChange={(e) => updateStatusMutation.mutate({ id: activeApp.id, status: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg px-2 py-1.5 outline-none font-bold"
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Semantic Analysis details */}
              {activeApp.analysis?.match_percentage && (
                <div className="p-3 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-brand-primary">Semantic Match</span>
                    <span className="text-xs font-bold text-brand-primary">{activeApp.analysis.match_percentage}%</span>
                  </div>
                  
                  {activeApp.analysis.required_keyphrases && (
                    <div className="mt-2.5 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Missing Keyphrases</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeApp.analysis.required_keyphrases.map((k: string, i: number) => (
                          <Badge key={i} variant="warning" size="xs">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Created Date */}
              <div>
                <span className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Created Date</span>
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                  {new Date(activeApp.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>

              {/* Job Description snippets */}
              {activeApp.jd_text && (
                <div>
                  <span className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">Job Description Snapshot</span>
                  <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 line-clamp-4 leading-normal">
                    {activeApp.jd_text}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <Button 
              fullWidth 
              variant="secondary"
              iconRight={<ChevronRight size={14} />} 
              onClick={() => navigate('/interviews')}
            >
              Prepare Interview with ACE
            </Button>
            <Button 
              fullWidth 
              variant="ghost"
              className="text-danger hover:bg-danger-light"
              icon={<Trash2 size={14} />}
              onClick={() => deleteMutation.mutate(activeApp.id)}
            >
              Delete Record
            </Button>
          </div>
        </aside>
      )}

      {/* ── ADD APPLICATION MODAL OVERLAY ──────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 dark:bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="max-w-md w-full p-6 shadow-dropdown border border-neutral-200 dark:border-[#1E293B] relative animate-scale-up">
            <button 
              onClick={() => setIsAddModalOpen(false)} 
              className="absolute right-4 top-4 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400"
            >
              <X size={18} />
            </button>

            <h2 className="text-sm font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              Add Pipeline Opportunity
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Company Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Swiggy"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Role Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Pipeline Status</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none"
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Job Description (optional)</label>
                <textarea 
                  placeholder="Paste target role job description to trigger dynamic semantic similarity mapping..."
                  value={newJdText}
                  onChange={(e) => setNewJdText(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-transparent rounded-lg p-2.5 outline-none focus:border-brand-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Create Application
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
